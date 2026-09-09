"""Reanalyze retained primary episodes with a paired seed-cluster bootstrap.

Python standard library only. This script never runs or modifies a simulation.
Run from any directory; use --check to verify generated artifacts without writing.
"""

import argparse
import csv
import hashlib
import json
import math
import random
import statistics
from pathlib import Path


PROJECT = Path(__file__).resolve().parents[1]
SCENARIOS = ("no_delay", "delay_8", "delay_20", "dropout_60", "hot_start", "upper_corner")
POLICIES = ("interval_queue", "fixed_cap")
REPLICATES = 20_000
BOOTSTRAP_SEED = 20260909


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def percentile(ordered, probability):
    """Linear interpolation at zero-based index (N - 1) * probability."""
    index = (len(ordered) - 1) * probability
    lower = math.floor(index)
    upper = math.ceil(index)
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (index - lower)


def spread(values):
    return {
        "mean": statistics.fmean(values),
        "sample_sd": statistics.stdev(values),
        "min": min(values),
        "max": max(values),
    }


def analyze():
    pointer = PROJECT / "results/FINAL_EVALUATION.txt"
    run = (PROJECT / pointer.read_text(encoding="utf-8").strip()).resolve()
    require(run.is_relative_to(PROJECT / "results"), "Run pointer must stay in project/results")
    episode_path = run / "episodes.csv"
    metadata_path = run / "run_metadata.json"
    config_path = PROJECT / "config/evaluation.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    config = json.loads(config_path.read_text(encoding="utf-8"))
    require(config == metadata["config"], "Configuration differs from retained run metadata")
    require(sha256(config_path) == metadata["config_sha256"], "Configuration hash mismatch")
    inputs = [pointer, episode_path, metadata_path, config_path, Path(__file__).resolve()]
    for relative, expected in metadata["source_sha256"].items():
        snapshot = run / "source" / Path(relative.replace("\\", "/"))
        require(sha256(snapshot) == expected, f"Retained source snapshot hash mismatch: {relative}")
        inputs.append(snapshot)
    with episode_path.open(newline="", encoding="utf-8") as stream:
        rows = list(csv.DictReader(stream))
    require(len(rows) == metadata["episodes"] == 900, "Expected the 900-episode final evaluation")
    require(metadata["sampled_transitions"] == 810_000, "Unexpected main transition count")
    require(config["steps"] == 900 and config["limit_C"] == 105, "Unexpected primary configuration")
    keys = [(r["scenario"], int(r["seed"]), r["policy"]) for r in rows]
    require(len(set(keys)) == len(keys), "Duplicate scenario/seed/policy episode")
    require({r["in_contract"] for r in rows} == {"True", "False"}, "Invalid contract flag")
    valid = [r for r in rows if r["in_contract"] == "True"]
    require({r["scenario"] for r in valid} == set(SCENARIOS), "Unexpected in-contract scenario set")
    seeds = sorted(config["seeds"])
    require(seeds == list(range(2000, 2020)), "Expected the 20 retained final-evaluation seeds")
    primary = [r for r in valid if r["policy"] in POLICIES]
    keyed = {(r["scenario"], int(r["seed"]), r["policy"]): r for r in primary}
    expected_keys = {(scenario, seed, policy) for scenario in SCENARIOS for seed in seeds for policy in POLICIES}
    require(set(keyed) == expected_keys, "Primary data must contain every paired scenario/seed/policy")
    for row in primary:
        require(math.isfinite(float(row["effort_fraction"])) and 0 <= float(row["effort_fraction"]) <= 1,
                "Primary effort ratio is nonfinite or outside [0, 1]")
        require(math.isfinite(float(row["max_T_C"])), "Nonfinite maximum temperature")
        for field in ("breach_steps", "interval_misses", "invalid_steps"):
            require(0 <= int(row[field]) <= config["steps"], f"Invalid event count: {field}")
    per_seed = []
    for seed in seeds:
        item = {"seed": seed}
        for policy in POLICIES:
            item[policy] = statistics.fmean(float(keyed[(scenario, seed, policy)]["effort_fraction"])
                                            for scenario in SCENARIOS)
        item["paired_difference"] = item["interval_queue"] - item["fixed_cap"]
        per_seed.append(item)
    measures = (*POLICIES, "paired_difference")
    statistics_by_measure = {name: spread([r[name] for r in per_seed]) for name in measures}
    rng = random.Random(BOOTSTRAP_SEED)
    replicates = {name: [] for name in measures}
    for _ in range(REPLICATES):
        # One draw selects a whole seed: both policies and all six scenarios stay together.
        draw = [per_seed[rng.randrange(len(seeds))] for _ in seeds]
        for name in measures:
            replicates[name].append(statistics.fmean(r[name] for r in draw))
    for name in measures:
        ordered = sorted(replicates[name])
        statistics_by_measure[name]["bootstrap_95_percentile_ci"] = [percentile(ordered, 0.025), percentile(ordered, 0.975)]
    scenario_results = []
    for scenario in SCENARIOS:
        result = {"scenario": scenario}
        for policy in POLICIES:
            selected = [keyed[(scenario, seed, policy)] for seed in seeds]
            mean = statistics.fmean(float(r["effort_fraction"]) for r in selected)
            recorded = next(r for r in metadata["aggregation"] if r["scenario"] == scenario and r["policy"] == policy)
            require(math.isclose(mean, recorded["mean_effort_fraction"], abs_tol=1e-12, rel_tol=0),
                    "Recomputed scenario mean differs from retained metadata")
            result[policy] = {
                "episodes": len(selected), "mean_effort_fraction": mean,
                "breach_episodes": sum(int(r["breach_steps"]) > 0 for r in selected),
            }
        result["paired_difference"] = result["interval_queue"]["mean_effort_fraction"] - result["fixed_cap"]["mean_effort_fraction"]
        scenario_results.append(result)
    safety = {}
    for policy in POLICIES:
        selected = [r for r in primary if r["policy"] == policy]
        maximum = max(float(r["max_T_C"]) for r in selected)
        safety[policy] = {
            "episodes": len(selected), "sampled_transitions": len(selected) * config["steps"],
            "breach_episodes": sum(int(r["breach_steps"]) > 0 for r in selected),
            "breach_steps": sum(int(r["breach_steps"]) for r in selected),
            "interval_misses": sum(int(r["interval_misses"]) for r in selected),
            "invalid_steps": sum(int(r["invalid_steps"]) for r in selected),
            "max_T_C": maximum, "distance_below_105_C": config["limit_C"] - maximum,
            "episodes_with_peak_above_105_C_strict": sum(float(r["max_T_C"]) > config["limit_C"] for r in selected),
            "maximum_locations": [{"scenario": r["scenario"], "seed": int(r["seed"])}
                                  for r in selected if float(r["max_T_C"]) == maximum],
        }
        require(safety[policy]["episodes"] == 120, "Expected 120 primary episodes per policy")
        require(safety[policy]["breach_episodes"] == 0, "Primary policy no longer has zero breach episodes")
        require(safety[policy]["episodes_with_peak_above_105_C_strict"] == 0,
                "Primary policy peak now exceeds the strict 105 C limit")
    require(safety["interval_queue"]["interval_misses"] == 0 and safety["interval_queue"]["invalid_steps"] == 0,
            "Retained candidate containment or validity count changed")
    require(math.isclose(safety["interval_queue"]["max_T_C"], 104.99997190667195, abs_tol=1e-12, rel_tol=0),
            "Retained candidate peak changed")
    return {
        "analysis": "Post hoc descriptive reanalysis of retained primary synthetic episodes; no new episodes",
        "run": run.relative_to(PROJECT).as_posix(),
        "design": {"scenarios": list(SCENARIOS), "seeds": seeds, "policies": list(POLICIES),
                   "episode_rows_analyzed": len(primary), "paired_seed_clusters": len(seeds),
                   "scenarios_per_cluster": len(SCENARIOS), "episodes_per_policy": 120,
                   "steps_per_episode": config["steps"], "new_simulation_episodes": 0},
        "method": {"estimand": "Equal-weight arithmetic mean of episode applied/requested effort ratios across the six fixed scenarios and twenty retained seeds",
                   "spread_unit": "Twenty seed means, each averaging six scenarios; sample SD uses denominator 19",
                   "bootstrap": "Paired cluster percentile bootstrap: resample 20 whole seeds with replacement, retaining both policies and all six scenarios",
                   "replicates": REPLICATES, "random_seed": BOOTSTRAP_SEED,
                   "random_generator": "Python random.Random; randrange(20) once per selected cluster",
                   "quantile": "Linear interpolation at zero-based sorted index (replicates - 1) * probability; probabilities 0.025 and 0.975",
                   "ci_scope": "Conditional empirical seed variability for this fixed synthetic design; not hardware, unseen-scenario, safety, or model-uncertainty coverage"},
        "effort_statistics_ratio_units": statistics_by_measure,
        "scenario_results": scenario_results,
        "per_seed_mean_effort_fraction": per_seed,
        "sampled_safety": safety,
        "source_sha256": {p.relative_to(PROJECT).as_posix(): sha256(p) for p in inputs},
        "validation": {"configuration_hash_matches_retained_metadata": True,
                       "source_snapshot_hashes_match_retained_metadata": True,
                       "unique_complete_pairs": True, "scenario_means_match_retained_metadata": True},
    }


def markdown(data):
    stats = data["effort_statistics_ratio_units"]
    safety = data["sampled_safety"]["interval_queue"]
    lines = [
        "# Primary evidence: spread, paired uncertainty, and numerical margin", "",
        "This is a **post hoc reanalysis of existing synthetic results**, not a new experiment. "
        "It reads the final evaluation named by `results/FINAL_EVALUATION.txt`; it leaves the original data unchanged. "
        "The 900-episode main run includes fault probes and other policies. This comparison uses only "
        "120 `interval_queue` and 120 `fixed_cap` episodes: six in-contract scenarios × 20 paired seeds (2000–2019), "
        "with 900 sampled transitions per episode. The later actuator-mismatch and clipping studies are excluded.", "",
        "## Effort and seed-to-seed spread", "",
        "Effort is the episode's sum of applied normalized effort divided by sum of requested normalized effort. "
        "It is not physical work, energy efficiency, or command throughput. For each seed, first average all six "
        "scenario ratios with equal weights. The table summarizes these 20 seed means; SD is the sample standard "
        "deviation with denominator 19. Percentage points (pp) express the paired difference.", "",
        "| Measure | Mean | Seed-mean SD | Seed-mean range | Paired cluster bootstrap 95% CI |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for name, label in (("interval_queue", "TQG / interval_queue"), ("fixed_cap", "Fixed cap"), ("paired_difference", "TQG minus fixed cap")):
        s = stats[name]
        unit = " pp" if name == "paired_difference" else "%"
        lo, hi = s["bootstrap_95_percentile_ci"]
        lines.append(f"| {label} | {100*s['mean']:.6f}{unit} | {100*s['sample_sd']:.6f} pp | {100*s['min']:.6f}–{100*s['max']:.6f}{unit} | {100*lo:.6f}–{100*hi:.6f}{unit} |")
    lines.extend([
        "", "The fixed-cap effort ratio is identical across seeds in this design; its SD and bootstrap interval "
        "therefore collapse to zero width. This follows from the fixed action rule, deterministic requested-effort "
        "schedule, and scenario delays. It does not mean real motor performance is known without uncertainty.", "",
        "## Method and interpretation", "",
        f"The deterministic paired cluster bootstrap uses **{REPLICATES:,} replicates**, Python's standard-library "
        f"`random.Random({BOOTSTRAP_SEED})`, and 20 seed draws with replacement in each replicate. "
        "Each draw retains both policies and all six scenarios for that seed. This preserves the policy pairing "
        "and the shared random inputs across scenarios instead of treating 120 episodes, or 108,000 time steps, "
        "as independent units. Each replicate averages the 20 selected seed means; the paired difference uses "
        "the same selected seeds. Endpoints are the 2.5th and 97.5th percentiles, with linear interpolation at "
        "zero-based sorted index `(20000 - 1) * p`.", "",
        "These are descriptive, nominal 95% bootstrap intervals conditional on the empirical seed distribution "
        "and the six selected, equally weighted scenarios. There are only 20 seed clusters. The scenarios are "
        "fixed design cases, not a random sample of motor applications. The intervals do not include plant-model "
        "misspecification, alternative scenario weights, unseen faults, physical measurement uncertainty, or "
        "hardware variability. They do not establish population coverage or a universal performance ranking. "
        "The uncertainty analysis was added after inspecting the completed study; it is not a preregistered "
        "confirmatory test. No p-value, independent-transition assumption, or breach-probability confidence "
        "claim is made.", "",
        "## All six primary scenarios", "",
        "| Scenario | TQG effort | Fixed-cap effort | Paired difference | TQG breaches | Fixed-cap breaches |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ])
    for row in data["scenario_results"]:
        tqg, cap = row["interval_queue"], row["fixed_cap"]
        lines.append(f"| `{row['scenario']}` | {100*tqg['mean_effort_fraction']:.6f}% | {100*cap['mean_effort_fraction']:.6f}% | {100*row['paired_difference']:.6f} pp | {tqg['breach_episodes']}/20 | {cap['breach_episodes']}/20 |")
    lines.extend([
        "", "## Sampled safety and the near-limit peak", "",
        "Both policies have **0/120 sampled breach episodes** in this primary comparison, with 108,000 sampled "
        "transitions per policy. TQG also records zero interval-containment misses and zero invalid steps in "
        "this subset. These are observed finite counts under the modeled contract, not a zero-risk probability "
        "or a hardware safety certificate.", "",
        f"TQG's maximum stored temperature is **{safety['max_T_C']:.14f} °C**, or 104.99997 °C to five decimal "
        f"places. Its distance below the configured 105 °C limit is **{safety['distance_below_105_C']:.14f} °C** "
        f"(about {safety['distance_below_105_C'] * 1_000_000:.3f} microdegrees Celsius). "
        "There are no primary TQG episode maxima above 105 °C even under a strict comparison. "
        "The original runner labels a sampled breach only when the next temperature exceeds `105 + 1e-7` °C; "
        "that numerical tolerance must remain visible when interpreting the saved breach counts.", "",
        "This tiny arithmetic gap is **not an engineering safety margin**. The scalar discrete-time simulation "
        "does not validate temperatures between samples, winding-to-sensor gradients, model calibration, "
        "thermal runaway protection, real shutdown behavior, or physical stopping distance. The stored "
        "floating-point precision must not be presented as sensor accuracy. An implementation would need "
        "separately justified physical bounds and margins.", "",
        "## Reproduction and provenance", "",
        "Run from the repository root with Python 3.10 or newer; no third-party packages are required:", "",
        "```sh", "python project/tools/analyze_primary_evidence.py", "python project/tools/analyze_primary_evidence.py --check", "```", "",
        "The script verifies the retained configuration and source-snapshot hashes, checks all 240 unique "
        "paired rows, recomputes every primary scenario mean against run metadata, and verifies the stored "
        "TQG peak. It generates this report and `primary_evidence.json`, which includes all 20 seed means "
        "and full-precision numerical outputs. `--check` recomputes and compares the artifact bytes without "
        "writing. No simulation, raw-log regeneration, or input-file modification occurs. Episode maxima "
        "and event counts are read from `episodes.csv`; this analysis does not independently replay the "
        "compressed transition log.", "",
        "SHA-256 values cover every input used here plus this analysis script. Paths are relative to `project/`.", "",
        "| Input | SHA-256 |", "| --- | --- |",
    ])
    for path, digest in data["source_sha256"].items():
        lines.append(f"| `{path}` | `{digest}` |")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Recompute and verify existing output bytes without writing")
    args = parser.parse_args()
    data = analyze()
    outputs = {
        PROJECT / "research/primary_evidence.json": json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
        PROJECT / "research/PRIMARY_EVIDENCE.md": markdown(data),
    }
    for path, content in outputs.items():
        encoded = content.encode("utf-8")
        if args.check:
            require(path.exists() and path.read_bytes() == encoded, f"Generated artifact differs: {path}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(encoded)
    print(json.dumps({"status": "verified" if args.check else "generated",
                      "new_simulation_episodes": 0, "primary_rows": data["design"]["episode_rows_analyzed"],
                      "effort_statistics": data["effort_statistics_ratio_units"],
                      "candidate_peak_C": data["sampled_safety"]["interval_queue"]["max_T_C"],
                      "candidate_gap_C": data["sampled_safety"]["interval_queue"]["distance_below_105_C"]}, indent=2))


if __name__ == "__main__":
    main()
