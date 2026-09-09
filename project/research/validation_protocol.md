# Independent validation checklist and falsifiers

Designed before the independent reviewer inspected any main-run results. **The authoritative frozen executed plan is `EXPERIMENT_PROTOCOL.md` with `protocol_freeze.json`, not this broader checklist.** This document proposes additional checks and extensions; it is not a public preregistration and does not claim they were all executed. The actual benchmark uses five fixed policies, including a robust fixed cap, rather than the four-policy minimum below. It uses a synchronous accepted FIFO and no network transport, timestamp validation, acknowledgement authentication, or replay rejection. Network-related checks below remain future work.

## Primary hypothesis and falsifier

For a recoverable startup interval and queue, the full interval-and-queue governor contains the hidden scalar state and respects the sampled thermal limit on every run satisfying its declared model, sensing, timing, and actuation assumptions. **Any** interval-containment failure or limit violation during such an episode falsifies the implementation or the stated theorem. An already invalid initial condition does not count as a successful safety episode just because the policy immediately invalidates its status.

The second hypothesis is empirical: on preregistered thermal stress traces the full governor improves the tradeoff between sampled overtemperature and delivered normalized effort compared with the stated baselines. This may fail; report the result rather than modifying the benchmark to create a win. A policy that always returns zero is a useful feasibility reference, not evidence of good availability.

## Freeze before the main run

Record sample period, ambient, limit, clip level, noise and clipping order, uncertainty box, initial interval, pending FIFO, command grid, demand waveforms, dropout masks, random seeds, run duration, numerical tolerance, and metric definitions in a machine-readable manifest. Save controller version/hash and separate calibration/test seeds. Design/adaptation performed after seeing results must be labeled exploratory. This note alone does not substitute for a frozen numeric manifest.

For an eventual interface-expanded evaluation, controllers should receive the same permitted observation schema: clipped/noisy temperature with timestamp or missing marker, requested effort, accepted/applied command metadata, and declared model configuration. The current implementation receives only a current scalar reading or missing marker, requested effort, exact pending FIFO, and the constructor's declared model and initial interval; acknowledgement is a separate scalar advance call. Controllers do not receive hidden true temperature, true parameter draws, true disturbance, or future noise/dropout masks. The simulator and metrics evaluator own those fields. Commands should be functions only of the controller-visible history; add a code/interface audit to check this separation.

## Four policies

1. **Full interval and queue governor:** largest admissible grid effort no greater than demand, using the posterior interval, pending FIFO, and zero-input invariant terminal condition.
2. **Clipped-temperature threshold ladder:** declared thresholds, dwell times, throttle values, and missing-sample fallback. Tune them on separate calibration traces to a stated criterion, or identify the comparator as an illustrative fixed heuristic. Include a conservative ladder variant if the first is obviously weak.
3. **Nominal predictive governor:** point estimate, nominal coefficients, identical command grid and queue timing; handle missing/clipped data in a documented way. It receives no true state or true plant parameters. This distinguishes robustness from mere prediction.
4. **Queue ablation:** retain the full observer and all other choices but omit pending actions during admission. The plant still executes the same real FIFO. Document that this ablation tests the delay-accounting mechanism and is not a competitive optimized controller.

Use identical externally generated initial conditions and disturbance, demand, noise, and dropout traces for each policy. Closed-loop temperatures and therefore clipped observations will legitimately differ. Do not force identical observations across policies when their applied actions differ.

## In-contract scenarios

| Scenario | Purpose | Required reporting |
| --- | --- | --- |
| Low demand, unclipped sensing | Detect needless loss of effort | Effort ratio, intervention count |
| High sustained demand across clipping onset | Test censored upper-state propagation | Max hidden T, peak upper bound, containment |
| Demand pulse with pending high commands | Test thermal overshoot before new action applies | Queue horizon peaks, admitted effort |
| Long missing burst after clipping | Test prediction-only operation | Burst length, bounds, valid/unavailable status |
| Near-limit recoverable startup | Test limited initial thermal margin | Initial interval, initial queue, first decisions |
| Maximum allowed queue length | Test timing bookkeeping and conservatism | Delay, violations, effort, computation |
| Parameter-box corners and bounded extreme noise/disturbance | Challenge upper/lower enclosure | Exact combinations and failing traces |
| Seeded interior parameter variation | Broaden exploration | Seeds and paired per-run metrics |

Sample all relevant corner combinations separately from random draws. Include alternating noise extrema and repeated disturbance maxima. Exogenous variables may be independently varied each step only if the controller contract allows that variation. Otherwise follow the declared fixed-parameter model. Duration should be long enough to approach the worst-case zero-input equilibrium; finite duration still does not establish infinite-time safety.

## Out-of-contract and unavailable-assurance scenarios

Test a larger-than-declared heating coefficient or disturbance, cooling loss, wrong/changed FIFO delay, missing or inconsistent command acknowledgements, stale timestamps, a temperature observation inconsistent with the propagated set, clipped startup without a finite upper prior, a pending queue already outside the recoverable set, and a configuration with a_max ≥ 1 or zero-input equilibrium above the limit.

For observable contradictions, require explicit invalidation with a correct reason and zero fallback request. For hidden parameter excursions, report whether and when an observable contradiction occurs; do not demand immediate detection when the measurement stream contains insufficient information. Evaluate hidden containment failures independently even if the controller still says valid. This exposes the conditional nature of the certificate and prevents a misleading “all model violations detected” claim.

## Metrics and analysis

Primary metrics: count of sampled limit violations, maximum exceedance, interval containment failures, valid-state certificate failures, and number of episodes excluded for invalid initialization. Secondary metrics: sum(applied effort)/sum(requested effort), command total variation, time to regain an informative unclipped measurement, invalidation reason counts, and per-decision runtime distribution. Report raw numerator/denominator and define zero-demand handling. “Effort ratio” is not physical energy or production throughput.

Report paired episode-level differences against every baseline. If uncertainty intervals are computed, resample independent episodes, not correlated individual samples. Separate deterministic corner tests from seeded stochastic trials and separate in-contract from invalid-contract results. Report failures and ties. Do not pool an unsafe high-effort baseline and an always-zero policy into a composite score that hides either tradeoff.

Minimal structural tests: delay-zero/delay-one ordering; exact clipped and epsilon-boundary measurements; missing sample propagation; empty intersection; unknown startup; worst-case terminal equilibrium; no safe pending queue; every admitted grid command respects demand and horizon; hidden truth unavailable to controller. Use numerical tolerances in one documented place and expose actual maximum discrepancies.

## Release gate

Before claiming the simulated contract passes, every required structural check must pass, every in-contract result must satisfy the primary falsifier, and the result manifest must match the stated protocol or disclose deviations. A simulation pass releases only a research prototype. Bench experiments and validated mechanical stop behavior are separate future gates.
