# Independent engineering review

Review date: 2026-09-09 UTC. Scope: proposed simulation and invention disclosure, source-code inspection, and later result-file inspection. See `final_results_review.md` for the independent artifact audit of the completed main run. This is an independent technical challenge, not a hardware certification or a novelty opinion.

## Connection to the supplied paper

The supplied *Control-Aware Predictive Maintenance of Industrial Robot Motors Using Multi-Sensor Fusion and FDIR Integration*, pp. 2–4, reports temperature front-end clipping near 95 °C and an FDIR response based on time in the saturated band. Its temperature values reach 95.2 °C. It does not provide calibrated thermal dynamics, motor current histories, queued command acknowledgements, hidden winding-temperature ground truth, or closed-loop validation of the proposed governor. Its IQR labels indicate statistical outliers, not confirmed thermal faults. The new work therefore uses the paper as problem motivation; generated trajectories must be identified as synthetic and cannot be represented as experiments on its six motors.

## Defensible technical claim

Given a valid finite startup state interval, a bounded scalar thermal model, bounded sensor error, known ordered applied-action history, and a correctly maintained FIFO of accepted future actions, interval propagation plus a zero-input invariant terminal set can preserve a **sampled scalar temperature limit**. This conditional statement is stronger than the empirical observation that a policy happened not to overheat in simulation. It is also much narrower than physical robot safety, fault prevention, or thermal-runaway prevention.

Let x = T − T_ambient, x_next = a x + b u² + w. Use one declared sample duration. The simple endpoint formula requires x ≥ 0, 0 ≤ a ≤ a_max < 1, b ≥ 0, and bounded w. If those sign restrictions are absent, use interval products over every endpoint combination. In particular, multiplying a negative lower state by a_min need not produce the lower endpoint. Do not clamp negative lower bounds to zero without declaring and establishing nonnegative physical state as part of the model contract.

With nonnegative state, an upper transition is F(U,u) = a_max U + b_max u² + w_max. The command u must represent bounded applied heat-producing effort, such as normalized RMS current under a specified drive contract. Requested speed, joint position, signed supply-voltage deviation, and normalized task demand are not automatically equivalent to u. Gravity compensation, holding torque, friction, efficiency, regenerative operation, fan behavior, and temperature-dependent resistance can invalidate a simple mapping. Current feedback and independent calibration are required before adapting this to hardware.

## Observer and startup

The measurement equation must specify whether noise occurs before or after clipping. Two physically distinct examples are y = min(T + v, C) and y = min(T, C) + v, |v| ≤ epsilon. Under the first, y < C supplies a two-sided interval [y − epsilon, y + epsilon]; y = C supplies only T ≥ C − epsilon. Under the second, readings near C require considering the union of clipped and unclipped possibilities unless a reliable clip indicator is supplied. The paper's 95.2 °C maximum does not establish either complete acquisition model. State the simulation's choice explicitly.

Intersect a valid prediction interval with the measurement-consistent set. Missing samples supply no new measurement restriction. A clipped sample can raise the lower bound but cannot by itself create or reduce a finite upper bound. An empty intersection is an observable contradiction: invalidate the contract instead of silently resetting the observer. Preserve the reason and the last valid interval separately from any diagnostic estimate.

Startup needs an independently justified finite upper bound. A clipped first reading without such a bound implies an unbounded consistent upper temperature. A controller may issue zero effort and report unavailable assurance, but cannot claim the present state or pending commands are safe. A convenient simulation initial bound is an experimental assumption, not something inferred from the source dataset.

Fixed ambient temperature is another contract term. If ambient can change, the change in ambient must enter the disturbance model with a verified bound, or ambient must be a measured interval state. A surface sensor does not bound an unmeasured winding hotspot without a justified spatial thermal model or calibrated offset.

## Queue semantics and terminal condition

Define the order of one sample precisely: receive timestamped measurement and accepted-action metadata, form posterior interval, evaluate the existing ordered FIFO followed by the proposed action, accept the action, and apply the oldest queued action for the next transition. Any alternative convention is acceptable if the simulator, proof, tests, and diagrams use it consistently. Delay zero and delay one are essential boundary tests. A stop request does not cancel existing FIFO entries unless cancellation is an explicit acknowledged actuator capability.

For candidate u, propagate F through **every** pending command and then u. Every predicted upper state, including the current state, must be within L = T_limit − T_ambient. After the proposed action, assume newly submitted actions are zero. The conservative zero-input equilibrium is E0 = w_max / (1 − a_max). For this scalar monotone contract, the sufficient terminal condition is max(U_terminal, E0) ≤ L. The upper cooling sequence is bounded by that maximum. Merely checking one additional zero-input step is not a proof of indefinite safety. If E0 > L, eventual zero-input cooling is not recoverable under the bound even when the first few predictions lie below L. If a_max ≥ 1, this formula is inapplicable and the current certificate should be unavailable.

The terminal condition provides a feasible future fallback. At the next sample, a consistent measurement intersection cannot enlarge the interval, and accepting another candidate requires rechecking its own fallback. This supplies a recursive argument only when every action previously admitted follows the same contract and the initial queue is recoverable. A queue preloaded with unsafe actions may already make a violation unavoidable. In that case zero effort is a fallback request, not a retroactive guarantee.

Distinguish these status reasons: valid and admitted; valid but demand reduced; valid model with no recoverable action; unavailable initial bound; inconsistent observation; invalid or unknown actuator history; invalid model configuration. Do not call all of these a detected physical fault. Many parameter-bound violations are unobservable from a clipped output: a residual check cannot establish that hidden assumptions continue to hold.

## Scope that must remain explicit

- The theorem is conditional on bounded uncertainty; a confidence interval estimated from finite data is not a deterministic physical bound.
- Integer samples do not bound intersample peaks unless a continuous-time envelope is also supplied.
- A one-state simulation does not bound winding hotspots, multiple coupled joints, electrical faults, torque requirements, or mechanical stopping distance.
- Zero commanded effort may remove holding torque from a robot joint. Physical execution must use a validated braking and motion supervisor; the thermal simulator is not that supervisor.
- A random-seed suite can falsify the model implementation. It cannot prove the plant model or establish universal hardware safety.
- Delivered normalized effort is a control-availability proxy, not demonstrated robot throughput, energy efficiency, remaining useful life, or reduced failure rate.

## Existing techniques and novelty pressure

The components are established. ABB documents both estimated motor thermal protection and winding-sensor monitoring, including model initialization assumptions. [ABB ACS880-M04 firmware manual, motor thermal protection](https://library.e.abb.com/public/7aeb7ba80e684f11af1ba7673e8b9dc7/EN_ACS880-M04_FW_A_A4.pdf).

Reference governors for delayed systems and invariant-set constraint enforcement predate this work. [Nicotra, Nguyen, Garone and Kolmanovsky, 2017 preprint](https://arxiv.org/abs/1712.08248). Saturated measurements, bounded noise, delays, and set-membership estimation have also been studied together in other system classes. [Hu, Yang and Du, 2020](https://ietresearch.onlinelibrary.wiley.com/doi/10.1049/iet-cta.2020.0219).

Therefore, “thermal model + clipped sensor + predictive derating + delay awareness” is not an adequate unqualified novelty claim. The plausible research contribution is a transparent, falsifiable integration for a specific acquisition and command-acceptance interface, with an explicit status for lost assurance. A narrower patent candidate would require a claim-by-claim comparison showing a concrete technical distinction that existing interval observers, reference governors, and thermal controllers do not already teach. An implementation label, a FIFO data structure, or a standard zero fallback alone does not establish such a distinction.

## Recommended next evidence

First verify the software against the authoritative `EXPERIMENT_PROTOCOL.md` and consider the broader future checklist in `validation_protocol.md`. Then measure motor current, drive acceptance time, actual actuation time, ambient and independent winding/reference temperatures on a bench with independent protective cutoffs. Identify uncertainty bounds on disjoint operating runs and challenge them under altered cooling and load. Hardware identification, assurance of the command interface, and a dedicated prior-art claim analysis are the main unresolved steps.

## Source inspection addendum

Inspected `src/governor.py`, `run_experiments.py`, `config/experiment.json`, the original 12 structural tests, and the frozen experiment protocol, then reinspected the corrected source and 15-test suite. This addendum reports source observations, not independently reproduced main-run outcomes.

The source enforces the nonnegative parameter assumptions and a_max < 1 in `Model`, and rejects a zero-input equilibrium above the limit. The observer explicitly uses noise before clipping, retains the predicted upper bound at clipping, ignores missing observations, and latches invalidity after an empty intersection. The full controller propagates through the supplied pending sequence and the candidate, with a constructor-established invariant zero-input tail. These choices agree with the sufficient scalar argument above. The initial interval is supplied, not inferred from clipped data.

The evaluation constructs independent controller instances and closed-loop states on common exogenous scenario/seed traces. Hidden x, a, b, w and violation switches are held in the evaluator. The controller receives neither hidden true temperature nor future exogenous arrays. `advance(expected)` deliberately reports the expected effort rather than true effort in the mismatch scenario; that is an intentionally broken acknowledgement assumption, not a test of a deployed network. The raw result fields preserve separate actual and acknowledged values.

The benchmark contains a conservative robust fixed cap in addition to the threshold policy, nominal predictive queue policy, queue ablation, and full policy. These are fixed benchmark choices; no tuned best-in-class claim is warranted. All share interval-consistency invalidation, so the threshold comparator is a guarded heuristic, not the source manuscript's entire FDIR ladder. Its 93/88 °C stop/restart behavior and missing-sample stop are selected benchmark rules. In the corrected source, the nominal comparator preserves the greater of its predicted point state and the clipped reading when censoring occurs; uncensored data resets its point state to the measured rise. This gives the comparator a meaningful continuation beyond the clip ceiling while remaining a nominal point estimate.

The software is a synchronous simulator with a trusted exact queue argument. It does not verify command identity across calls, wall-clock age, network authentication, arrival order, duplication, or acceptance/actuation correspondence. The `decision_id` field is a monotonically increasing counter; alone it does not consume a certificate or reject replay. Any claims about one-use certificate enforcement must correspond to an additional consumer check; the inspected source does not provide one.

Three concrete items were sent to the implementing author and corrected in the reinspected source: preserve all configured model settings in the nominal comparator through `dataclasses.replace`; quantize demand-limited commands as well as temperature-limited commands; and describe the calculation as per-step feasibility rather than replay enforcement. The raw log now records the pre-decision pending queue, the decision counter, and cumulative effort. The suite adds queue overflow, non-grid demand, and nondefault nominal-model checks. The nominal clipped-state update was also strengthened during review. The release should record these changes and associated reruns without silently rewriting the frozen experimental hypotheses.

The present test suite and benchmark cover a subset of the broader `validation_protocol.md` checklist. The authoritative executed plan is `EXPERIMENT_PROTOCOL.md` with its disclosed `PROTOCOL_AMENDMENT.md`; do not imply that stale timestamps, authenticated acknowledgement failures, replay, every dynamic uncertainty corner, or hardware failures were tested. The amendment explicitly retains the first run as a pilot, records the strengthened nominal baseline, and uses fresh seeds 2000–2019 for final evaluation. It was recorded before the final run. The benchmark uses 20 seeds, five policies, nine scenarios and 900 sample transitions; the stochastic ensemble is illustrative and does not estimate industrial reliability. The inspected test log reports 15 tests passing. This reviewer inspected the test definitions and result log, rather than running a separate redundant copy of the suite.
