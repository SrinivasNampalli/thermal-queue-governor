# Independent final-result review

Reviewed final run `results/20260909T051443_157982Z`, identified by `results/LATEST.txt` at review time. Metadata records completion at 2026-09-09T05:15:29.458598 UTC, seeds 2000–2019, 900 episodes and 810,000 sampled transitions. The reviewer independently read the summary and metadata, recomputed selected aggregates, verified both source-file hashes against metadata, and parsed the complete compressed raw-step log for actual/acknowledged effort differences. This is an independent artifact audit, not a second execution of the main experiment or a hardware validation.

## Gate assessment

| Gate | Finding | Interpretation |
| --- | --- | --- |
| G1: full-policy sampled safety and interval containment in contract | **Pass on the stated suite:** 120 full-policy episodes, 108,000 transitions, zero sampled limit breaches, zero interval misses and zero invalid steps. Maximum observed temperature is 104.9999719 °C against a selected 105 °C limit. | The software examples are consistent with the conditional scalar proof. The value very near the limit emphasizes that no physical safety margin or intersample bound has been validated. |
| G2: useful normalized effort | **Pass against the declared ≥0.50 scenario-mean threshold:** lowest full-policy scenario mean is 0.704956 in `upper_corner`; highest is 0.955362 in `no_delay`. Equal-weight aggregate across six in-contract scenarios is 0.903721, compared with 0.671195 for `fixed_cap`. | This is a simulated normalized-effort measure and an illustrative scenario average, not demonstrated industrial throughput or energy efficiency. All six scenario means must remain visible alongside the aggregate. |
| G3: unavailable assurance / invalid contract handling | The inspected 15-test log includes invalid queue, overflow, incompatible observation and model/startup rejection checks. Out-of-contract main results preserve interval misses and invalidation. However, the main `queue_mismatch` condition never changes applied effort for the full policy. | **Only partially exercised by the main simulation.** Invalid-input tests support the implemented rejection paths. No full-policy robustness or detection conclusion can be drawn from the ineffective mismatch injection. Hidden model violations cannot universally be detected from censored observations. |
| G4: queue-accounting mechanism | `interval_no_queue` breaches the limit in 22 of 120 in-contract episodes: 2/20 under delay 20, and 20/20 at the upper corner. The full policy has 0/120. The ablation's worst peak is 116.231926 °C. | This supplies a concrete counterexample to admission that ignores already pending commands in the chosen model. It does not establish that every other delayed controller would fail. |

## Main mismatch scenario did not activate for the candidate

The main runner replaces actual effort with 1.0 during steps 250–274 in `queue_mismatch`. For the full governor, threshold policy, and nominal governor, the already scheduled effort is 1.0 throughout those windows. The assignment therefore produces no actual/acknowledged difference in any of their 20 episodes. Their matching metrics between `delay_8` and `queue_mismatch` are explained by this non-activation, rather than by a successful response to a fault.

Independent full-log counts of `abs(applied − acknowledged) > 1e−12` are:

| Policy | Changed steps | Episodes with a changed step |
| --- | ---: | ---: |
| fixed_cap | 500 | 20 |
| threshold | 0 | 0 |
| nominal_queue | 0 | 0 |
| interval_no_queue | 200 | 8 |
| interval_queue | 0 | 0 |

Keep the original main-run record. A later activated mismatch experiment must be separately labeled, with its own seeds and explicit confirmation that effort actually differs. Do not silently replace this main condition, score it as a full-policy detection success, or interpret its zero failures as mismatch tolerance.

## Comparator interpretation

The fixed robust cap is a useful safe reference and has no in-contract breaches. The full governor's higher effort delivery relative to that cap is the most informative safe-to-safe comparison in this suite. The fixed 93/88 °C threshold policy is also safe in five ordinary scenarios but fails in all 20 upper-corner episodes, reaching 106.178631 °C. Those outcomes should be reported without dismissing threshold methods generally; their tuning and sensing/actuation assumptions matter.

The strengthened nominal governor preserves its own prediction through clipping and knows the queue. Its midpoint thermal model predicts that full effort is approximately sustainable near this benchmark's limit, so it generally continues granting full effort. Realizations near the high-heating side of the uncertainty box then violate the true limit: 8/20 episodes in each ordinary scenario and 20/20 at the upper corner. These results demonstrate sensitivity to nominal parameter error in this selected configuration. They do not show that every calibrated nominal or nonlinear predictive controller performs poorly. The amendment discloses the baseline strengthening after the retained pilot and uses fresh final seeds, improving transparency without making the test suite a blind external benchmark.

The queue ablation both violates the limit and often latches its certificate unavailable, reducing later effort. This conservative latch is part of the implemented ablation, so its low cumulative effort should not be portrayed solely as the inherent performance of all queue-ignorant policies.

## Reproducibility and limits

The final metadata's source SHA-256 values match the inspected `run_experiments.py` and `src/governor.py`. The final experiment's configuration is the seed-amended `config/evaluation.json`; the original `config/experiment.json` belongs to the initial protocol/pilot. An intermediate directory, `20260909T051241_093930Z`, is explicitly marked incomplete after orchestration interruption and is not an evaluated result.

Raw results distinguish hidden temperature, measurement, requested/accepted/applied/acknowledged effort, pre-decision pending queue, interval, status and decision counter. Hidden truth remains outside the controller API. The counter is diagnostic, and no network replay, timing authentication, stale-packet or physical shutdown mechanism is validated here.

The wider suggestions in `validation_protocol.md` remain a future checklist. The actual gates come from `EXPERIMENT_PROTOCOL.md` and its amendment. A software pass cannot establish physically correct thermal bounds, startup commissioning, winding/surface agreement, real actuator behaviour, or patent novelty.

## Post-main follow-up audit

Two additional experiments were explicitly designed after the main evaluation and retain separate protocols, fresh seeds, pointers and result directories. They do not replace or retrospectively expand the initial main-run protocol. The reviewer independently parsed all 90,000 ACK follow-up rows and all 108,000 clipping-ablation rows, confirmed those totals against metadata, and verified each saved configuration and both per-run source snapshots against their SHA-256 values. Source inspection confirms that the ACK study uses the same governor as the main run; the clipping study adds a deliberately incorrect observer branch without changing the full governor's execution path.

### Activated actuator mismatch

`results/ACK_FOLLOWUP.txt` points to `results/20260909T051756_633768Z`, with seeds 3000–3019 and the recorded `ACK_FOLLOWUP_PROTOCOL.md`. Actual effort is forced to 1.0 during steps 500–524, while the evaluator reports the scheduled effort to the observer. Unlike the main injection, this follow-up **activates for every policy: 500 changed steps across all 20 episodes per policy**, using an absolute actual/acknowledged difference threshold of 1e−12.

For the full governor, the raw-log audit finds:

| Observation | Verified count |
| --- | ---: |
| Sampled temperature breach episodes | 0 / 20 |
| Interval-containment misses | 317 steps in 8 episodes |
| Containment misses while status still reports valid | **113 steps in 7 episodes** |
| Invalid status | 2,350 steps in 6 episodes |
| Maximum simulated temperature | 102.986302 °C |

This is a concrete loss of the interval guarantee under inaccurate applied-action information. Zero sampled overheating in these 20 episodes does not restore that guarantee, and the 113 misses while status remains valid directly refute any interpretation that residual checks detect every hidden actuation mismatch before assurance is lost. The state can depart from the reported interval without an observable contradiction, particularly under clipping. Describe the status as conditional on the actuation contract, not a verified statement that the contract is currently true.

The ACK experiment is an out-of-contract challenge, not a performance-ranking benchmark. For example, the nominal policy's delivered-effort ratio exceeds 1 in the aggregate because the fault forces unintended extra effort; that ratio is not an availability benefit or efficiency gain. Other controllers also face the same forced actual command, but their scheduled efforts and temperatures differ because the trajectories are closed loop.

### Clipped-temperature update ablation

`results/CLIPPING_ABLATION.txt` points to `results/20260909T051901_653785Z`, with fresh seeds 4000–4019. `CLIPPING_ABLATION_PROTOCOL.md` declares a deliberately false ceiling-as-exact update that caps the upper temperature rise at `clip − ambient + epsilon`, while retaining the same robust parameter box and queue-aware admission calculation. It isolates the consequence of treating a censored observation as if it supplied a finite upper bound. This is a mechanism ablation, not a tuned competitive estimator.

| Policy | Breach episodes / 40 | Interval misses | Misses while status says valid | Maximum simulated temperature |
| --- | ---: | ---: | ---: | ---: |
| Full interval and queue governor | 0 | 0 | 0 | 104.999968 °C |
| Queue ablation | 25 | 0 | 0 | 116.234044 °C |
| False exact-clip update | 28 | 23,678 | 23,678 | 176.582453 °C |

The false exact-clip policy breaches in 8/20 delay-20 episodes and 20/20 upper-corner episodes, losing interval containment in 31/40 episodes. Its status never invalidates in this suite because the deliberately truncated interval is repeatedly treated as if it were justified. These results support the narrow claim that preserving the predicted upper bound during censoring matters in this scalar implementation. They do not establish novelty, superiority over all saturation-aware estimators, or physically validated temperature trajectories at those extreme simulated values. The raw `in_contract` flag denotes the scenario's plant/sensor/actuation assumptions; it does not endorse the ablation's intentionally invalid observer update.

The full governor remains free of breaches, misses and invalid states in both clipping-study scenarios. The added evidence closes the main mismatch test's non-activation gap and distinguishes the clipping mechanism from the nominal-parameter comparison. It does not remove the documented limits on model validity, observability, network behavior, intersample peaks, or physical stopping behavior. No further experimental expansion is required to report this scoped research prototype candidly.
