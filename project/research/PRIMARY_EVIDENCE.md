# Primary evidence: spread, paired uncertainty, and numerical margin

This is a **post hoc reanalysis of existing synthetic results**, not a new experiment. It reads the final evaluation named by `results/FINAL_EVALUATION.txt`; it leaves the original data unchanged. The 900-episode main run includes fault probes and other policies. This comparison uses only 120 `interval_queue` and 120 `fixed_cap` episodes: six in-contract scenarios × 20 paired seeds (2000–2019), with 900 sampled transitions per episode. The later actuator-mismatch and clipping studies are excluded.

## Effort and seed-to-seed spread

Effort is the episode's sum of applied normalized effort divided by sum of requested normalized effort. It is not physical work, energy efficiency, or command throughput. For each seed, first average all six scenario ratios with equal weights. The table summarizes these 20 seed means; SD is the sample standard deviation with denominator 19. Percentage points (pp) express the paired difference.

| Measure | Mean | Seed-mean SD | Seed-mean range | Paired cluster bootstrap 95% CI |
| --- | ---: | ---: | ---: | ---: |
| TQG / interval_queue | 90.372117% | 5.302356 pp | 78.328092–94.441300% | 88.019028–92.478073% |
| Fixed cap | 67.119497% | 0.000000 pp | 67.119497–67.119497% | 67.119497–67.119497% |
| TQG minus fixed cap | 23.252621 pp | 5.302356 pp | 11.208595–27.321803 pp | 20.899531–25.358576 pp |

The fixed-cap effort ratio is identical across seeds in this design; its SD and bootstrap interval therefore collapse to zero width. This follows from the fixed action rule, deterministic requested-effort schedule, and scenario delays. It does not mean real motor performance is known without uncertainty.

## Method and interpretation

The deterministic paired cluster bootstrap uses **20,000 replicates**, Python's standard-library `random.Random(20260909)`, and 20 seed draws with replacement in each replicate. Each draw retains both policies and all six scenarios for that seed. This preserves the policy pairing and the shared random inputs across scenarios instead of treating 120 episodes, or 108,000 time steps, as independent units. Each replicate averages the 20 selected seed means; the paired difference uses the same selected seeds. Endpoints are the 2.5th and 97.5th percentiles, with linear interpolation at zero-based sorted index `(20000 - 1) * p`.

These are descriptive, nominal 95% bootstrap intervals conditional on the empirical seed distribution and the six selected, equally weighted scenarios. There are only 20 seed clusters. The scenarios are fixed design cases, not a random sample of motor applications. The intervals do not include plant-model misspecification, alternative scenario weights, unseen faults, physical measurement uncertainty, or hardware variability. They do not establish population coverage or a universal performance ranking. The uncertainty analysis was added after inspecting the completed study; it is not a preregistered confirmatory test. No p-value, independent-transition assumption, or breach-probability confidence claim is made.

## All six primary scenarios

| Scenario | TQG effort | Fixed-cap effort | Paired difference | TQG breaches | Fixed-cap breaches |
| --- | ---: | ---: | ---: | ---: | ---: |
| `no_delay` | 95.536164% | 67.924528% | 27.611635 pp | 0/20 | 0/20 |
| `delay_8` | 94.689937% | 67.320755% | 27.369182 pp | 0/20 | 0/20 |
| `delay_20` | 93.445597% | 66.415094% | 27.030503 pp | 0/20 | 0/20 |
| `dropout_60` | 94.014151% | 67.320755% | 26.693396 pp | 0/20 | 0/20 |
| `hot_start` | 94.051258% | 67.320755% | 26.730503 pp | 0/20 | 0/20 |
| `upper_corner` | 70.495597% | 66.415094% | 4.080503 pp | 0/20 | 0/20 |

## Sampled safety and the near-limit peak

Both policies have **0/120 sampled breach episodes** in this primary comparison, with 108,000 sampled transitions per policy. TQG also records zero interval-containment misses and zero invalid steps in this subset. These are observed finite counts under the modeled contract, not a zero-risk probability or a hardware safety certificate.

TQG's maximum stored temperature is **104.99997190667195 °C**, or 104.99997 °C to five decimal places. Its distance below the configured 105 °C limit is **0.00002809332805 °C** (about 28.093 microdegrees Celsius). There are no primary TQG episode maxima above 105 °C even under a strict comparison. The original runner labels a sampled breach only when the next temperature exceeds `105 + 1e-7` °C; that numerical tolerance must remain visible when interpreting the saved breach counts.

This tiny arithmetic gap is **not an engineering safety margin**. The scalar discrete-time simulation does not validate temperatures between samples, winding-to-sensor gradients, model calibration, thermal runaway protection, real shutdown behavior, or physical stopping distance. The stored floating-point precision must not be presented as sensor accuracy. An implementation would need separately justified physical bounds and margins.

## Reproduction and provenance

Run from the repository root with Python 3.10 or newer; no third-party packages are required:

```sh
python project/tools/analyze_primary_evidence.py
python project/tools/analyze_primary_evidence.py --check
```

The script verifies the retained configuration and source-snapshot hashes, checks all 240 unique paired rows, recomputes every primary scenario mean against run metadata, and verifies the stored TQG peak. It generates this report and `primary_evidence.json`, which includes all 20 seed means and full-precision numerical outputs. `--check` recomputes and compares the artifact bytes without writing. No simulation, raw-log regeneration, or input-file modification occurs. Episode maxima and event counts are read from `episodes.csv`; this analysis does not independently replay the compressed transition log.

SHA-256 values cover every input used here plus this analysis script. Paths are relative to `project/`.

| Input | SHA-256 |
| --- | --- |
| `results/FINAL_EVALUATION.txt` | `caac9658efd8fb8e58cb2313f1bde5b895ff80e14110db3b3e3b079bfb52d6c3` |
| `results/20260909T051443_157982Z/episodes.csv` | `46e535239cf0e248de4b27beb1fef11fe88226a1e18f4cadeaf17f425e7a8ab3` |
| `results/20260909T051443_157982Z/run_metadata.json` | `33600f7ce3b6eedc114476e168a3505f8fe21a50cf4a5ac1af63113ffe0829e3` |
| `config/evaluation.json` | `3bd2a4c81bff63e1dec7a263511cd4da93ef510826958c6a3fe5ca5ba0b2e0c2` |
| `tools/analyze_primary_evidence.py` | `5c5e752786cde5508e175e9eb6f4cf479ea6350fcae81af62a7979d22107f05f` |
| `results/20260909T051443_157982Z/source/run_experiments.py` | `44820b8117fc54d03bdd8cc2a728e65524adc20afc22c8bb0c66964eaec112d2` |
| `results/20260909T051443_157982Z/source/src/governor.py` | `71a1a6dc639a0f8252b01233d3c3765f22bea48a9f3bc36051374d233eae0158` |
