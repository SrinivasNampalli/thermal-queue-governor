"""Frozen-protocol, independent virtual-motor SIL. SIMULATION ONLY.

Two explicit phases permit publishing the protocol and calibration before held-out data.
The unchanged scalar Governor is the controller under test; plant.py is independent.
"""
import argparse
from contextlib import contextmanager
import csv
from dataclasses import asdict
from datetime import datetime, timezone
import gzip
import hashlib
import io
import json
import math
from pathlib import Path
import platform
import random
import shutil
import sys
import time

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
sys.path.insert(0, str(PROJECT / "src"))
from governor import Governor, Model
if __package__:
    from .plant import Parameters, State, VirtualMotor
else:
    from plant import Parameters, State, VirtualMotor


def utc():
    return datetime.now(timezone.utc).isoformat()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8")


@contextmanager
def csv_gzip(path, fields):
    with path.open("wb") as binary:
        with gzip.GzipFile(filename="", fileobj=binary, mode="wb", mtime=0) as zipped:
            with io.TextIOWrapper(zipped, encoding="utf-8", newline="") as text:
                writer = csv.DictWriter(text, fieldnames=fields)
                writer.writeheader()
                yield writer


def write_csv(path, rows):
    if not rows:
        return
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def load_config(path):
    config = json.loads(path.read_text(encoding="utf-8"))
    if set(config["calibration_seeds"]) & set(config["validation_seeds"]):
        raise ValueError("calibration and held-out seeds must be disjoint")
    if config["sample_period_s"] != 1.0:
        raise ValueError("this scalar controller adapter requires a one-second period")
    if config["hot_initial_winding_C"] + config["commissioning_half_width_C"] >= min(config["operating_ceilings_C"]):
        raise ValueError("hot commissioning interval must start below both operating ceilings")
    return config


def plant_parameters(config, seed):
    rng = random.Random(seed)
    values = dict(config["nominal_plant"])
    for name, (low, high) in sorted(config["parameter_fraction_ranges"].items()):
        values[name] *= rng.uniform(low, high)
    return Parameters(**values)


def analytic_coefficients(config):
    """Nominal structure bounds; empirical w allowance still has hidden-state limits."""
    nominal, ranges = config["nominal_plant"], config["parameter_fraction_ranges"]
    def bounds(name):
        return [nominal[name] * factor for factor in ranges.get(name, [1, 1])]
    cw_low, cw_high = bounds("winding_capacity_J_per_K")
    g_low, g_high = bounds("winding_to_housing_W_per_K")
    _, resistance_high = bounds("resistance_at_20C_ohm")
    dt = config["sample_period_s"]
    amin, amax = math.exp(-g_high * dt / cw_low), math.exp(-g_low * dt / cw_high)
    bmax = nominal["rated_current_A"] ** 2 * resistance_high * (1 + nominal["copper_alpha_per_K"] * (config["coefficient_temperature_guard_C"] - 20)) * dt / cw_low
    return dict(amin=amin, amax=amax, bmin=0.0, bmax=bmax, wmin=0.0)


def fit_allowances(config, samples):
    """One prespecified pass over calibration data, with no held-out inputs."""
    coefficients = analytic_coefficients(config)
    residual = max(row["next_winding_C"] - config["ambient_C"]
                   - coefficients["amax"] * (row["winding_C"] - config["ambient_C"])
                   - coefficients["bmax"] * row["drive_effort"] ** 2 for row in samples)
    lag_error = max(abs(row["sensor_C"] - row["winding_C"]) for row in samples)
    coefficients["wmax"] = max(0.0, residual) + config["additive_calibration_padding_C_per_sample"]
    coefficients["eps"] = lag_error + config["sensor_noise_bound_C"] + config["sensor_calibration_padding_C"]
    coefficients.update(ambient=config["ambient_C"], clip=config["sensor_clip_C"], step=config["action_step"])
    failures = sum(not (coefficients["amin"] * (row["winding_C"] - config["ambient_C"]) - 1e-8
                        <= row["next_winding_C"] - config["ambient_C"]
                        <= coefficients["amax"] * (row["winding_C"] - config["ambient_C"]) + coefficients["bmax"] * row["drive_effort"] ** 2 + coefficients["wmax"] + 1e-8) for row in samples)
    feasibility = {}
    for ceiling in config["operating_ceilings_C"]:
        try:
            Model(**coefficients, limit=ceiling)
            feasibility[str(ceiling)] = {"valid": True}
        except ValueError as exc:
            feasibility[str(ceiling)] = {"valid": False, "reason": str(exc)}
    return {"scope": "Empirical synthetic calibration only; no global enclosure or hardware guarantee",
            "model": coefficients, "samples": len(samples), "max_upper_residual_C": residual,
            "max_sensor_lag_error_C": lag_error, "calibration_interval_failures": failures,
            "ceiling_model_feasibility": feasibility}


def source_files():
    files = [PROJECT / "src/governor.py"]
    files += [path for path in HERE.rglob("*") if path.is_file()
              and path.suffix in (".py", ".md", ".json")
              and path.relative_to(HERE).parts[0] not in ("results", "__pycache__")]
    return sorted(files)


def freeze_run(config_path, out):
    """Persist configuration and source before returning control to any simulation."""
    out.mkdir(parents=True, exist_ok=False)
    source_hashes = {}
    for source in source_files():
        relative = source.relative_to(PROJECT)
        target = out / "source" / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        source_hashes[relative.as_posix()] = sha(source)
    shutil.copyfile(config_path, out / "frozen_protocol.json")
    frozen = {"protocol_frozen_utc": utc(), "before_first_calibration_sample": True,
              "config_sha256": sha(config_path), "source_sha256": source_hashes,
              "python": sys.version, "platform": platform.platform(),
              "execution": "Software-in-the-loop Python process; no physical motor or hardware connection. This runner does not establish VM execution."}
    write_json(out / "freeze.json", frozen)
    return frozen


def verify_frozen(out):
    frozen = json.loads((out / "freeze.json").read_text())
    if sha(out / "frozen_protocol.json") != frozen["config_sha256"]:
        raise ValueError("frozen configuration changed")
    for relative, digest in frozen["source_sha256"].items():
        if sha(PROJECT / relative) != digest or sha(out / "source" / relative) != digest:
            raise ValueError("source changed after protocol freeze: " + relative)
    return frozen


CAL_FIELDS = ["profile", "seed", "k", "drive_effort", "winding_C", "housing_C", "sensor_C", "current_A", "next_winding_C", "next_housing_C", "peak_winding_C", "rms_current_A", "energy_balance_error_J", "integration_substeps", "actual_dt_s"]


def calibrate(config_path, out):
    config = load_config(config_path)
    if not config["status"].startswith("FROZEN"):
        raise ValueError("DRAFT protocol: selected motor specifications and a finalized frozen protocol are required; no study has run")
    frozen = freeze_run(config_path, out)
    started = time.perf_counter()
    samples = []
    for seed in config["calibration_seeds"]:
        params = plant_parameters(config, seed)
        for profile in config["calibration_profiles"]:
            rng = random.Random(seed + 17000)
            blocks = [rng.choice([0.0, 0.25, 0.5, 0.75, 1.0]) for _ in range(math.ceil(config["duration_steps"] / 40))]
            initial = State(0.0, 100.0, 55.0, 100.0) if profile == "hot_cooling" else State(0.0, 70.0, 40.0, 70.0)
            motor = VirtualMotor(params, initial, config["integration_step_s"])
            for k in range(config["duration_steps"]):
                effort = (1.0 if 120 <= k < 360 else 0.0) if profile == "hot_cooling" else blocks[k // 40]
                before = motor.state
                step = motor.advance(effort, config["ambient_C"])
                samples.append(dict(profile=profile, seed=seed, k=k, drive_effort=effort,
                    winding_C=before.winding_C, housing_C=before.housing_C, sensor_C=before.sensor_C, current_A=before.current_A,
                    next_winding_C=step.end.winding_C, next_housing_C=step.end.housing_C,
                    peak_winding_C=step.peak_winding_C, rms_current_A=step.rms_current_A, energy_balance_error_J=step.energy_balance_error_J,
                    integration_substeps=step.integration_substeps, actual_dt_s=step.actual_dt_s))
    with csv_gzip(out / "calibration_steps.csv.gz", CAL_FIELDS) as writer:
        writer.writerows(samples)
    calibration = fit_allowances(config, samples)
    calibration.update(completed_utc=utc(), executions=len(config["calibration_seeds"]) * len(config["calibration_profiles"]),
                       duration_seconds=time.perf_counter() - started, seeds=config["calibration_seeds"],
                       max_energy_balance_error_J=max(abs(row["energy_balance_error_J"]) for row in samples))
    write_json(out / "calibration.json", calibration)
    write_json(out / "calibration.lock.json", {name: sha(out / name) for name in ("calibration.json", "calibration_steps.csv.gz")})
    write_json(out / "run_metadata.json", {**frozen, "status": "CALIBRATION_COMPLETE_HELD_OUT_NOT_RUN", "calibration": calibration})
    print(json.dumps({"phase": "calibration", "out": str(out), "result": calibration}, indent=2))
    return calibration


RAW_FIELDS = ["stage", "scenario", "seed", "policy", "ceiling_C", "k", "dt_s", "integration_substeps", "requested_max_dt_s", "ambient_C", "load_factor",
    "winding_C", "housing_C", "sensor_C", "current_A", "reading_C", "requested", "accepted", "executing_requested",
    "reported_effort", "drive_effort", "actual_rms_effort", "pending_json", "lo_C", "hi_C", "valid", "reason",
    "predicted_peak_C", "next_winding_C", "next_housing_C", "next_sensor_C", "next_current_A", "resolved_peak_C", "peak_offset_s",
    "sampled_operating_breach", "resolved_operating_breach", "sampled_physical_breach", "resolved_physical_breach",
    "intersample_only_operating_breach", "intersample_only_physical_breach", "interval_miss", "sensor_envelope_miss", "energy_balance_error_J"]


def episode(config, model_values, scenario, seed, policy, ceiling, dt_s=None, stage="primary", writer=None, resolution_scale=1.0):
    params = plant_parameters(config, seed)
    rng = random.Random(seed + 23000)
    normal = scenario == "normal"
    center = config["normal_initial_winding_C" if normal else "hot_initial_winding_C"]
    housing = config["normal_initial_housing_C" if normal else "hot_initial_housing_C"]
    initial_winding = center + rng.uniform(-config["initial_jitter_C"], config["initial_jitter_C"])
    initial_housing = housing + rng.uniform(-config["initial_jitter_C"], config["initial_jitter_C"])
    noise = [rng.uniform(-config["sensor_noise_bound_C"], config["sensor_noise_bound_C"]) for _ in range(config["duration_steps"])]
    demand = [0.65 if (k // 90) % 3 == 1 else 1.0 for k in range(config["duration_steps"])]
    motor = VirtualMotor(params, State(0.0, initial_winding, initial_housing, initial_winding), dt_s or config["integration_step_s"], resolution_scale)
    model = Model(**model_values, limit=ceiling)
    governor = Governor(policy, model, (center - config["commissioning_half_width_C"] - model.ambient,
                                         center + config["commissioning_half_width_C"] - model.ambient))
    queue = [(0.0, 0.0)] * config["fifo_delay_steps"]
    totals = {key: 0 for key in ("sampled_operating_breaches", "resolved_operating_breaches", "sampled_physical_breaches", "resolved_physical_breaches",
        "intersample_only_operating_breaches", "intersample_only_physical_breaches", "interval_misses", "sensor_envelope_misses", "invalid_samples",
        "clipped_samples", "missing_samples", "reduced_commands", "zero_admissions", "positive_executions", "reported_drive_mismatch_samples", "rms_report_mismatch_samples")}
    scheduled = requested_completed = rms_total = joule_total = 0.0
    maximum = initial_winding
    max_energy_error = 0.0
    total_substeps, maximum_actual_dt = 0, 0.0
    history = []
    for k in range(config["duration_steps"]):
        before = motor.state
        ambient = config["changed_ambient_C"] if scenario == "ambient_step" and k >= config["ambient_step_at"] else config["ambient_C"]
        load = config["changed_load_factor"] if scenario == "load_step" and config["load_window_steps"][0] <= k < config["load_window_steps"][1] else 1.0
        missing = scenario == "dropout" and config["dropout_window_steps"][0] <= k < config["dropout_window_steps"][1]
        reading = None if missing else min(before.sensor_C + noise[k], model.clip)
        pending = [packet[0] for packet in queue]
        result = governor.decide(reading, pending, demand[k])
        reported, executing_requested = queue.pop(0) if queue else (result["action"], demand[k])
        if config["fifo_delay_steps"]:
            queue.append((result["action"], demand[k]))
        mismatch = scenario == "ack_mismatch" and config["mismatch_window_steps"][0] <= k < config["mismatch_window_steps"][1]
        drive = config["mismatched_drive_effort"] if mismatch else reported
        step = motor.advance(drive, ambient, load)
        actual_rms_effort = step.rms_current_A / params.rated_current_A
        physical = config["physical_limit_C"]
        sb_operating, rb_operating = int(step.end.winding_C > ceiling + 1e-7), int(step.peak_winding_C > ceiling + 1e-7)
        sb_physical, rb_physical = int(step.end.winding_C > physical + 1e-7), int(step.peak_winding_C > physical + 1e-7)
        only_operating = int(rb_operating and before.winding_C <= ceiling + 1e-7 and not sb_operating)
        only_physical = int(rb_physical and before.winding_C <= physical + 1e-7 and not sb_physical)
        interval_miss = int(not result["lo"] + model.ambient - 1e-7 <= before.winding_C <= result["hi"] + model.ambient + 1e-7)
        sensor_miss = int(abs(before.sensor_C + noise[k] - before.winding_C) > model.eps + 1e-7)
        row = dict(stage=stage, scenario=scenario, seed=seed, policy=policy, ceiling_C=ceiling, k=k, dt_s=step.actual_dt_s,
            integration_substeps=step.integration_substeps, requested_max_dt_s=motor.dt_s, ambient_C=ambient, load_factor=load,
            winding_C=before.winding_C, housing_C=before.housing_C, sensor_C=before.sensor_C, current_A=before.current_A,
            reading_C="" if missing else reading, requested=demand[k], accepted=result["action"], executing_requested=executing_requested,
            reported_effort=reported, drive_effort=drive, actual_rms_effort=actual_rms_effort, pending_json=json.dumps(pending, separators=(",", ":")),
            lo_C=result["lo"] + model.ambient, hi_C=result["hi"] + model.ambient, valid=int(result["valid"]), reason=result["reason"],
            predicted_peak_C=result["peak"] + model.ambient, next_winding_C=step.end.winding_C, next_housing_C=step.end.housing_C,
            next_sensor_C=step.end.sensor_C, next_current_A=step.end.current_A, resolved_peak_C=step.peak_winding_C, peak_offset_s=step.peak_offset_s,
            sampled_operating_breach=sb_operating, resolved_operating_breach=rb_operating, sampled_physical_breach=sb_physical, resolved_physical_breach=rb_physical,
            intersample_only_operating_breach=only_operating, intersample_only_physical_breach=only_physical,
            interval_miss=interval_miss, sensor_envelope_miss=sensor_miss, energy_balance_error_J=step.energy_balance_error_J)
        if writer:
            writer.writerow(row)
        for key, value in (("sampled_operating_breaches", sb_operating), ("resolved_operating_breaches", rb_operating),
                ("sampled_physical_breaches", sb_physical), ("resolved_physical_breaches", rb_physical),
                ("intersample_only_operating_breaches", only_operating), ("intersample_only_physical_breaches", only_physical),
                ("interval_misses", interval_miss), ("sensor_envelope_misses", sensor_miss), ("invalid_samples", int(not result["valid"])),
                ("clipped_samples", int(reading == model.clip)), ("missing_samples", int(missing)),
                ("reduced_commands", int(0 < result["action"] < demand[k] - 1e-8)), ("zero_admissions", int(result["action"] == 0)),
                ("positive_executions", int(reported > 0)), ("reported_drive_mismatch_samples", int(abs(reported - drive) > 1e-8)),
                ("rms_report_mismatch_samples", int(abs(actual_rms_effort - reported) > 1e-6))):
            totals[key] += value
        scheduled += reported
        requested_completed += executing_requested
        rms_total += actual_rms_effort
        joule_total += step.joule_energy_J
        maximum = max(maximum, step.peak_winding_C)
        max_energy_error = max(max_energy_error, abs(step.energy_balance_error_J))
        total_substeps += step.integration_substeps
        maximum_actual_dt = max(maximum_actual_dt, step.actual_dt_s)
        history.append(step.end.winding_C)
        # The policy receives the declared acknowledgment, including the deliberate false-ACK case.
        governor.advance(reported)
    metrics = dict(stage=stage, scenario=scenario, seed=seed, policy=policy, ceiling_C=ceiling, dt_s=motor.dt_s,
        samples=config["duration_steps"], integration_substeps=total_substeps, max_actual_dt_s=maximum_actual_dt,
        max_winding_C=maximum, min_physical_margin_C=config["physical_limit_C"] - maximum,
        scheduled_command_fraction=scheduled / requested_completed if requested_completed else 0.0,
        scheduled_effort_seconds=scheduled, requested_completed_effort_seconds=requested_completed, actual_rms_effort_seconds=rms_total,
        copper_heat_J=joule_total, command_throughput_per_s=totals["positive_executions"] / config["duration_steps"],
        max_energy_balance_error_J=max_energy_error, **totals)
    return metrics, history


def aggregate(rows):
    groups = {}
    for row in rows:
        groups.setdefault((row["scenario"], row["policy"], row["ceiling_C"]), []).append(row)
    output = []
    for (scenario, policy, ceiling), episodes in sorted(groups.items()):
        output.append(dict(scenario=scenario, policy=policy, ceiling_C=ceiling, episodes=len(episodes),
            physical_breach_episodes=sum(row["resolved_physical_breaches"] > 0 for row in episodes),
            operating_breach_episodes=sum(row["resolved_operating_breaches"] > 0 for row in episodes),
            max_winding_C=max(row["max_winding_C"] for row in episodes),
            min_physical_margin_C=min(row["min_physical_margin_C"] for row in episodes),
            mean_scheduled_command_fraction=sum(row["scheduled_command_fraction"] for row in episodes) / len(episodes),
            sampled_physical_breaches=sum(row["sampled_physical_breaches"] for row in episodes),
            resolved_physical_breaches=sum(row["resolved_physical_breaches"] for row in episodes),
            intersample_only_physical_breaches=sum(row["intersample_only_physical_breaches"] for row in episodes),
            resolved_operating_breaches=sum(row["resolved_operating_breaches"] for row in episodes),
            interval_misses=sum(row["interval_misses"] for row in episodes),
            invalid_samples=sum(row["invalid_samples"] for row in episodes),
            sensor_envelope_misses=sum(row["sensor_envelope_misses"] for row in episodes)))
    return output


def validate(out, protocol_commit):
    if not protocol_commit or len(protocol_commit) != 40 or any(c not in "0123456789abcdef" for c in protocol_commit.lower()):
        raise ValueError("record the full published protocol commit SHA with --protocol-commit")
    frozen = verify_frozen(out)
    config = load_config(out / "frozen_protocol.json")
    if not config["status"].startswith("FROZEN"):
        raise ValueError("DRAFT protocol: held-out execution requires a finalized frozen protocol")
    if (out / "episodes.csv").exists() or (out / "raw_steps.csv.gz").exists():
        raise FileExistsError("held-out outputs already exist; never overwrite a run")
    for name, digest in json.loads((out / "calibration.lock.json").read_text()).items():
        if sha(out / name) != digest:
            raise ValueError("calibration output changed: " + name)
    calibration = json.loads((out / "calibration.json").read_text())
    if not all(row["valid"] for row in calibration["ceiling_model_feasibility"].values()):
        raise ValueError("frozen empirical calibration cannot commission all prescribed models; report rather than tune")
    started, started_utc = time.perf_counter(), utc()
    write_json(out / "held_out_start.json", {"utc": started_utc, "protocol_commit": protocol_commit, "source_verified": True, "held_out_seeds": config["validation_seeds"]})
    rows, baseline_histories = [], {}
    with csv_gzip(out / "raw_steps.csv.gz", RAW_FIELDS) as writer:
        for scenario in config["scenarios"]:
            for seed in config["validation_seeds"]:
                for ceiling in config["operating_ceilings_C"]:
                    for policy in config["policies"]:
                        metrics, history = episode(config, calibration["model"], scenario, seed, policy, ceiling, writer=writer)
                        rows.append(metrics)
                        baseline_histories[(scenario, seed, policy, ceiling)] = (metrics, history)
            print("Completed held-out scenario: " + scenario, flush=True)
        refinements = []
        for case in config["refinement"]["cases"]:
            metrics, history = episode(config, calibration["model"], case["scenario"], case["seed"], case["policy"], case["ceiling_C"],
                dt_s=config["integration_step_s"] / config["refinement"]["step_divisor"], stage="refinement", writer=writer,
                resolution_scale=1 / config["refinement"]["step_divisor"])
            original, reference = baseline_histories[(case["scenario"], case["seed"], case["policy"], case["ceiling_C"])]
            peak_error = abs(metrics["max_winding_C"] - original["max_winding_C"])
            trajectory_error = max(abs(a - b) for a, b in zip(history, reference))
            effort_error = abs(metrics["scheduled_command_fraction"] - original["scheduled_command_fraction"])
            refinements.append({**case, "peak_difference_C": peak_error, "max_endpoint_difference_C": trajectory_error,
                "command_fraction_difference": effort_error, "passed": max(peak_error, trajectory_error) <= config["refinement"]["max_temperature_difference_C"]
                    and effort_error <= config["refinement"]["max_effort_fraction_difference"]})
    write_csv(out / "episodes.csv", rows)
    summary = aggregate(rows)
    write_csv(out / "summary.csv", summary)
    write_json(out / "refinement.json", {"scope": "Numerical sensitivity, not physical validation or continuous-maximum proof", "cases": refinements, "all_passed": all(case["passed"] for case in refinements)})
    meta = {**frozen, "status": "COMPLETE", "protocol_commit": protocol_commit, "held_out_started_utc": started_utc,
        "completed_utc": utc(), "duration_seconds": time.perf_counter() - started, "primary_episodes": len(rows),
        "primary_sampled_transitions": len(rows) * config["duration_steps"], "primary_resolved_substeps": sum(row["integration_substeps"] for row in rows),
        "calibration_executions": calibration["executions"], "refinement_executions": len(refinements), "calibration": calibration,
        "parameters_by_held_out_seed": {str(seed): asdict(plant_parameters(config, seed)) for seed in config["validation_seeds"]},
        "aggregation": summary, "numerical_refinement": refinements,
        "interpretation": "Independent illustrative virtual plant challenge; empirical envelope can fail. No hardware validation, measured calibration, or physical guarantee."}
    write_json(out / "run_metadata.json", meta)
    write_json(out / "summary.json", {"scope": meta["interpretation"], "primary_episodes": len(rows), "aggregation": summary})
    hashes = {path.relative_to(out).as_posix(): sha(path) for path in sorted(out.rglob("*")) if path.is_file() and path.name != "MANIFEST.sha256"}
    (out / "MANIFEST.sha256").write_text("".join(digest + "  " + name + "\n" for name, digest in hashes.items()), encoding="utf-8")
    (HERE / "results").mkdir(exist_ok=True)
    (HERE / "results/LATEST.txt").write_text(out.relative_to(HERE).as_posix() if out.is_relative_to(HERE) else out.as_posix(), encoding="utf-8")
    print(json.dumps({"phase": "held_out", "out": str(out), "episodes": len(rows), "seconds": meta["duration_seconds"], "refinements": refinements, "aggregation": summary}, indent=2))
    return meta


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=["calibrate", "validate"])
    parser.add_argument("--config", type=Path, default=HERE / "protocol.json")
    parser.add_argument("--out", type=Path)
    parser.add_argument("--run", type=Path)
    parser.add_argument("--protocol-commit")
    args = parser.parse_args()
    if args.phase == "calibrate":
        out = (args.out or HERE / "results" / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S_%fZ")).resolve()
        calibrate(args.config.resolve(), out)
    else:
        if args.run is None:
            parser.error("validate requires --run pointing to the completed calibration folder")
        validate(args.run.resolve(), args.protocol_commit)


if __name__ == "__main__":
    main()
