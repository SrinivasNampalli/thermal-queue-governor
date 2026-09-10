"""Independent finite-rate synthetic challenge; no physical motor or hardware data.

This plant uses coupled differential equations and RK4, not model.equilibrium or
model.simulate. The estimator receives only observable channels and the frozen
budget. Truth, source drift and integration residuals are evaluation-only data.
"""
from dataclasses import asdict
from pathlib import Path
import argparse
import hashlib
import json
import math
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from model import Budget, Observation, estimate


CASES = (
    {"id": "regulated_finite_rate", "description": "Finite-capacity source with strong proportional heater regulation and fast boundary actuators.",
     "hot_capacity_j_per_k": 5., "pad_capacity_j_per_k": .04,
     "heater_gain_w_per_k": 5., "guard_tau_s": .35, "reference_tau_s": .5,
     "extra_heater_w": 0., "extra_after_s": 1e9},
    {"id": "slow_pad_and_actuators", "description": "Large pad thermal mass and slow measured boundary actuators challenge 20-second settling.",
     "hot_capacity_j_per_k": 5., "pad_capacity_j_per_k": 1.2,
     "heater_gain_w_per_k": .1, "guard_tau_s": 10., "reference_tau_s": 12.,
     "extra_heater_w": 0., "extra_after_s": 1e9},
    {"id": "rapid_heater_load", "description": "Weakly regulated finite source receives an additional heater load during the fifth phase.",
     "hot_capacity_j_per_k": 1.5, "pad_capacity_j_per_k": .04,
     "heater_gain_w_per_k": .05, "guard_tau_s": .35, "reference_tau_s": .5,
     "extra_heater_w": 8., "extra_after_s": 80.},
)


def plant_run(case, phases, dt):
    # Hypothetical constants; no measured motor, materials or actuator ratings.
    gb, gl, gx = .02, .005, .02
    gha, gga, gra = .05, .02, .05
    ch, cs = case["hot_capacity_j_per_k"], case["pad_capacity_j_per_k"]
    cg, cr = .2, .5
    ambient, source_target, rail = 40., 130., 95.
    first_shunt = phases[0]["shunt_w_per_k"]
    initial_pad = (gb*source_target + (gl+gx+first_shunt)*ambient)/(gb+gl+gx+first_shunt)
    heater_bias = gb*(source_target-initial_pad)+gha*(source_target-ambient)
    # States: four temperatures; integrated net external heat, heater heat,
    # signed guard/reference actuator heat, and absolute actuator heat transfer.
    state = [source_target, initial_pad, ambient, ambient, 0., 0., 0., 0., 0.]
    initial_energy = ch*state[0]+cs*state[1]+cg*state[2]+cr*state[3]
    observations, phase_records, trace = [], [], []
    time = 0.
    max_energy_error = 0.
    max_guard_power = max_reference_power = 0.

    def rates(t, y, phase, extra_load):
        hot, pad, guard, ref = y[:4]
        shunt = phase["shunt_w_per_k"]
        guard_command = ambient+phase["guard_delta_c"]
        reference_command = ambient+phase["reference_delta_c"]
        heater = min(50., max(0., heater_bias+case["heater_gain_w_per_k"]*(source_target-hot)+extra_load))
        hp = gb*(hot-pad)
        pg = gl*(pad-guard)
        pr = (gx+shunt)*(pad-ref)
        ha, ga, ra = gha*(hot-ambient), gga*(guard-ambient), gra*(ref-ambient)
        dh, ds = (heater-hp-ha)/ch, (hp-pg-pr)/cs
        dg = (guard_command-guard)/case["guard_tau_s"]
        dr = (reference_command-ref)/case["reference_tau_s"]
        # Ideal first-order actuator laws imply these required thermal powers.
        # They are not measured electrical power; COP/efficiency is unknown.
        guard_power = cg*dg-pg+ga
        reference_power = cr*dr-pr+ra
        external_power = heater+guard_power+reference_power-ha-ga-ra
        return [dh, ds, dg, dr, external_power, heater, guard_power,
                reference_power, abs(guard_power)+abs(reference_power)]

    def rk4(t, y, h, phase, extra_load):
        k1 = rates(t, y, phase, extra_load)
        k2 = rates(t+h/2, [a+h*b/2 for a,b in zip(y,k1)], phase, extra_load)
        k3 = rates(t+h/2, [a+h*b/2 for a,b in zip(y,k2)], phase, extra_load)
        k4 = rates(t+h, [a+h*b for a,b in zip(y,k3)], phase, extra_load)
        return [a+h*(b+2*c+2*d+e)/6 for a,b,c,d,e in zip(y,k1,k2,k3,k4)]

    def channel_values(t, y):
        # Small bounded deterministic readout perturbations, independent of
        # hidden source temperature and case labels, under the declared 0.1 C.
        return (min(rail, y[1]+.005*math.sin(.7*t)),
                y[2]+.005*math.sin(.3*t), y[3]+.005*math.cos(.4*t))

    def slope(rows, column):
        mean_t = sum(r[0] for r in rows)/len(rows)
        mean_v = sum(r[column] for r in rows)/len(rows)
        return sum((r[0]-mean_t)*(r[column]-mean_v) for r in rows)/sum((r[0]-mean_t)**2 for r in rows)

    for phase in phases:
        start = time
        steps = round(phase["duration_s"]/dt)
        if abs(steps*dt-phase["duration_s"]) > 1e-10:
            raise ValueError("Step size must divide frozen phase durations")
        recent, phase_truth = [], []
        # All load edges coincide with phase boundaries; RK4 never spans an edge.
        extra_load = case["extra_heater_w"] if start >= case["extra_after_s"]-1e-9 else 0.
        for step in range(steps):
            before_powers = rates(time,state,phase,extra_load)
            max_guard_power = max(max_guard_power,abs(before_powers[6]))
            max_reference_power = max(max_reference_power,abs(before_powers[7]))
            state = rk4(time, state, dt, phase, extra_load)
            time = start+(step+1)*dt
            pad_read, guard_read, reference_read = channel_values(time, state)
            energy = ch*state[0]+cs*state[1]+cg*state[2]+cr*state[3]
            residual = energy-initial_energy-state[4]
            max_energy_error = max(max_energy_error, abs(residual))
            powers = rates(time,state,phase,extra_load)
            max_guard_power = max(max_guard_power,abs(powers[6]))
            max_reference_power = max(max_reference_power,abs(powers[7]))
            if time > start+phase["duration_s"]-2.-1e-9:
                recent.append((time,pad_read,guard_read,reference_read))
                phase_truth.append(state[0])
            if (step+1) % max(1,round(.4/dt)) == 0 or step == steps-1:
                trace.append({"time_s":round(time,8),"phase":phase["name"],
                    "hot_truth_c":state[0],"pad_truth_c":state[1],
                    "pad_readout_c":pad_read,"guard_readout_c":guard_read,
                    "reference_readout_c":reference_read,
                    "guard_command_c":ambient+phase["guard_delta_c"],
                    "reference_command_c":ambient+phase["reference_delta_c"],
                    "heater_w":powers[5],"guard_thermal_power_w":powers[6],
                    "reference_thermal_power_w":powers[7]})
        slopes = {name:slope(recent,column) for column,name in ((1,"pad"),(2,"guard"),(3,"reference"))}
        settled = all(abs(value)<.02 for value in slopes.values())
        # Quantize acquisition channels far below the declared 0.1 C errors so
        # exact rational certificates reproduce across platform libm last bits.
        obs = Observation(phase["name"],*(round(sum(r[j] for r in recent)/len(recent),9) for j in (1,2,3)),
                          phase["shunt_w_per_k"],any(r[1]>=rail for r in recent),settled)
        observations.append(obs)
        phase_records.append({"phase":phase["name"],"endpoint_temperatures_c":state[:4],
            "observed_slopes_c_per_s":slopes,"settled_by_observable_rule":settled,
            "evaluation_only_hot_plateau_range_c":[min(phase_truth),max(phase_truth)],
            "evaluation_only_pad_storage_heat_w":cs*rates(time,state,phase,extra_load)[1]})
    return {"observations":observations,"phase_records":phase_records,"samples":trace,
        "numerics":{"dt_s":dt,"maximum_energy_balance_residual_j":max_energy_error,
                    "final_energy_balance_residual_j":energy-initial_energy-state[4]},
        "energy":{"net_external_heat_j":state[4],"heater_heat_j":state[5],
                  "guard_signed_thermal_heat_j":state[6],"reference_signed_thermal_heat_j":state[7],
                  "absolute_boundary_actuator_heat_transfer_j":state[8],
                  "maximum_absolute_guard_thermal_power_w":max_guard_power,
                  "maximum_absolute_reference_thermal_power_w":max_reference_power,
                  "electrical_actuator_energy_j":None,
                  "note":"Ideal commanded first-order thermal actuators; efficiency, power feasibility and electrical consumption are not established."}}


def build_report():
    base = Path(__file__).resolve().parent
    protocol = json.loads((base/"protocol.json").read_text(encoding="utf-8"))
    budget = Budget(**protocol["measurement_budget"])
    records = []
    for case in CASES:
        coarse = plant_run(case,protocol["phases"],.04)
        fine = plant_run(case,protocol["phases"],.02)
        error = max(abs(a-b) for ca,fi in zip(coarse["phase_records"],fine["phase_records"])
                    for a,b in zip(ca["endpoint_temperatures_c"],fi["endpoint_temperatures_c"]))
        if len(coarse["samples"]) != len(fine["samples"]):
            raise AssertionError("Refinement sample grids differ")
        trajectory_error = 0.
        for ca, fi in zip(coarse["samples"],fine["samples"]):
            if abs(ca["time_s"]-fi["time_s"]) > 1e-9:
                raise AssertionError("Refinement sample times differ")
            trajectory_error = max(trajectory_error,*(abs(ca[key]-fi[key]) for key in
                ("hot_truth_c","pad_truth_c","guard_readout_c","reference_readout_c")))
        numerical_pass = max(error,trajectory_error) < 1e-4 and fine["numerics"]["maximum_energy_balance_residual_j"] < 1e-7
        result = estimate(fine["observations"],budget,clip_c=95.,**protocol["criteria"])
        hot_min = min(r["evaluation_only_hot_plateau_range_c"][0] for r in fine["phase_records"])
        hot_max = max(r["evaluation_only_hot_plateau_range_c"][1] for r in fine["phase_records"])
        interval = result["source_interval_c"]
        fine["observations"] = [asdict(o) for o in fine["observations"]]
        records.append({"id":case["id"],"description":case["description"],
            "hypothetical_case_parameters":case,"plant":fine,"result":result,
            "step_refinement":{"coarse_dt_s":.04,"fine_dt_s":.02,
                "maximum_phase_endpoint_temperature_difference_c":error,
                "maximum_matched_transient_temperature_difference_c":trajectory_error,
                "proposed_tolerance_c":1e-4,"numerical_checks_pass":numerical_pass},
            "evaluation_only":{"hot_plateau_range_c":[hot_min,hot_max],
                "source_stationarity_span_c":hot_max-hot_min,
                "interval_encloses_all_observed_hot_plateaus":None if interval is None else interval[0]<=hot_min and hot_max<=interval[1],
                "note":"Source truth is not passed to the estimator. A finite varying source does not exactly satisfy its stationary-source model."}})
    return {"title":"Independent finite-rate synthetic plant challenge",
        "scope":"Software experiment on hypothetical coupled thermal nodes. Physical measurements: zero.",
        "physical_validation":False,"motor_permission":"not_authorized",
        "method":"Classical RK4 of source and pad energy balances plus first-order measured guard/reference actuator states.",
        "hypothetical_shared_parameters":{"bond_w_per_k":.02,"guard_leak_w_per_k":.005,
            "reference_bypass_w_per_k":.02,"source_ambient_w_per_k":.05,
            "guard_ambient_w_per_k":.02,"reference_ambient_w_per_k":.05,
            "guard_capacity_j_per_k":.2,"reference_capacity_j_per_k":.5,
            "ambient_c":40.,"source_target_c":130.,"heater_limit_w":50.,"readout_rail_c":95.},
        "observable_settling_rule":"Least-squares slopes of pad, measured guard and measured reference below 0.02 C/s in absolute value during the last 2 seconds; this does not prove source stationarity.",
        "limitations":["No physical motor, material properties or measured calibration.",
            "Guard/reference actuator powers are ideal thermal requirements; no electrical efficiency or actuator feasibility is established.",
            "The network retains linear lumped conductances and cannot validate an arbitrary real topology.",
            "Numerical convergence and energy conservation validate integration behavior, not physical truth."],
        "source_hashes":{name:hashlib.sha256((base/name).read_bytes()).hexdigest()
                         for name in ("dynamic_challenge.py","model.py","linear_bounds.py","protocol.json")},
        "cases":records,"all_numerical_checks_pass":all(r["step_refinement"]["numerical_checks_pass"] for r in records)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output",type=Path)
    parser.add_argument("--summary",action="store_true")
    parser.add_argument("--check",action="store_true")
    args = parser.parse_args()
    report = build_report()
    if args.check:
        from report_io import compare_report
        output = args.output or Path(__file__).with_name("dynamic_results.json")
        compare_report(json.loads(output.read_text(encoding="utf-8")), report)
    elif args.output:
        args.output.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8",newline="\n")
    if args.summary:
        for case in report["cases"]:
            print(case["id"],case["result"]["status"],case["result"]["reason"],
                  "transient_refinement_C",case["step_refinement"]["maximum_matched_transient_temperature_difference_c"],
                  "energy_residual_J",case["plant"]["numerics"]["maximum_energy_balance_residual_j"])
    elif not args.output:
        print(json.dumps(report,indent=2))
    if not report["all_numerical_checks_pass"]:
        raise SystemExit("Numerical verification criterion failed; preserve the report.")
