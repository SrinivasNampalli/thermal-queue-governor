# Full engineering and patent review dossier

## Outcome and release status
The scalar interval thermal governor is implemented and tested. In the primary valid-model suite it has zero sampled-limit breaches in 120 episodes and delivers 90.4% of requested normalized effort, versus 67.1% for a robust constant cap that also has zero breaches. Fifteen boundary tests pass. These are synthetic model results.

The proposed broad invention framing has substantial prior-art overlap. Narrow patentability, actual human conception and ownership are unresolved. No application has been submitted. A false applied-action report can invalidate containment while the local validity flag remains true; the flag is not evidence that external assumptions hold.

Editable originals, source/config snapshots, completed raw data and reproducibility instructions are in PROJECT.zip. The study, numbered embodiment and plain-language guide are also available as separate PDFs.

## Document inventory
Application-style discussion components: numbered technical disclosure, 148-word abstract, 11 discussion claims, and two explanatory vector figures. Each requires practitioner and inventor review before any filing decision.

Internal records: source-paper audit, screening, prior-art challenge/search log, experiments and amendments, requirements, evidence/contribution/disclosure ledgers, independent AI reviews, and filing-readiness notes. Internal materials are not automatically proposed patent-office submissions.



# 1. Research study
# Thermal Limits Under Clipped Sensing and Delayed Actuation

## Abstract
A clipped temperature reading does not identify the remaining thermal headroom, and a newly requested derating action may execute after previously accepted commands. This study implements a scalar interval thermal governor that intersects censored measurements with a predicted state interval, evaluates the complete accepted-command queue, and selects a bounded effort whose trajectory admits a zero-input continuation. A conditional sampled-state argument and reproducible synthetic experiments examine the roles of uncertainty and queue accounting. In the primary evaluation, the governor produced no limit breaches or state-containment failures in 120 valid-model episodes, while delivering 90.4% of requested normalized effort on average. A robust constant cap also produced no breaches and delivered 67.1%. A separate clipped-value ablation breached in 28 of 40 episodes. Deliberately incorrect model or applied-action information invalidated containment. These are simulation findings for selected parameters, not motor measurements. Closely related estimation, governor and thermal-control literature prevents a broad novelty claim.

## 1. Motivation and relationship to the source
The supplied manuscript connects sensor-based anomaly screening to FDIR but identifies the FDIR component as a deployment blueprint. It already describes a temperature front-end that clips near 95 C and a persistent high-temperature response. Those ideas are background, not new contributions of this study. The present question is narrower: can an explicitly bounded scalar thermal state and an exact accepted-command queue support a checkable admission decision when temperature information is censored? [1]

A temperature displayed at its measurement ceiling may correspond to a range of hotter states. A command requesting zero effort does not erase commands already accepted by a delayed actuator. Combining these observations suggests evaluating the temperature interval through that queue before admitting another action. The provided paper does not supply a calibrated thermal model, current/effort history or measured queue semantics; this work therefore uses a separate synthetic embodiment.

Source integrity also matters. The provided paper's Figure 6 and Tables II/IV disagree on discrimination scores and confusion counts. This study does not reproduce or rely on those classification results. The discrepancy, source-page locations, and independent public-repository access are recorded in the source audit.

## 2. Related work and contribution boundary
Bounded state estimation with saturated sensors is established [2]. An interval-estimation command governor for delayed robot control is particularly close to the general architecture [3]. Work on application-level acknowledgments represents still-applicable command histories and fallback inputs [4]. Predictive safety filters check candidate commands through a backup trajectory to a terminal set [5]. Thermal model-based power limiting is also disclosed in motor-control patents [6].

The contribution here is an inspectable scalar implementation, a clear information contract, and experiments separating queue omission from ceiling-as-exact estimation. It is not a new general theory of interval observers, reference governors or thermal protection. The inspected sources did not settle whether a very narrow claim could be distinguished, and predictable combinations present substantial obviousness risk. The accompanying claims are discussion material, not a recommendation to file.

## 3. Model and available information
A sample represents one second. Temperature rise x above fixed ambient T_a obeys

`x_next = a x + b u^2 + w`.

Effort u is dimensionless and bounded between zero and one. It represents heat-producing applied effort, such as appropriately normalized current in a justified model, not simply requested speed or supply voltage. a is dimensionless; b and w contribute C of rise per sample. The implementation assumes x>=0, 0<=a_min<=a<=a_max<1, nonnegative b and w, and known finite initial rise bounds.

All numerical values are selected: T_a=25 C, displayed ceiling C=95 C, protected scalar limit=105 C, sensor error magnitude<=0.3 C, a in [0.985,0.995], b in [0.55,0.95], w in [0,0.04], and effort lattice spacing 0.05. The startup rise interval is [30,75] C except a hot-start case with [68,75] C. No value was identified from the paper's measurements. The model permits bounded coefficient variation; most experiments hold a,b fixed within an episode and vary w each step.

The sensor model is y=min(T_a+x+v,C), where |v|<=epsilon, with noise preceding clipping. An unsaturated reading defines a finite interval around y-T_a; a clipped reading defines [C-T_a-epsilon,infinity). Missing readings supply no new constraint. A finite upper bound must therefore originate in commissioning and model propagation.

At each decision the controller receives the current reading or missing marker, requested effort, and all accepted pending FIFO commands. After application it receives an asserted applied effort. These interface values are assumed accurate for the conditional result. Hidden true temperature, future disturbance and evaluation labels are never inputs to the controller.

[[FIGURE:architecture]]

## 4. Admission rule and conditional bound
For posterior rise interval [L,H], monotonicity gives

`L_next = a_min L + b_min u^2 + w_min`

`H_next = a_max H + b_max u^2 + w_max`.

Intersecting a prediction with a valid observation set preserves true-state containment. An empty intersection invalidates the controller rather than moving the estimate onto the reading. A missing reading retains the prediction.

Let R=T_limit-T_a. Starting at H, propagate the upper recurrence through each accepted queue entry. All prefix upper states must be at most R. From the final queued upper state z, the continuous candidate allowance is

`c = sqrt(max(0,(R-a_max z-w_max)/b_max))`.

The chosen effort is the largest lattice value no greater than min(request,c,1). Recompute its endpoint and confirm the finite-prefix bound. This is a closed-form one-command admission calculation, not an optimizer for an entire future task.

After the candidate, zero input is an admissible mathematical tail if a_max R+w_max<=R. Equivalently, w_max/(1-a_max)<=R. The constructor checks that inequality; each accepted endpoint lies within the invariant interval [0,R]. Induction over the exact FIFO then supplies a sampled-state bound under the contract. The reported peak covers the finite queue/candidate prefix; the invariant condition bounds the remaining tail.

Floating-point implementation uses small numerical tolerances rather than directed interval rounding. Real deployment would need a justified numerical margin as well as physical calibration. The code's invalid latch returns zero for future requested actions; it does not cancel the FIFO, prove an already invalid state safe, or secure a robot mechanically.

[[FIGURE:flow]]

## 5. Experimental method
The primary evaluation contains nine scenarios, 20 seeds per scenario, five policies and 900 transitions per episode: 900 episodes and 810,000 transitions. Six scenarios obey the model contract: zero delay, delays of eight and 20 samples, a 60-sample missing block with isolated losses, a finite-bounded clipped hot start, and the upper parameter corner with delay and missing data. Three scenarios challenge model coefficients, a stuck sensor and applied-command reporting.

Controllers are: a robust constant cap; a 93/88 C threshold hysteresis rule; a nominal midpoint-model queue-aware limiter; an interval governor omitting the queue; and the full interval queue governor. All share the same observation-consistency monitor and invalid-latch behavior. Within a scenario/seed, exogenous conditions are identical, but each controller generates its own state and observed readings. Future information is not supplied to a policy.

Thresholds and the candidate were fixed before evaluation. A retained pilot exposed a weak nominal clipping update; the final comparator preserves its propagated point estimate when the reading clips. That correction and fresh evaluation seeds 2000-2019 are documented in a pre-run amendment. The midpoint nominal model predicts a full-effort equilibrium below the selected limit, so it can continue full effort on hotter plants within the robust box. Its poor results illustrate model uncertainty, not a general failure of MPC.

The primary metrics are breach episodes, interval containment, maximum temperature and applied/requested effort sum. A ratio is a normalized thermal-work proxy, not production throughput, delivered torque or task completion. Twenty seeds per scenario are simulation repetitions of a synthetic distribution, not devices or field observations. Scenario means are reported without industrial-risk probability claims.

## 6. Primary results
Table1 summarizes the 120 valid-model episodes per controller. The complete per-scenario table, episodes, and raw steps are preserved with source/configuration hashes.

[[TABLE:primary]]

The full governor passes the selected gate: no breached sample, no interval miss and no invalid state in its 120 valid-model episodes (108,000 transitions). Its lowest scenario-average effort fraction is70.5% at the upper corner, above the prespecified 50% usefulness threshold. Its overall mean is90.4%, compared with 67.1% for the constant cap. This comparison is conditional on the chosen workload and box; it does not establish an optimal or universal gain.

The constant cap remains a serious simple alternative: it also avoids all breaches and has minimal interface/computation demands. The threshold controller is adequate in several scenarios but overshoots under the upper corner with a20-step queue. The queue-omitting interval policy can admit work that becomes infeasible before its stop command applies; its invalid latch then reduces later effort.

[[FIGURE:primary_results]]

## 7. Mechanism ablation and failed assumptions
A post-main ablation isolates clipping: retain the same robust box and queue-aware admission rule but incorrectly truncate the upper state to the sensor ceiling plus error. On fresh seeds 4000-4019, using delay20 and upper-corner scenarios, the full governor has 0/40 breach episodes; the ceiling-as-exact policy has 28/40, and the queue-omitting policy has 25/40. The exact-value policy's additional effort is obtained while its bound has already lost containment. This ablation supports the need for both modeled constraints in this chosen suite.

[[FIGURE:ablation]]

The original main actuator-mismatch scenario did not actually alter the full policy's applied action during its injection window. It supplies no full-policy mismatch evidence. A separate follow-up shifts the injection into a lower-demand period, uses fresh seeds 3000-3019, and forces actual effort above the reported value. The full controller then exhibits 317 interval-miss steps and 2350 invalid steps across 20 episodes, despite zero sampled limit breaches. Of those misses, 113 occur while the internal validity flag is still true. Zero breaches there do not validate the contract; containment has already failed, and the flag does not authenticate model or actuator assumptions.

Model and sensor violations in the main evaluation also produce lost containment and invalidity. The retained pilot includes a full-policy temperature breach under an out-of-box model; final fresh-seed model-violation episodes happen to show none. Neither outcome is a guarantee. Very high temperatures generated by nominal policies outside the model contract are mathematical model outputs beyond physical validation, not predictions of actual motor survival.

[[TABLE:followups]]

## 8. Limitations and next experiments
The protected state is a single scalar; it does not distinguish measured housing temperature from winding hotspots. Ambient is fixed, effort is known, thermal coefficients are assumed bounded and nonnegative, and pending commands are exactly known. Real sensors may have offset, lag, post-clipping noise, signed behavior or invalid readings not represented by the law. Real commands may be lost, reordered, changed by inner loops, or incorrectly acknowledged.

A zero-effort tail is a mathematical thermal fallback and may be unacceptable for a gravity-loaded robot joint. Braking, motion constraints, stored heat, secondary thermal states, and independent protection require separate analysis. The benchmark covers sample instants only. The upper-corner peak approaches 105 C without an engineering margin; real hardware must not reuse this numerical setting as a safe operating limit.

The next meaningful technical step is calibration plus held-out bench validation using an independent high-range reference temperature and measured applied effort/queue timing. A controls engineer should first determine whether a simpler cap, improved sensor or existing protective drive meets the actual need. The prototype does not establish that a customer needs a new product.

## 9. Reproducibility and status
The source, tests, JSON configurations, raw gzip CSV data, figures, amendments, source snapshots and execution metadata accompany this manuscript. Fifteen boundary tests pass. Final and post-main studies total 1120 completed episodes and 1,008,000 transitions; the 900-episode pilot is separately retained. One interrupted partial run is explicitly excluded from results.

Technical feasibility is demonstrated for this software model; physical validation is untested; broad patent framing has high prior-art overlap; narrow patentability is unresolved. Human conception, inventorship, ownership, jurisdiction and filing administration remain unresolved. No filing, publication submission or patent grant is represented by this manuscript.

## References
[1] Nampalli et al. Control-Aware Predictive Maintenance of Industrial Robot Motors Using Multi-Sensor Fusion and FDIR Integration. Supplied seven-page PDF; exact publication date unknown. Relevant pp. 4, 6; source audit records discrepancies.

[2] Yang and Li. Set-membership filtering for systems with sensor saturation. Automatica 45,1896-1902,2009. [Author PDF](https://people.brunel.ac.uk/~csstyyl/papers/auto2009.pdf).

[3] Shen et al. Constrained Control for Cloud Robotic Under Time Delay Based on Command Governor With Interval Estimation. IEEE Access 7,70999-71006,2019. [DOI](https://doi.org/10.1109/ACCESS.2019.2920017).

[4] Rosenthal, Noack and Hanebeck. State Estimation in Networked Control Systems with Delayed and Lossy Acknowledgments.2018. [Author PDF](https://isas.iar.kit.edu/pdf/LNEE18_Rosenthal.pdf).

[5] Wabersich and Zeilinger. A predictive safety filter for learning-based control of constrained nonlinear dynamical systems. Inspected 2021 version. [Paper record](https://arxiv.org/abs/1812.05506).

[6] US20120007532A1 / US8773058B2. Rotor temperature estimation and motor control torque limiting for vector-controlled AC induction motors. [Patent text](https://patents.google.com/patent/US8773058B2/en).



# 2. Technical disclosure
# Technical disclosure — scalar interval thermal governor with an exact pending-command queue

**Private working draft for technical review. No filing recommendation. Patentability is unresolved, with high overlap for broad formulations. No human inventor is assigned by this document.**

## Abstract

A discrete-time thermal governor maintains a finite interval for nonnegative temperature rise in a scalar model with bounded coefficients and disturbance. It intersects that interval with an observation set formed from a temperature sensor whose noise precedes upper clipping. A clipped observation supplies a lower constraint without imposing a finite measurement upper constraint. The governor predicts the upper temperature bound through an externally supplied exact FIFO of accepted pending efforts. It selects a requested-effort-limited grid action using the remaining thermal allowance and accepts the calculation only when the current state, queued transitions and candidate transition satisfy a temperature limit. A validated zero-input invariant set supplies the condition for an indefinite fallback tail. Invalid queue data, inconsistent observations and loss of this feasibility condition latch the governor invalid. An externally asserted applied effort advances the interval. The implementation is a synthetic scalar demonstrator with no hardware or network protocol.

## Field, purpose, and status

[0001] This disclosure concerns a numerical governor for choosing normalized effort in a discrete-time scalar thermal model. The delivered embodiment is the `interval_queue` policy in `src/governor.py`, exercised by `run_experiments.py`. The code uses Python standard-library arithmetic and synthetic data. A decision is a per-step calculation, not a network authorization lease, an authenticated message, or a hardware safety certification.

[0002] The motivating error is to reduce effort based only on a sensor value or a newly proposed command while accepted prior commands remain pending. Clipping also prevents the displayed upper-limit value from establishing an upper bound on the protected state. The supplied research paper already discloses clipped high-temperature evidence and FDIR intervention; those premises are background. The present draft describes this implementation without asserting that combining its techniques is new.

[0003] The only safety statement developed here is conditional satisfaction of a scalar sampled-state inequality under explicit model, initialization, observation and command assumptions. The code does not identify thermal parameters, acquire real sensors, authenticate acknowledgments, detect every contract violation, model intermediate temperatures between sample instants, or model a hidden winding hotspot distinct from the scalar state. Human inventorship, entitlement and any filing decision remain unassigned and unresolved.

## State and model

[0004] Let `k` count discrete model steps. Let `T_a` be a fixed ambient temperature in degrees Celsius, `x_k = T_k - T_a` be nonnegative temperature rise in degrees Celsius, and `u_k` be a dimensionless applied effort in `[0,1]`. The modeled state transition is

`x_(k+1) = a_k x_k + b_k u_k^2 + w_k`.

The dimensionless retained-rise coefficient `a_k` lies in `[a_min,a_max]`; `b_k` lies in `[b_min,b_max]` and denotes temperature-rise contribution per model transition at unit effort; `w_k` lies in `[w_min,w_max]` and denotes additive rise per model transition. The simulation assigns one second per transition, as specified in the experiment protocol. The constants are illustrative and must be reidentified for different real sampling intervals.

[0005] The model permits arbitrary coefficient/disturbance values inside these intervals at each transition. The simulator normally samples `a` and `b` once per episode and `w` at each step; this simulator choice is a subset of the bounded model assumption. Coefficient correlations are not exploited. For `x>=0` and `u>=0`, monotonicity gives the bounding transition

`L_next = a_min L + b_min u^2 + w_min`,

`H_next = a_max H + b_max u^2 + w_max`.

These equations are `propagate`. They are exact extrema of the stated rectangular parameter/state bounds in real arithmetic. The implementation uses ordinary floating-point arithmetic and tolerances, not directed-rounding interval arithmetic or a verified floating-point proof.

[0006] `Model.__post_init__` requires every model field to be finite; `0<=a_min<=a_max<1`; `0<=b_min<=b_max` with `b_max>0`; `0<=w_min<=w_max`; `T_a<C<T_limit`; nonnegative observation error bound `epsilon`; and an action-grid step `Delta` in `(0,1]`. Define the allowed rise `R=T_limit-T_a`. It additionally requires `w_max/(1-a_max)<=R`, which is used for the zero-input tail in [0017]. An invalid model raises `ValueError` before the governor is constructed.

[0007] Construction requires a commissioned interval `[L_0,H_0]` satisfying `0<=L_0<=H_0<infinity`. The code accepts this interval as an externally supplied assumption; it does not establish it from a clipped reading. Its validity means that the true initial scalar state lies within the interval. The constructor does not require `H_0<=R`; a subsequent observation can narrow the interval, but a decision whose resulting upper bound is above the limit cannot receive the described feasibility result.

## Observation processing

[0008] The sensor assumption is `y_k = min(T_a+x_k+v_k,C)` with `|v_k|<=epsilon`. Noise is applied **before** clipping. There is only an upper clipping operation. The `None` value represents an absent observation. A clipping level, error bound and ambient value have the same temperature units as the displayed reading.

[0009] For an unsaturated observation, the measurement-consistent rise interval is `[y_k-T_a-epsilon, y_k-T_a+epsilon]`. For an observation at the upper clipping level, it is the half-line `[C-T_a-epsilon,infinity)`. The latter adds no finite upper constraint. For a missing observation there is no measurement intersection, and the prior prediction interval is retained.

[0010] `intersect_reading` intersects the prior `[L,H]` with the applicable observation set and with the nonnegative state domain. In exact notation, `L_post=max(L,0,y-T_a-epsilon)` and `H_post=min(H,U_y)`, where `U_y=y-T_a+epsilon` if unsaturated and `U_y=infinity` if clipped. An empty intersection raises `ValueError`; the caller latches the governor invalid. The code does not rebase its state to an inconsistent reading. It classifies readings within `1e-9` of `C` as clipped, rejects nonfinite packets and readings more than `1e-9` above `C`, and tolerates a corresponding small interval overlap discrepancy. Those tolerances qualify strict arithmetic statements in this draft.

## Queue contract and candidate selection

[0011] At a decision, `pending` is an externally supplied exact FIFO `q=(q_0,...,q_(d-1))` containing all accepted commands that will execute before the new candidate. `q_0` is the next applied command. The delivered contract is synchronous and known; the code does not infer FIFO contents from packet histories. Empty `pending` means the candidate can apply on the current transition. The caller must preserve the ordering and inclusion of all committed commands.

[0012] `Governor.decide` requires finite demand `r` in `[0,1]`; invalid demand raises `ValueError`. It validates that the queue has at most 120 entries and that each entry is finite and in `[0,1]`. An invalid queue latches the instance invalid. These shape and range checks cannot establish that the queue corresponds to the real or simulated actuator.

[0013] For a posterior upper rise bound `H`, the governor sets `z_0=H` and propagates through every pending command:

`z_(j+1)=a_max z_j+b_max q_j^2+w_max`, for `j=0,...,d-1`.

It retains `P_q=max(z_0,...,z_d)`. A candidate calculation fails if `P_q>R`. It is insufficient to inspect only the last queued state because any earlier transition could already exceed the limit. The code uses a comparison tolerance of `1e-9`.

[0014] When the queue prefix passes, the largest continuous candidate under the final transition bound is computed from

`c = sqrt(max(0,(R-a_max z_d-w_max)/b_max))`.

The requested candidate is restricted to `[0,min(r,c,1)]`. Under the validated zero-input inequality and `z_d<=R`, the square-root numerator is nonnegative in exact arithmetic, so a zero candidate is feasible. The `max(0,...)` also guards numerical or boundary conditions.

[0015] The delivered governor chooses an action on the uniform nonnegative lattice `j Delta` by

`u_star = Delta floor(min(r,c,1)/Delta)`.

The code adds `1e-12` to the floor argument’s numerator to handle representational error and clips negative outcomes to zero. It then recomputes `z_(d+1)=a_max z_d+b_max u_star^2+w_max`. The calculation returns true only if `max(P_q,z_(d+1))<=R` within the implementation tolerance. In exact arithmetic this is the largest grid member that satisfies demand, unit-effort and one-candidate bounds after the fixed queue. It is not an optimization of a multi-action future work schedule.

[0016] `admissible` returns the chosen action, the largest upper state over the current/queue/candidate prefix, and a feasibility Boolean. This returned `peak` concerns the **finite prefix**. It is not necessarily the maximum of the infinite zero-input tail when the terminal state is below its equilibrium. The terminal condition in [0017], rather than the displayed `peak` alone, supplies the tail statement.

[0017] After the queued prefix and candidate, consider applying zero at every subsequent transition. The set `[0,R]` is invariant because the lower transition remains nonnegative and `a_max R+w_max<=R`. This is equivalent to the constructor’s `w_max/(1-a_max)<=R` condition. For any terminal upper state `h<=R`, successive zero-input upper predictions are `a_max^n h + w_max(1-a_max^n)/(1-a_max)`, all at most `R`. This tail does not assume that zero cancels the pending FIFO; zero follows all already accepted commands and the candidate.

## State advancement, failures and recovery

[0018] For `interval_queue`, `Governor.decide` invokes `admissible(H,pending,r,model)`. If feasibility fails, it sets `valid=False`, stores the reason `no queued fallback certificate`, and returns zero requested action. That zero is a fail-closed output from the calculation; it does not itself establish that the present plant or pending queue is safe. A preexisting infeasible queue cannot be undone by appending zero.

[0019] Invalid queue data, inconsistent or invalid observations, a failed queue/candidate calculation, and invalid applied-effort acknowledgment can latch invalidity. Once `valid` is false, later decisions return zero and the stored reason without accepting later observations to restore validity. The code has no recovery method or automatic rebase. Operational reuse requires a new instance, a newly justified finite commissioning interval, and a re-established model/queue/applied-action contract; that commissioning process is external to the delivered code. Invalid demand is handled differently: it raises an exception rather than latching the instance.

[0020] `Governor.advance(acknowledged_applied)` receives an **externally asserted** applied scalar effort. A finite value in `[0,1]` advances both bounds using [0005]. A nonfinite or out-of-range value latches the governor invalid with reason `invalid acknowledgment` and returns without propagation. The code neither authenticates this assertion nor compares it with a physical measurement or the formerly supplied FIFO. “Acknowledged” in the variable name supplies no independent evidence of execution. Even an invalid instance can be propagated by a later valid call to `advance`; propagation does not clear its invalid latch.

[0021] A `decision_id` integer increments at the start of each `decide` call, including calls that later raise an invalid-demand exception. Returned decisions include the identifier, action, validity, reason, finite-prefix peak and posterior interval. The experiment runner logs identifiers. There is no decision-consumption table, replay rejection, message authentication, wall-clock expiration or enforceable one-use token.

## Conditional argument and simulator interface

[0022] If the true state begins in the commissioned interval, the model coefficients/disturbance stay within their bounds, and each observation satisfies [0008], [0005] and [0010] preserve state containment at each update. If the FIFO and the value passed to `advance` also describe the actual applied sequence, monotonicity makes each `z_j` an upper bound on the corresponding future sampled state. The prefix checks followed by [0017] give the conditional sampled-temperature result for that decision. Repeated decisions preserve it when each newly accepted action is appended in the assumed order and the contract continues to hold. This is a mathematical model argument; the implementation’s finite precision remains subject to [0005]/[0010].

[0023] `run_experiments.py` implements an exact simulated FIFO. For nonzero delay it passes a copy of `q` to `decide`, pops the first entry as expected applied effort, appends the returned action, propagates the synthetic plant and passes expected effort to `advance`. With zero delay, the new action is the expected applied effort. The runner supplies the actual generated reading or `None`; no future disturbances or noise are passed to the policy.

[0024] The runner includes explicit out-of-contract experiments. `queue_mismatch` makes actual effort differ from the reported/expected effort during a selected interval; `model_violation` changes plant parameters outside the assumed box; `stuck_low` supplies an observation inconsistent with the nominal sensor law. These exercises do not constitute implementations that identify or repair those failures. Baseline policies `fixed_cap`, `threshold`, `nominal_queue` and `interval_no_queue` are comparators; a separately specified `interval_exact_clip` ablation deliberately tightens a clipped upper bound incorrectly. The interval/queue claim discussion addresses `interval_queue` only. A follow-up acknowledgment-mismatch experiment does not restore the contractual argument when state containment fails, even if no sampled temperature breach happens in that run.

## Worked analytical example — not an experimental result

[0025] Take `T_a=25 °C`, `C=95 °C`, `T_limit=105 °C`, `epsilon=0.3 °C`, `a_max=0.995`, `b_max=0.95 °C`, `w_max=0.04 °C`, and `Delta=0.05`. Thus `R=80 °C` of rise and the zero-input upper equilibrium is `0.04/(1-0.995)=8 °C` of rise. The other model bounds may be `a_min=0.985`, `b_min=0.55` and `w_min=0`. These are demonstration constants, not identified motor parameters or recommended hardware thresholds.

[0026] A prior rise interval `[60,78]` and clipped reading `95 °C` yield `[69.7,78]` by [0010]. The upper limit remains `78 °C` of rise, or `103 °C` absolute. It does not become `95 °C` absolute. Suppose three pending commands are each one and the requested effort is one. Upper predictions are `z_0=78`, `z_1=78.6`, `z_2=79.197` and `z_3=79.791015`.

[0027] The next-command allowance is `c=sqrt((80-0.995*79.791015-0.04)/0.95)`, approximately `0.7732`. Downward grid selection gives `u_star=0.75`, and the candidate upper state is `79.966434925 °C` of rise, or approximately `104.9664 °C` absolute. It is within the limit, and the subsequent zero tail satisfies [0017]. If a fourth full-effort command were already pending, its upper prediction would be `80.382059925`, which is above `R`; the queue prefix would fail before a newly appended candidate could fix it. These values are direct arithmetic, distinct from any reported experiment table.

## Figures and descriptions

[0028] **FIG. 1 — block diagram.** Sensor block **100** maps scalar plant temperature and bounded pre-clipping noise to a reading or missing-value marker. Observer **110** holds the finite rise interval and performs measurement intersection and applied-effort propagation. Queue block **120** supplies the exact accepted FIFO. Governor **130** receives the interval, FIFO and requested effort, and computes a candidate plus validity and finite-prefix peak. Adapter **140** receives the candidate, executes the existing FIFO ordering and externally supplies the applied-effort assertion. Plant **150** evolves the scalar state. Draw arrows `150 -> 100 -> 110 -> 130 -> 140 -> 150`, `140 -> 120 -> 130`, and `140 -> 110` labeled “asserted applied effort.” Identify 100, 120, 140 and 150 as simulated/external-contract components in the delivered embodiment.

[0029] **FIG. 2 — decision flow.** Start with the commissioned model/interval. Validate demand and queue. If the instance is latched invalid, return invalid/zero. Otherwise intersect a present reading or retain the interval when missing. If inconsistent, latch invalid/zero. Predict upper states through the whole pending FIFO and reject an over-limit prefix. Compute the candidate allowance, round downward to the action grid, recompute the candidate end state and apply the prefix plus zero-terminal checks. Return the result; after the adapter’s applied-effort assertion, advance the interval for the next iteration. A separate arrow marks invalid acknowledgments as latching invalidity. Do not draw a zero-output arrow that skips or clears the FIFO.

## Unimplemented alternatives

[0030] **Alternative A: multiple thermal states.** An extension could replace scalar rise by a vector of nonnegative rises for winding and housing, with `x_next=A x+B u^2+w`, nonnegative interval-bounded matrices, and a sensor row `s` measuring `T_a+s x` before noise and clipping. A finite commissioned state set would be intersected with the corresponding slab or clipped half-space; a box representation would require a conservative outer approximation of that intersection. Queue predictions would propagate a valid set for every state component. A terminal box `[0,r]` would require a componentwise inequality `A_max r+w_max<=r` under zero input, with the protected components restricted by their own thermal limits. This alternative requires a calibrated model, an appropriate representation for coupled measurement constraints, and new tests. It is not implemented or validated in the delivered source.

[0031] **Alternative B: uncertain accepted-command histories.** An extension could replace the exact FIFO with a finite set of admissible queued/applied histories under explicit bounded delay and loss assumptions. Each history would have its own compatible state set, updated only by reports whose semantics identify a utilized sequence or applied transition. A proposed candidate would require a valid prefix and terminal condition for every remaining history; incompatible reports, unbounded uncertainty or an infeasible branch would prevent certification. Merging histories would need an enclosing set so that no potentially hot branch is discarded. This changes both memory/computation and the adapter contract. The delivered source has a single exact FIFO and a scalar asserted applied value; it implements none of this history inference, report validation or branch management.

## Review boundary

[0032] The research evidence is in `research/prior_art_challenge.md`, references R1–R7 and P1–P4, with exact search/access records in `research/search_log.json`. R1–R4 are the nearest estimation/governor/queue/fallback challenges; P1 and R5 challenge the thermal-control setting. They are cited here by identifier to avoid repeating their summaries. The separate claim discussion supplies an internal limitation-to-paragraph/code/test matrix. Neither the description nor its alternatives establish patentability, legal inventorship, deployment readiness, or a recommendation to file.



# 3. Discussion claims and support
# Internal claim discussion and support review

**Draft for challenge by a qualified patent practitioner. No filing recommendation. Broad novelty is a no-go on the present evidence; the narrower combination remains unestablished. No human inventor is assigned.**

These discussion claims describe the `interval_queue` demonstrator. They are not filed claims, an assertion of enforceable scope, or a patentability opinion. The accompanying disclosure’s paragraph numbers refer to `docs/TECHNICAL_DISCLOSURE.md`. Neither clipping-aware FDIR from the supplied paper nor any known component technique is asserted to be new. “Acknowledgment” means an externally asserted applied scalar in this code, with no authentication or independent execution verification.

## Discussion claims

**1.** A computer-implemented method for selecting a normalized effort in a discrete-time scalar thermal model, the method comprising:

(a) obtaining a model of nonnegative temperature rise `x` above a fixed ambient temperature, the model having transition `x_next=a x+b u^2+w`, with applied effort `u` in `[0,1]`, bounded coefficients satisfying `0<=a_min<=a_max<1`, `0<=b_min<=b_max` and `b_max>0`, and bounded additive disturbance satisfying `0<=w_min<=w_max`, and defining an allowable rise `R` from a temperature limit minus the ambient temperature;

(b) initializing a maintained state interval `[L,H]` from an externally supplied finite commissioning bound containing the modeled initial state;

(c) receiving a temperature observation governed by an upper-clipping sensor model and, when the observation is present, intersecting the maintained interval with a nonnegative measurement-consistent set, the set for a clipped observation having an unbounded upper endpoint;

(d) obtaining a requested effort in `[0,1]` and an externally supplied exact ordered FIFO of accepted pending efforts that are to apply before a newly selected effort;

(e) propagating an upper state bound from the intersected interval through each pending effort using `z_next=a_max z+b_max u^2+w_max`, while retaining bounds for the current state and every pending transition;

(f) when every retained bound satisfies `R`, selecting a nonnegative effort from a uniform effort grid, no greater than the requested effort, whose predicted transition following the entire FIFO also satisfies `R`;

(g) accepting the resulting prefix feasibility calculation subject to a validated condition that the interval `[0,R]` is invariant for the model under zero effort after the FIFO and the selected effort;

(h) latching an invalid state and returning zero selected effort upon an invalid queue, an invalid or inconsistent observation, or a failure of the prefix feasibility calculation; and

(i) advancing the maintained interval for the next decision using an externally asserted applied effort and the model’s lower and upper bounding transitions.

**2.** The method of claim 1, wherein the observation model is `y=min(T_a+x+v,C)`, with `|v|<=epsilon` and noise preceding clipping, and wherein an unsaturated observation supplies the interval `[y-T_a-epsilon,y-T_a+epsilon]`, while an observation at `C` supplies the half-line `[C-T_a-epsilon,infinity)`.

**3.** The method of claim 1, wherein an absent observation leaves the prior maintained interval unchanged by measurement processing, and a clipped observation does not replace a previously finite model-derived upper bound with the clipping level.

**4.** The method of claim 1, wherein advancing the maintained interval for an asserted applied effort `u` comprises calculating `L_next=a_min L+b_min u^2+w_min` and `H_next=a_max H+b_max u^2+w_max`.

**5.** The method of claim 1, wherein the FIFO includes the next effort to be applied and every accepted effort preceding the newly selected effort, and wherein failure is determined from the maximum of the current upper state and each successive queued upper state, without assuming that returning zero cancels a pending effort.

**6.** The method of claim 1, wherein, for upper state `z_d` after the FIFO and grid spacing `Delta`, selecting comprises calculating `c=sqrt(max(0,(R-a_max z_d-w_max)/b_max))`, choosing the downward grid value `Delta floor(min(requested,c,1)/Delta)`, and recomputing the upper state of its transition to verify the limit.

**7.** The method of claim 1, wherein the validated zero-effort condition is `w_max/(1-a_max)<=R`, so that any end-of-prefix upper state at most `R` remains bounded by `R` for an indefinite sequence of zero efforts in the stated model.

**8.** The method of claim 1, wherein initialization rejects a commissioning interval without a finite ordered nonnegative upper/lower pair, and model construction rejects a coefficient set that fails the zero-effort condition, before issuing a valid feasibility calculation.

**9.** The method of claim 1, wherein an invalid queue includes a queue exceeding 120 efforts, a nonfinite effort, or an effort outside `[0,1]`, and wherein such invalidity is latched before observation processing.

**10.** The method of claim 1, wherein, after the invalid state is latched, subsequent decisions from the same instance continue to return zero and invalid status without rebasing the interval from a later apparently consistent observation.

**11.** The method of claim 1, wherein an externally asserted applied effort that is nonfinite or outside `[0,1]` causes the invalid state to be latched and prevents that call from propagating the maintained interval, without treating range validation as authentication or evidence that the asserted effort actually applied.

## Construction and scope notes

The equations in claims 2 and 6 express the ideal arithmetic relationships. The current implementation uses the tolerances disclosed in [0010], [0013] and [0015]. It is not a directed-rounding implementation. A practitioner should decide whether to describe those numerical details explicitly or retain a mathematical formulation with an accurately limited implementation example. Do not claim a strict machine-arithmetic enclosure theorem from these tests.

Claim 1(b)’s containment condition is an external commissioning assumption. The constructor validates numerical shape and finiteness; it cannot check containment of an unknown physical temperature. Claim 1(d)’s exact FIFO condition and claim 1(i)’s asserted applied value likewise depend on the caller. Shape validation does not verify actuator execution. The latch is local software state, not a certified emergency stop.

The `decision_id` counter is disclosed for audit completeness but is omitted from the claims because it supplies no decision-consumption or replay protection. The code has no wall-clock expiry, network acknowledgment authentication, hardware interface, automatic recommissioning, or learned parameter identification. No claim covers the unimplemented alternatives [0030]–[0031].

## Existing test key and actual coverage

The identifiers below refer to the 15 existing test methods in `tests/test_governor.py`. This review lists their scope; execution results and experiment outputs are reported separately by the project. Passing tests provide examples and boundary checks, not exhaustive proof of all contracts.

| ID | Existing test method | Relevant scope and limit |
|---|---|---|
| T01 | `test_clipping_preserves_upper` | A clipped observation retains a finite upper bound and tightens the lower bound in one case. |
| T02 | `test_missing_is_prediction_only` | A missing reading leaves an existing interval unchanged. |
| T03 | `test_empty_intersection_rejects` | A strongly inconsistent reading raises an intersection error. |
| T04 | `test_clipped_unknown_start_rejected` | An infinite upper commissioning bound is rejected. |
| T05 | `test_invalid_model` | Rejects `a_max=1` and a zero-input-invariant violation; does not enumerate every malformed field. |
| T06 | `test_queue_changes_admissibility` | A hot queued prefix fails where an empty queue allows positive action. |
| T07 | `test_invalid_queue_latches` | A NaN queue effort causes invalidity that persists for a subsequent valid-shape queue. |
| T08 | `test_queue_overflow` | A queue of length 121 is rejected. |
| T09 | `test_requested_grid_quantization` | Demand `0.67` is rounded to `0.65` at default spacing. |
| T10 | `test_nondefault_nominal_parameters` | Comparator `nominal_queue` uses nondefault model parameters. This is not support for the claimed `interval_queue` guarantee. |
| T11 | `test_invalid_demand` | A NaN requested effort raises `ValueError`; this is an exception path, not the invalid latch. |
| T12 | `test_corners_contained` | Endpoint combinations for two states and three efforts are enclosed by `propagate`. |
| T13 | `test_zero_terminal_invariant` | Default model’s zero transition and equilibrium satisfy the terminal bound. |
| T14 | `test_upper_corner_closed_loop` | A 600-step upper-corner episode with a length-20 FIFO maintains validity, state containment and the sampled limit. |
| T15 | `test_inconsistent_packet_no_rebase` | Inconsistent reading produces zero/invalid instead of rebasing. |

No dedicated existing test checks invalid acknowledgment handling, all negative/out-of-range initialization cases, arbitrary grid spacing, every numerical clipping tolerance, or counter/replay behavior. Direct source support for a limitation must not be mislabeled as dedicated test coverage.

## Complete limitation support matrix

“FIG” identifies an authored vector figure in figures/architecture.svg or figures/flow.svg and its disclosure paragraph. “Nearest art” points to `research/prior_art_challenge.md`; it is a challenge reference, not an incorporation of missing disclosure. A test shown as partial does not independently establish the full row.

| Claim clause | Disclosure support | Delivered code support | FIG | Existing verification | Nearest art / review issue |
|---|---|---|---|---|---|
| 1 preamble: computed normalized-effort method | [0001], [0004], [0023] | `Governor.decide`; runner `main` | 1, [0028]; 2, [0029] | T14; runner source | R2; thermal context P1/R5 |
| 1(a): scalar state, fixed ambient, effort/parameter bounds and rise limit | [0004]–[0006] | `Model`; `Model.__post_init__`; `propagate`; `admissible` | 1: 110/130/150 | T05/T12/T13; fixed ambient comes from source | R1/R2; scalar thermal application not itself new |
| 1(b): finite commissioned state interval and containment assumption | [0007], [0022] | `Governor.__init__` | 2: initialization | T04; containment is assumed, not constructor-tested | R1 |
| 1(c): observation intersection, nonnegative state, no finite clipped measurement upper bound | [0008]–[0010] | `intersect_reading`; `Governor.decide` | 1: 100/110; 2: intersection | T01/T03/T15 | R1; supplied paper already discusses censoring |
| 1(d): bounded demand and exact FIFO before candidate | [0011]–[0012], [0023] | `Governor.decide`; `admissible`; runner `pending_before`, pop/append order | 1: 120/140; 2: validation | T06/T08/T11/T14; exactness is an external contract | R3 |
| 1(e): upper propagation through every pending transition and retained prefix | [0013] | `admissible`, `for u in pending` and `peak` | 2: queued prediction | T06/T14 | R2/R3 |
| 1(f): requested-effort-limited grid candidate after FIFO | [0014]–[0015] | `admissible`, `room`, `cap`, `action`, `end` | 2: candidate | T09/T14; exhaustive maximality not tested | R2; simple scalar solution alone is weak distinction |
| 1(g): prefix feasibility plus indefinite zero-tail condition | [0016]–[0017], [0022] | `Model.__post_init__`; final Boolean of `admissible` | 2: candidate and terminal test | T05/T13/T14 | R4 |
| 1(h): latch and zero on queue, observation or feasibility fault | [0018]–[0019] | `Governor.decide`, `valid`, `reason`, invalid return paths | 2: invalid branches | T03/T06/T07/T08/T15; T06 tests calculation, not latch | R2/R4; generic fail-closed behavior |
| 1(i): next-state update from externally asserted applied effort | [0005], [0020], [0023] | `Governor.advance`; runner `g.advance(expected)` | 1: 140 to 110; 2: advance | T12/T14; assertion truth is not verified | R3 |
| 2: noise-before-clipping law and both observation-set forms | [0008]–[0010] | `intersect_reading`; runner reading expression | 1: 100/110 | T01; runner source; no dedicated unsaturated-noise-edge test | R1; supplied paper background |
| 3: missing observation and finite prior upper retained under clipping | [0009]–[0010] | `intersect_reading`, `reading is None`, `upper=math.inf` | 2: missing/present branch | T01/T02 | R1 |
| 4: lower/upper transition equations | [0005], [0020] | `propagate`; `Governor.advance` | 1: 110 | T12/T14 | R1/R2 |
| 5: entire ordered queue, all-prefix maximum, no cancellation by zero | [0011], [0013], [0017]–[0018], [0023] | `admissible`; runner FIFO update | 1: 120/140; 2: prefix | T06/T14; pop/append source | R3/R4 |
| 6: square-root cap, grid floor and final recomputation | [0014]–[0015], [0027] | `admissible` | 2: candidate | T09/T14; analytical example; general proof uses monotonicity | R2; ordinary scalar constraint solving |
| 7: zero-input equilibrium bound and invariant interval | [0006], [0017] | `Model.__post_init__`; monotone zero transition in `propagate` | 2: terminal | T05/T13/T14 | R4 |
| 8: finite ordered initialization and invariant-valid model | [0006]–[0007] | `Governor.__init__`; `Model.__post_init__` | 2: initialization | T04/T05; other malformed pairs source-reviewed only | R1/R4 |
| 9: 120-entry/range/finite queue check before observation | [0012], [0019] | first queue check in `Governor.decide` | 2: queue validation | T07/T08; range endpoints source-reviewed only | R3; implementation capacity is not a novelty premise |
| 10: persistent invalidity and no subsequent rebase | [0019] | early `if not self.valid` in `Governor.decide`; no reset API | 2: latched branch | T07/T15; T07 checks later valid-shape queue | R1/R4; general defensive implementation |
| 11: invalid asserted applied value latches and prevents that propagation | [0020] | first branch of `Governor.advance` | 1: 140 to 110; 2: invalid ACK | Source inspection only; no dedicated existing test | R3; numeric validation is not execution verification |

## Practitioner challenge and next decision

R1–R4 make a broad formulation difficult: the narrow relationship between a censor-consistent bound, all queued commands, a quantized scalar suffix and an invariant fallback is the proposed discussion subject, with no established novelty conclusion. The current record provides no evidence of an unexpected technical interaction that overcomes the combination challenge. Claim 9’s queue-length constant and other arbitrary numeric restrictions may narrow wording without adding inventive merit.

The disclosure supports an implementation discussion, not an assurance that claim language will satisfy a jurisdiction’s eligibility, novelty, nonobviousness, enablement or definiteness requirements. Before any filing recommendation, a practitioner would need the supplied paper’s public-disclosure timeline, actual human contribution/inventorship records, an expanded claim-oriented prior-art search, and a reasoned position on the closest combinations. The work completed here does not file, publish or transfer rights in the proposed material.



# 4. Source-paper audit
# Source-paper boundary and discrepancy record

Source supplied: CCTA26_0150_FI (2).pdf, seven pages. Title: Control-Aware Predictive Maintenance of Industrial Robot Motors Using Multi-Sensor Fusion and FDIR Integration. Authors printed in the source: Srinivas Nampalli, Sri Tanav Kambhampati, Saathvik Gampa, Siavash Farzan. These are source attributions, not inventorship assignments for this project. All seven pages were extracted and visually inspected; Figure 6 was inspected at higher resolution.

## Already disclosed
Pages 2-3 disclose aligned temperature/voltage/position features, proxy IQR labels, classifier comparison and FDIR. Page 4 expressly treats sustained near-ceiling temperature as censored evidence and biases recovery toward throttling. Page 6 identifies FDIR as a deployment blueprint. Adding sensor fusion, censored-temperature detection, or a generic FDIR stop ladder therefore is not this project's proposed contribution.

## Unresolved internal discrepancy
Page 4 Table II reports RF ROC-AUC 0.871. Page 5 Table IV reports counts 7234, 876, 724, 2284 (total 11118). Page 6 Figure 6 instead displays RF and XGBoost AUC=1.000 and counts 12551, 0, 2, 4436 (total 16989). These figure/table results cannot describe the same test set and operating point as presented. Possible stale plotting artifacts are an inference, not an established explanation. The authors should reconcile figure generation and dataset partitions. This project neither reproduces nor chooses between those results.

Page 2 also says a difference of accumulated encoder positions is invariant to re-zero events. An uncorrected reset produces a jump in consecutive differencing; reset metadata or coordinate compensation would be needed. This observation is a mathematical audit of the statement, not a claim that the supplied implementation mishandles resets.

## Public source check
The manuscript's linked [GitHub repository](https://github.com/tanav-kambhampati/robot-motor-pdm-fusion) was publicly readable during this session. The repository overview and README were inspected; source code and raw data were not reproduced. The repository labels its license section as submitted for IEEE publication review, which is not an explicit reuse license. No source code/data was imported into this project. The earliest publication of that repository, the manuscript, or each disclosed feature remains unknown; obtain exact version/date records from the authors.

## Consequence for this project
The follow-up uses the clipping/FDIR context to motivate a separate, synthetic control study. None of the paper's reported classification scores, raw measurements, execution latencies, or model parameters is represented as reproduced evidence. A scalar motor-rise model, noise bound, latency and temperature limit are explicitly selected assumptions. Current/effort sensing and an accepted-command interface are additional requirements absent from the provided dataset description.



# 5. Problem discovery and alternatives
# Context-linked engineering problem screening

This screen starts with the supplied robot-motor paper's specific gap: useful sensor values can become censored, while a supervisory action takes time to affect the plant. Eight candidate problems span four domains. Evidence strength below describes support for the **underlying engineering problem**, not proof of an unmet market, willingness to pay, a prevalence estimate, or patent novelty. No customer interviews, market-size calculations, or purchase-intent data were collected.

## Eight candidates

| ID / domain | Concrete problem and potential user | Evidence and strength | Why current methods may leave a gap; limitation of that inference |
| --- | --- | --- | --- |
| R1 Robotics | A motor temperature front-end clips while sustained effort and pending commands continue heating; a robot-controls engineer needs a defensible derating decision. | **Direct, narrow:** supplied paper p. 4 explicitly describes clipping near 95 °C and a time-in-band response. | A dwell rule does not quantify hidden thermal headroom. The paper does not establish queued-action exposure, field failure incidence, or demand for a new controller. |
| R2 Robotics | After reset or lost actuator telemetry, the supervisor does not know whether a prior high-effort command is still pending. | **Plausible transfer:** delayed constraint control is established [S2]; this queue/acknowledgement failure was not measured in the supplied robot study. | A requested stop may not cancel accepted commands. Needs an actual robot interface trace and failure study before selecting it as a product problem. |
| P1 Power electronics | A motor-driver board must admit current bursts without exceeding a temperature limit when measurement is sparse or clipped. | **Strong for thermal/current limits:** TI describes transient thermal behavior and board-dependent current limits [S3]. **Unverified** for the exact clipped-sensor/queue conjunction. | Average current or fixed derating may be conservative or miss transient exposure. Existing thermal shutdown and estimation are strong incumbents; the new interface must show added value. |
| P2 Power electronics | Cooling changes after a fan fault or mounting change invalidate a previously calibrated thermal limit. | **Strong for thermal dependence:** TI documents dependence on PCB and ambient [S3], and device losses and temperature dependence [S4]. | An explicit unavailable-model status could prevent unjustified assurance. It does not make a hidden fan or contact-resistance change instantly observable. |
| E1 Energy storage | Surface temperature provides incomplete information about battery core temperature during charge/discharge. | **Direct research evidence:** experimental work estimates core and surface temperature with a thermal model and impedance [S5]. | A bounded core-temperature admission rule is a possible extension, but the one-state motor model is insufficient and impedance/core estimation is established prior work. |
| E2 Energy storage | A pack begins internal self-heating that persists after electrical current is removed. | **Strong for distinct mechanism:** NASA describes internal stored-energy release and propagation during thermal runaway [S6]. | This invalidates zero-current cooling as a universal recovery action. Containment and propagation management require a different physical model and intervention; reject as the first prototype. |
| F1 Process/pumps | A pump consumes remaining liquid while a stop is delayed and the level/pressure reading is missing or at its lower range. | **Strong for dry-run damage and established detection:** Grundfos documents level/pressure protection [S7]. **Plausible** for the missing/censored reading plus queued stop combination. | Propagating a lower bound on available liquid could support earlier admission decisions. Flow-rate bounds, tank geometry, suction conditions and actual stop delay must be measured. |
| F2 Process/pumps | Startup dry-run detection delay trades false trips during priming against shaft-seal exposure. | **Direct manufacturer evidence:** a Grundfos instruction manual documents configurable detection delay and damage concern [S8]. | An exposure budget might adapt the delay using observed priming evidence. Suitability depends on a particular pump and priming process; do not generalize the manual's numeric limit to all pumps. |

## Selected directions and two alternatives each

Selection is an engineering judgment about proximity to the source and feasibility of a falsifiable prototype, not a market ranking.

**1. R1 — robot-motor thermal admission (selected for the implemented research prototype).** It has the closest direct connection to the paper and permits a small, inspectable model. Proposed mechanism: sensor-consistent thermal interval, accepted-command FIFO, and recoverable zero-input tail. Alternative A: replace the front-end or add an independent higher-range winding-temperature channel and retain a conventional derating policy. Alternative B: use calibrated current-based thermal protection with conservative fixed limits and an independent overtemperature trip. Compare the software proposal with both hardware/sensing and existing-model alternatives before claiming cost or availability advantages. Missing evidence: calibrated motor model, actual actuator timing, reference winding temperature, customer workflow.

**2. P1 — motor-driver current-burst admission (selected as a second research direction).** RMS-current heating has a clear physical connection to the proposed effort term, although transistor switching loss and multi-time-constant thermal impedance complicate the scalar model. Proposed mechanism: bound junction temperature over already scheduled pulses before granting another pulse. Alternative A: add or improve junction/case sensing and enforce a validated fixed burst-duration envelope. Alternative B: use the vendor's thermal-impedance model or a conventional predictive current limiter with measured current feedback. Missing evidence: representative board data, sensing limits, pulse scheduler semantics, and advantage over existing protection. Do not transfer the motor's 95 °C sensor ceiling or an arbitrary simulation limit to the driver.

**3. F1 — pump withdrawal admission under level uncertainty (selected as a separate-model extension).** This tests whether the queue-and-recoverability idea is useful beyond thermal systems. Use a lower bound on available liquid and a bounded withdrawal rate; do not reuse the motor's heat equation. Alternative A: independent low-level float/suction-pressure switch with a hardwired stop path. Alternative B: established pump-specific dry-run detection with documented priming delay and motor-power/pressure diagnostics. Missing evidence: measured tank/flow dynamics, suction head, delayed stop behavior, and whether the new method beats the simpler independent switch.

R2 is a cross-cutting interface requirement within R1, rather than a separate initial product. P2 is a stress case and assurance limitation. E1 is technically credible but requires a substantially richer model and measurement system. E2 is excluded from any motor-model safety claim. F2 remains a potential pump-specific follow-up.

## Evidence register

Sources were checked during this task. A source supporting a physical failure mode does not by itself support the proposed solution or prove a commercial gap.

- **S1, supplied manuscript:** Nampalli et al., *Control-Aware Predictive Maintenance of Industrial Robot Motors Using Multi-Sensor Fusion and FDIR Integration*, supplied PDF pp. 2–4. This is user-supplied context; the new work did not reproduce its dataset or experiments.
- **S2, primary research:** Nicotra et al., *Explicit Reference Governor for the Constrained Control of Time-Delayed Linear Systems*, 2017 preprint. [Paper](https://arxiv.org/abs/1712.08248).
- **S3, manufacturer application note:** Texas Instruments, *Understanding Motor Driver Current Ratings*, SLVA505A, revised July 2024, especially thermal limits and thermal estimation. [Application note](https://www.ti.com/lit/an/slva505a/slva505a.pdf).
- **S4, manufacturer datasheet:** Texas Instruments, *DRV8317 Three-Phase PWM Motor Driver*, thermal considerations and power-loss equations. [Datasheet](https://www.ti.com/lit/ds/symlink/drv8317.pdf).
- **S5, primary research:** Richardson and Howey, *Sensorless Battery Internal Temperature Estimation using a Kalman Filter with Impedance Measurement*, 2015; DOI 10.1109/TSTE.2015.2420375. [Author preprint and experimental summary](https://arxiv.org/abs/1501.06160).
- **S6, primary institutional technical account:** NASA NESC, *Calorimetry of Lithium-ion Cells During Thermal Runaway*, 2019, updated 2023. [Technical account](https://www.nasa.gov/centers-and-facilities/nesc/calorimetry-of-lithium-ion-cells-during-thermal-runaway/).
- **S7, manufacturer technical guide:** Grundfos, *Dry-running protection*. [Guide](https://www.grundfos.com/uk/learn/research-and-insights/dry-running-protection).
- **S8, manufacturer instructions:** Grundfos literature 6860086, section 9.8.3 on dry-running protection and detection delay. [Instructions](https://api.grundfos.com/literature/Grundfosliterature-6860086.pdf).

The most valuable next discovery activity is a controls-engineer interview paired with an actual clipped-temperature and command-acceptance trace. Ask how limits are calibrated, which commands can be cancelled, how a lost acknowledgement is handled, and what availability metric matters. Record answers before making commercial claims.

## Transparent screening scores

Illustrative decision aid, scored1-5 with uncertainty of roughly one point per entry. Weights: impact20%, specificity20%, ordinary-compute feasibility20%, measurability15%, preliminary differentiation15%, access/cost10%. Impact is a technical judgment, not measured market demand; differentiation is deliberately low because existing protection is extensive. Scores are not patentability probabilities.

| Candidate | Impact | Specificity | Feasibility | Measurability | Differentiation | Access | Weighted /5 | Disposition |
|---|---|---|---|---|---|---|---|---|
| R1 |4|5|5|5|2|5|4.35|Lead: source-linked, testable |
| R2 |4|4|4|4|1|5|3.65|Merged into R1 interface |
| P1 |4|4|4|4|2|4|3.70|Shortlisted, richer losses needed |
| P2 |4|3|3|3|1|3|2.90|Assumption stress test |
| E1 |4|4|2|3|1|2|2.80|More sensing/calibration needed |
| E2 |5|3|1|2|1|1|2.35|Reject for first embodiment |
| F1 |3|4|4|4|2|4|3.50|Shortlisted separate mass-balance model |
| F2 |3|3|3|3|1|3|2.70|Pump-specific follow-up |

Scores follow the evidence/limitations in the candidate rows. R2 is not an independent product candidate after merging. No quantitative result would justify choosing E2 without the necessary physical safety expertise and experimental access.



# 6. Prior-art challenge
# Preliminary prior-art challenge

Prepared 8 September 2026 (America/Los_Angeles); web access on 9 September 2026 UTC. This is a bounded technical search and claim-drafting challenge, not a patentability or freedom-to-operate opinion. Patent legal status and priority entitlement were not independently established from prosecution records. No login, filing, public repository write, or disclosure of the new design was performed. Queries used established technical terminology; the query log records them.

## Decision

The broad concept has **high overlap and combination risk**. Saturation-aware bounded state estimation, robot command governors with interval estimation and delays, predictive thermal motor derating, application-layer acknowledgment handling, expiring command sequences, and predictive backup trajectories are all established. No inspected single reference was found that expressly presents the complete proposed thermal permit contract. This limited negative result does not establish novelty.

The useful research direction is a carefully specified implementation and falsifiable benchmark: determine when treating a clipped temperature as an exact value or ignoring pending actuator commands gives an unsafe release decision. The defensible initial output is a technical disclosure and simulation study with novelty explicitly unresolved. A narrow patent claim would need an implementation-specific interaction beyond assigning known techniques to motor protection. Merely adding an expiration timestamp, an interval observer, or the word “acknowledgment” does not supply that interaction.

Implementation scope reported by the project authoring agent: an exact synchronous accepted FIFO with an externally asserted applied-action acknowledgment, a half-line clipping update, a diagnostic decision counter with no consumption or replay enforcement, and a zero-input terminal invariant. Real network expiry and acknowledgment authentication are not implemented or validated. Broader permit/protocol features discussed below are research possibilities subject to prior-art challenge, not statements of delivered or tested behavior.

## Supplied-paper baseline

The supplied paper, *Control-Aware Predictive Maintenance of Industrial Robot Motors Using Multi-Sensor Fusion and FDIR Integration*, already describes temperature/voltage/encoder fusion, proxy IQR labels, classifier comparison, FDIR, and staged intervention. Its clipped high-temperature evidence is already treated as censored information in the supplied context. Do not present those features, the particular 93/95 °C thresholds, or “anomaly score drives derating” as new contributions. Public availability and submission/publication dates of the supplied paper remain to be confirmed by its authors.

## Closest original research

### R1 — Saturated measurements with bounded uncertainty

Fuwen Yang and Yongmin Li, *Set-membership filtering for systems with sensor saturation*, Automatica 45 (2009), 1896–1902, DOI 10.1016/j.automatica.2009.04.011. Original paper available from [Brunel author repository](https://people.brunel.ac.uk/~csstyyl/papers/auto2009.pdf). Full PDF inspected; title page reports online availability 27 May 2009.

The paper recursively constructs ellipsoidal state sets compatible with sensor saturation and unknown-but-bounded process and measurement noise. It explicitly seeks containment of the true state. This is strong prior art against claiming bounded estimation under clipping as a general invention. The candidate’s scalar half-line measurement update is simpler than this framework; simplicity may be useful computationally but is not, on this evidence, a novelty argument. R1 does not by itself disclose the proposed motor-specific command/permit protocol.

### R2 — Robot governor, interval estimates, and delays together

Shaobo Shen, Aiguo Song, Huijun Li, and Tao Li, *Constrained Control for Cloud Robotic Under Time Delay Based on Command Governor With Interval Estimation*, IEEE Access 7 (2019), 70999–71006, [DOI](https://doi.org/10.1109/ACCESS.2019.2920017). Original paper text inspected through its [ResearchGate full-text mirror](https://www.researchgate.net/publication/333504107_Constrained_Control_for_Cloud_Robotic_Under_Time_Delay_Based_on_Command_Governor_With_Interval_Estimation); publisher DOI access failed. The paper front matter gives publication 30 May 2019.

Sections III–IV predict through uncertain forward delay and use interval state estimates to compensate delayed measurements. Equations (31)–(32) place upper and lower predictions in the governor constraints. Simulation is a single-degree-of-freedom manipulator. This is the strongest single research reference against the general “interval governor for delayed robot commands” framing. Temperature clipping and an explicit expiring thermal permit are not identified in the inspected text.

### R3 — Application acknowledgment, applicable command history, and expiry fallback

Florian Rosenthal, Benjamin Noack, and Uwe D. Hanebeck, *State Estimation in Networked Control Systems with Delayed and Lossy Acknowledgments*, 2018 chapter/extended paper; [KIT author PDF](https://isas.iar.kit.edu/pdf/LNEE18_Rosenthal.pdf). Full 17-page author PDF inspected. It identifies itself as an extension of the authors’ earlier conference paper; a 2017 version was located, but this assessment relies on the inspected 2018 text.

Section 2 distinguishes application-layer acknowledgments of actually utilized control sequences from transport receipts. It buffers the latest sequence, rejects older packets, applies time-indexed entries, and uses a default input when buffered entries are no longer applicable. Section 3 augments the state with still-applicable historical commands; delayed acknowledgments alter uncertainty about applied inputs. This strongly challenges “acknowledgment-aware queue” or expiry/fallback alone. The estimator is stochastic/MMSE rather than a deterministic thermal envelope, and no clipped-temperature motor permit was identified.

### R4 — Predictive input certification and safe backup trajectory

Kim P. Wabersich and Melanie N. Zeilinger, *A predictive safety filter for learning-based control of constrained nonlinear dynamical systems*, [arXiv 1812.05506](https://arxiv.org/abs/1812.05506), later Automatica (2021). The arXiv record dates the first submission to 13 December 2018; the inspected [PDF](https://arxiv.org/pdf/1812.05506) is v4 dated May 2021, so details are attributed to that version.

Section 4 tests proposed controls by constructing constrained backup trajectories into a terminal safe set, with continuation of prior backup policy if a fresh solution is unavailable. It also handles model uncertainty, with safety formulated probabilistically. This challenges claims based only on issuing a control authorization after checking a future trajectory and a fallback. Deterministic interval semantics and actuator-queue integration still require a specific additional explanation.

### R5 — Motor thermal derating by MPC

Andreas Fischer, *Model-based thermal protection strategy for a permanent magnet synchronous motor*, TU Wien diploma thesis (2024), [institutional record and full-text link](https://repositum.tuwien.at/handle/20.500.12708/196526), DOI 10.34726/hss.2024.103780. Institutional metadata/abstract inspected; full thesis was discovered but not substantively reviewed.

The thesis develops motor electrical/thermal models and an MPC derating strategy that considers temperature limits and winding aging. It evaluates available torque against static derating in simulation. This is sufficient to reject “predictive motor thermal derating” as a new high-level premise, but not enough access coverage for a detailed claim chart on its algorithms.

### R6 — Constrained active diagnosis via reference selection

Mehdi Hosseinzadeh, Ilya Kolmanovsky, Sanjoy Baruah, and Bruno Sinopoli, *Reference Governor-Based Fault-Tolerant Constrained Control*, [arXiv 2107.08457](https://arxiv.org/abs/2107.08457), submitted 18 July 2021. [Full original PDF](https://arxiv.org/pdf/2107.08457) inspected.

The reference sequence is selected jointly for tracking, constraint satisfaction, and fault-detection performance using a multi-model estimator. A reconfiguration scheme uses recoverable sets. It challenges the backup idea of selecting a bounded cooling/control experiment to distinguish competing fault models while maintaining safe operation. The inspected example concerns an aircraft, not thermal sensor offset.

### R7 — Set-based diagnostic excitation

Feng Xu, *A new input design framework for asymptotic active fault diagnosis with application to integrated diagnosis and control*, Automatica 162 (April 2024), 111519, [publisher record](https://www.sciencedirect.com/science/article/abs/pii/S0005109824000116), DOI 10.1016/j.automatica.2024.111519. Publisher abstract/introduction inspected; full paid text not accessed.

The method chooses inputs to distinguish healthy and faulty residual zonotopes under bounded uncertainty and integrates diagnostic objectives with control or input-energy objectives. It is additional evidence that bounded active diagnosis and input design are established; the available abstract does not establish a specific thermal cooling implementation.

## Patent publications and claim-level coverage

### P1 — Thermal estimation and power limiting

[US20120007532A1 / US8773058B2](https://patents.google.com/patent/US8773058B2/en), *Rotor temperature estimation and motor control torque limiting for vector-controlled AC induction motors*. Claims 1, 4, 8 and specification inspected; [issued original PDF](https://patentimages.storage.googleapis.com/46/eb/e3/7b04027b26388b/US8773058.pdf) accessed. Claim 4 ties a torque command, runtime rotor-temperature estimate from a multi-node thermal model, measured stator temperature/current, and power limitation to a critical temperature. No clipping/interval/queue permit was identified.

Publication record: priority claimed 8 July 2010; US filing 8 July 2011; A1 publication 12 January 2012; grant publication 8 July 2014. Record lists original assignee Tesla Motor Inc and current assignee Tesla Inc. Family ID 45438118; related PCT/US2011/043474 and WO2012006605A2 appear in the record. These are database-listed facts, not a title or priority-entitlement opinion. Do not read the claim as covering every motor type or every thermal controller.

### P2 — Expiring robot instructions

[US20240340279A1 / US12598174B2](https://patents.google.com/patent/US12598174B2/en), *Fleet management system and method*. Full patent text and claims 1, 3, 9, 15 inspected. Claim 1 links certificate-based authentication, physical actuation and disabling expiring instructions. This challenges broad wording that authorizes robot action only while a token remains valid. The purpose and mechanism are authentication, not calculating a thermal safe set.

Record lists Viam Inc as original/current assignee; priority claimed 22 July 2022; this continuation filed 19 June 2024; A1 publication 10 October 2024; grant publication 7 April 2026. Listed family ID 89576203 includes parent US18/224,785 (US12047369B2), and country links WO2024020190A1 and EP4559213A4. Earliest family public disclosure and support for each claim limitation were not separately traced.

### P3 — Future temperature profiles govern torque

[US20170298811A1](https://patents.justia.com/patent/20170298811), *Method and system for compressor outlet temperature regulation*. Mirrored original specification and claims inspected; Google Patents direct access failed. Claim 1 adjusts engine torque based on a future compressor outlet temperature profile; dependent claims 2–6 concern horizon, demanded torque, degree and duration of projected excess. Specification explicitly describes a reference governor. It does not establish clipped motor sensing, an interval estimator, or a pending-command permit.

Publication date 19 October 2017 verified in the opened record. Priority, assignee, and complete family were not verified for this assessment and are intentionally omitted. This concerns an engine/compressor, so it is combination evidence for thermal constraint prediction, not a finding that its claims directly read on an electric robot motor.

### P4 — Cooling-curve deterioration diagnosis

[US20230316828A1](https://patents.justia.com/patent/20230316828), *Method, non-transitory computer-readable storage medium, and device for deterioration diagnosis of electronic units*. Mirrored original specification and claims inspected; Google Patents direct access failed. Claims 1/8 differentiate a cooling curve, fit an exponential over a selected interval, and compare an exponent to a reference. Claims 2/9 acquire the curve when a vehicle-mounted electric motor shuts down. This is close to using cooldown as a diagnostic experiment, though it diagnoses a power semiconductor/control unit and does not expressly compare thermal sensor offset against heating degradation.

US application 18/190,352; filed 27 March 2023; published 5 October 2023. Record names inventors Hodaka Tsuge and Hiroshi Ishikawa. Priority, assignee, and family were not verified and are omitted.

## Element challenge matrix

“Absent” below means not identified in inspected material, not proven absent from the entire reference/family.

| Proposed element | Strongest challenge | Narrow remaining issue |
|---|---|---|
| Clip-aware bounded thermal state | R1 plus supplied paper | No new general estimation principle established |
| Interval robot governor with delayed commands | R2 | Temperature-specific sensor/actuator contract |
| All still-applicable commands represented | R3 | Deterministic bounds for the chosen actuator semantics |
| Application ACK distinct from receipt | R3 | Specific integration with thermal admissibility |
| Expiring action with default fallback | R3; P2 | Physically justified expiry calculation, not timestamp alone |
| Future thermal derating | P1, P3; R5 | Certified uncertainty and queued-heat interaction |
| Safety check through fallback | R4 | Consistency with actual queue and valid uncertainty sets |
| Active cooling diagnostic | R6, R7, P4 | Identifiability of concrete sensor/thermal hypotheses |

## Single-reference and combination assessment

R2 is the strongest single-reference challenge to a broad independent claim. It already joins the robot context, interval estimation, command modification, constraints, and delays. R1 is the strongest focused challenge to saturation-aware bounded estimation. R3 is the strongest focused challenge to acknowledgment/queue semantics. None was identified as an exact full disclosure of the complete proposed thermal contract, but calling the overall design “new” from this gap would be premature.

A plausible engineering combination is R2 with R1 to cope with saturating robot telemetry, then P1 or R5 to make the constrained variable temperature. Adding R3 addresses known network uncertainty; adding R4 addresses backup viability. These combinations solve predictable component problems in familiar ways. An examiner could have substantial motivation to combine them; a qualified patent professional must evaluate the actual claim language, pertinent dates, analogous-art questions, and evidence of unexpected interaction. The current search does not supply evidence of an unexpected effect.

P2 is an additional terminology warning: a “permit” or “certificate” is not itself a distinction. It is less technically close than R3/R4 because it concerns authorization/security. Avoid inflating this reference into an exact thermal anticipation.

## Actions that would improve the research claim

1. State the exact clipping model and distinguish measured housing/sensor temperature from protected winding/hotspot temperature. A saturated observation supplies a lower constraint; any finite upper bound must originate elsewhere.
2. Define the authoritative acknowledgment payload and the command timing semantics. Receipt, queue acceptance, and physical application are different events. State whether all pending commands are known or whether uncertainty covers multiple possible histories.
3. Specify validated uncertainty bounds and the model-validity envelope. Arbitrarily tightening uncertainty to obtain a permit invalidates the safety argument.
4. Treat a permit as a conditional model result. A queue can carry heat beyond expiry, and thermal inertia can continue after zero input. Evaluate the full projected queue and fallback tail, or establish an appropriate terminal condition.
5. Use ablations against exact-clipped-value estimation, queue-blind prediction, point-model prediction, and prediction that stops at permit expiry. Report temperature violations, conservatism/availability, interval containment, and compute time.
6. Do not claim a real-robot safety validation from scalar simulations. A narrow discrete-time result must identify assumptions excluding intersample peaks, hidden hot spots, sensor offset outside bounds, actuator mismatch, and unmodeled heating.
7. For the backup cooldown study, test distinguishability first. Sensor bias, uncertain ambient temperature, cooling coefficients and residual heat can produce overlapping outputs. The correct result may be “indeterminate”; do not force a fault label.

## Coverage limits

This search used the web search index, Google Patents records, original papers in author/institutional repositories, and original patent text mirrored by Justia. It did not run a complete USPTO/EPO/WIPO classification search, prosecution-history analysis, non-English full-text search, backward/forward citation closure, or patent-family claim comparison. Relevant classifications observed include H02P29/60, H02P29/66 and B60L2260/56; these are candidates for a later systematic search, not evidence that such a search was completed. Additional screened leads and failed access attempts are recorded separately. Search-result “published” relative ages were not used as reliable dates.



# 7. Requirements and bench-validation plan
# Requirements and verification matrix

The system is a scalar, sampled thermal-control demonstrator. Intended reviewer: controls engineer/patent practitioner. Intended deployment concept: a local supervisory limiter on a motor with a validated thermal model and independent motion-safety controller. No deployment or purchase is required to run the demonstrator.

| ID | Requirement / acceptance | Evidence | Status and limit |
| --- | --- | --- | --- |
| REQ-01 | Propagate a containing interval for x>=0 with stated nonnegative model bounds | propagate; corner tests; final containment counts | Analytical conditional bound and simulation |
| REQ-02 | A clipped measurement cannot create a finite upper bound | intersect_reading; test_clipping_preserves_upper; test_clipped_unknown_start_rejected | Implemented |
| REQ-03 | Account for every accepted pending FIFO action before candidate applies | admissible; queue ablation; test_queue_changes_admissibility | Exact synchronous FIFO only |
| REQ-04 | Check all finite-prefix upper bounds <=80 C rise, then zero-input invariant | Model; admissible; tests upper_corner and zero_terminal | Sample instants only; ambient25/limit105 C selected |
| REQ-05 | Choose largest admissible 0.05-spaced action no greater than request | closed-form cap; test_requested_grid_quantization | Implemented without optimizer |
| REQ-06 | Do not rebase an inconsistent state interval onto a convenient reading | latched invalid; test_inconsistent_packet_no_rebase | Commands zero; existing queue still runs |
| REQ-07 | Missing observations must preserve prediction uncertainty | None handling and dropout_60 | Prediction can become conservative |
| REQ-08 | Require finite commissioning interval and known queue | initialization/invalid queue/overflow tests | Source paper supplies neither calibration nor hardware ACK |
| REQ-09 | Keep useful work explicit | final mean sum(applied effort)/sum(requested effort) >=0.50 per valid-model scenario | A thermal effort proxy, not production throughput |
| REQ-10 | Compare stronger nominal delay-aware limiter, threshold, cap and ablation | frozen protocol and amendment, five policies | Fixed untuned controls, no best-in-class claim |
| REQ-11 | Preserve hidden truth and future disturbances outside policy API | independent code review; raw trace schema | No learning; paired seed exogenous traces |
| REQ-12 | Handle ordinary valid-model and deliberate invalid-model cases honestly | nine scenarios, fresh seeds, negative results | No deterministic guarantee outside contract |
| REQ-13 | Reproduce source/config/result provenance and tests | run metadata, test log, file manifest, reproducibility record | Hashes give integrity, not priority/inventorship |

## Interfaces and timing
One transition represents one second. Inputs per decision are current temperature reading in C or None, requested normalized heat-producing effort in [0,1], and a FIFO of accepted normalized commands. Output is accepted effort, interval, predicted prefix peak, validity flag, reason, and monotonically incremented audit counter. advance receives externally asserted applied effort after the plant transition. In the experiment a queue of d entries applies the oldest now and appends the new action; d=0 applies immediately.

The counter has no replay rejection or real-time expiration enforcement. Sensor timestamps, packet-loss handling, reorder handling, authenticated acknowledgments, actuator current measurement, independent interlocks and winding/sensor lag models must be engineered separately. No claim or test in this package establishes those capabilities.

## Parameters and calibration
All temperatures/coefficients are synthetic selected values. ambient=25 C; clipping ceiling=95 C; thermal limit=105 C; error bound=0.3 C; x initial rise interval [30,75] C except hot-start [68,75] C; a in [0.985,0.995]; b in [0.55,0.95] C per squared normalized effort per sample; w in [0,0.04] C per sample; delay in {0,8,20} samples. Model time constants inferred from a would span about 66-200 seconds, but no actual motor was identified.

A lab embodiment needs a motor-specific current/heat normalization, a reference winding or hotspot sensor above the operating range, ambient measurement, multiple heating/cooling identification runs, and validated enclosure of cooling/load/drive changes. Do not substitute voltage, desired speed, or anomaly probability for measured heat-producing effort without a justified map. Zero input must not be assumed to hold a gravity-loaded joint or eliminate all post-stop heating.

## Unexecuted bench protocol
Instrument one accessible motor under a mechanically secured test arrangement and an independent overtemperature stop. Identify model/error bounds on dedicated calibration runs over ambient and duty-cycle conditions. Reserve separate runs for validation, deliberately impose sensor clipping in the readout pipeline, and record actual current, high-range reference temperature, command acceptance and application times. Compare the same controls under matched duty requests. Reject deployment if true temperature exits the proposed interval or if queue/application semantics disagree. Equipment, ratings, permissions, and a qualified safety review are unknown; no physical procedure was executed.



# 8. Evidence records
# Evidence ledger

Event dates are actual session records (8 September 2026 Pacific / 9 September UTC); no historic conception date is asserted. IDs remain stable.

| ID | Assertion and category | Source / confidence | Limitation / used by |
| --- | --- | --- | --- |
| E01 | Paper reports clipping and FDIR blueprint; user-supplied source fact | Uploaded PDF pp4,6; high for contents | Physical conditions not independently verified; design, manuscript |
| E02 | Source table and Fig6 disagree; direct visual inspection | SOURCE_PAPER_AUDIT; high | Cause unknown; dossier |
| E03 | Linked source repository is publicly readable now; external observed fact | Public GitHub overview; high for access at review | Earliest disclosure/reuse rights unknown; disclosure ledger |
| E04 | Saturation-aware bounded estimation already exists; external fact | Yang/Li2009 R1 full author PDF | Scope details in prior-art review; patent challenge |
| E05 | Robot interval governors with delays already exist; external fact | Shen2019 R2 original text mirror | Publisher access failed; novelty challenge |
| E06 | Application ACK/control history already researched; external fact | Rosenthal2018 R3 full author PDF | No new protocol established here |
| E07 | Synthetic thermal recurrence is a selected engineering assumption | Config plus requirements | Not calibrated from paper; all new numerical results |
| E08 | Interval containment follows monotonicity and observation intersection; analytical derivation | Technical disclosure + corner tests | Requires finite initial bound, true coefficients/noise within box |
| E09 | Queue-prefix plus invariant zero tail suffices at sample instants; analytical derivation | admissible + Model | No intersample, motion or hidden-hotspot guarantee |
| E10 | Pilot and final experiments executed by tools; executed simulation | Per-run metadata and raw CSV | Synthetic repeated episodes, not physical devices |
| E11 | 15 meaningful implementation tests passed; executed computation | TEST_LOG.txt | Not a network/hardware certification |
| E12 | Patentability remains unresolved, broad framing high overlap; analytical/legal-review judgment | prior_art_challenge + source matrix | No exhaustive classification/FTO/legal opinion |
| E13 | Human conception/ownership not established; unresolved facts | CONTRIBUTION_RECORD | User instruction/authorship are not automatic inventorship |
| E14 | U.S. route is illustrative; official procedural guidance verified | FILING_READINESS links | Jurisdiction, status and filing date unknown |
| E15 | No robot bench measurements performed; unexecuted validation | Requirements bench protocol | Hardware claims unsupported |
| E16 | Original source/data were not imported; provenance observation | Source inventory and authored code | Third-party Python tools retain own licenses |

Numbers and plots in the manuscript are generated from the final completed run, never inferred from a plan. Pilot data are retained; an interrupted run is labeled incomplete. Confidence above describes source/derivation access, not commercial promise or probability of patent grant.



# 9. Independent engineering review
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



# 10. Independent result audit
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



# 11. Inventorship and contribution facts
# Human contribution and AI assistance record

**Draft factual record — no inventor, applicant or owner determined.**

Created September 8, 2026 PDT. Clock reference: 2026-09-09 05:06:20 UTC (September 8, 22:06:20 PDT). This record describes the provenance of work in the present session and provides fields for later human evidence. It is not an oath, declaration, assignment or legal conclusion.

## What is known

| Item | Current record | Evidentiary limit |
|---|---|---|
| User request | User asked for a new engineering invention and research/patent package based on supplied context, with repository deliverables | Commissioning work does not automatically establish legal inventorship |
| Supplied source paper | `CCTA26_0150_FI (2).pdf` supplied as reference | File possession, an author listing or a filename does not identify the user as inventor of this proposal |
| Supplied master prompt | `Engineering_Patent_Master_Prompt(1).txt` supplied as reference | Document instructions are not an independent legal authorization or signature |
| New proposal in this package | AI-assisted proposal developed in the present session from supplied context and research | No claim that a named human had already conceived every claimed feature |
| Assistant contribution | Literature/procedure research, synthesis of candidate mechanisms, drafting and repository preparation | AI cannot be named as a U.S. inventor |
| Human technical contribution to the new proposal | Not yet established from verified evidence | Must remain unresolved; do not replace with the account owner's name |
| Inventor/applicant/assignee identities | Unknown | No automatic attribution |
| Evidence of prior human conception | Not supplied or verified in this record | A later factual account must identify what was conceived and when |
| Human adoption, modification or implementation | Awaiting factual review | Mere approval of the package is not recorded as proof of conception |
| Prior relationships or obligations | Unknown | Employment, university, collaboration or funding terms may affect ownership |

The description of the session above is a provenance record, not a determination of whether any person legally conceived an invention.

## Current U.S. standard

The November 2025 revised USPTO guidance applies ordinary conception law to AI-assisted inventions. Only natural persons can be inventors. A definite operative technical solution must be conceived by the actual human inventor; a general desired result alone does not establish conception. The Pannu analysis remains relevant to multiple human joint inventors, not to comparing a sole human against an AI co-inventor. [Official revised guidance](https://www.federalregister.gov/documents/2025/11/28/2025-21457/revised-inventorship-guidance-for-ai-assisted-inventions)

The entries below are an evidence-organizing practice. They are not an additional AI-specific certification required by that guidance.

## Contribution worksheet — complete from actual evidence

Create one row per candidate feature or claim limitation and per human contributor. Keep original records; distinguish contemporary records from later recollection. Do not invent dates, experiments, signatures or descriptions of knowledge.

| Feature / claim limitation | Human contributor legal name | Specific conceived technical solution | Date and place conceived | Dated evidence | AI / third-party assistance and sequence | Remaining uncertainty |
|---|---|---|---|---|---|---|
| Overall proposed architecture | UNKNOWN | TO BE PROVIDED | UNKNOWN | None recorded | AI proposal generated in current session | Human conception unresolved |
| Distinguishing mechanism | UNKNOWN | TO BE PROVIDED | UNKNOWN | None recorded | Trace to technical draft and session history | Human conception unresolved |
| Controller / algorithm detail | UNKNOWN | TO BE PROVIDED | UNKNOWN | None recorded | Trace to source paper versus added proposal | Which features originated with which person? |
| Safety / fallback behavior | UNKNOWN | TO BE PROVIDED | UNKNOWN | None recorded | Trace to added proposal and known techniques | Original human contribution unresolved |
| Implementation embodiment | UNKNOWN | TO BE PROVIDED | UNKNOWN | None recorded | Separate routine implementation from conceived features | Best mode and support require review |
| Additional dependent-claim features | UNKNOWN | TO BE PROVIDED | UNKNOWN | None recorded | Add rows for each materially distinct feature | Claim-specific review pending |

## Claim-specific worksheet — 11 discussion claims

Mapping to `docs/CLAIMS_DISCUSSION_DRAFT.md`, prepared September 8, 2026. All human-contribution determinations remain unresolved. The presence of a supported implementation or an AI-authored claim does not supply evidence of a human's conception. For claim 1, obtain evidence for each clause (a)–(i), including the relationships between them; a single account of the overall desired result is not a substitute for those facts. Repeat a row for each person whose contribution is supported by actual evidence.

| Discussion claim | Technical feature requiring contribution evidence | Disclosure paragraphs | Human contributor | Specific human-conceived solution / dated evidence | AI or third-party source sequence | Status |
|---|---|---|---|---|---|---|
| 1(a)–(i) | Scalar bounded model, commissioned interval, censored intersection, exact FIFO prediction, grid candidate, zero-tail condition, invalid latch, asserted-applied update and their relationships | [0004]–[0020], [0022]–[0023] | UNKNOWN | NOT PROVIDED | AI-assisted integration in this session; distinguish known techniques R1–R4/P1 and supplied-paper background | UNRESOLVED |
| 2 | Noise before clipping and unsaturated/slab versus clipped/half-line observation constraints | [0008]–[0010] | UNKNOWN | NOT PROVIDED | AI-assisted formulation; review R1 and already disclosed clipping context | UNRESOLVED |
| 3 | Missing-data retention and preserving a finite prior upper bound under clipping | [0009]–[0010] | UNKNOWN | NOT PROVIDED | AI-assisted implementation; review R1 | UNRESOLVED |
| 4 | Monotone lower/upper propagation using an asserted applied effort | [0005], [0020] | UNKNOWN | NOT PROVIDED | AI-assisted implementation; review R1/R2 | UNRESOLVED |
| 5 | Whole accepted FIFO and every-prefix check without zero canceling prior commitments | [0011], [0013], [0017]–[0018], [0023] | UNKNOWN | NOT PROVIDED | AI-assisted contract formulation; review R3/R4 | UNRESOLVED |
| 6 | Closed-form scalar allowance, downward action-grid selection and candidate recheck | [0014]–[0015], [0027] | UNKNOWN | NOT PROVIDED | AI-assisted derivation/implementation; review ordinary scalar constraint methods and R2 | UNRESOLVED |
| 7 | Zero-input invariant condition covering an indefinite fallback tail | [0006], [0017] | UNKNOWN | NOT PROVIDED | AI-assisted derivation/implementation; review R4 | UNRESOLVED |
| 8 | Rejecting nonfinite/unordered commissioning bounds and invalid terminal model | [0006]–[0007] | UNKNOWN | NOT PROVIDED | AI-assisted validation logic; review R1/R4 | UNRESOLVED |
| 9 | Finite in-range accepted queue of at most 120 efforts, validated before observation | [0012], [0019] | UNKNOWN | NOT PROVIDED | AI-assisted implementation/capacity choice; review R3 | UNRESOLVED |
| 10 | Persistent invalidity without automatic observation-based rebasing | [0019] | UNKNOWN | NOT PROVIDED | AI-assisted defensive behavior; review R1/R4 | UNRESOLVED |
| 11 | Invalid asserted applied effort latches invalidity and prevents propagation for that call | [0020] | UNKNOWN | NOT PROVIDED | AI-assisted numeric validation; execution truth remains an external assumption | UNRESOLVED |

No table entry assigns inventorship, priority, ownership or novelty. Amend the mapping if the discussion claims change, and retain the older version as part of the factual record.

## Evidence and ownership fields

For each relevant person, record confirmed legal name and residence, role, employer/university at the relevant time, collaborators, funding, signed assignment or invention-obligation agreements, and any prior related applications. Keep identity-verification documents and financial credentials outside this repository. Enter only information needed for the patent preparation record.

For every proposed measurement or experiment, provide a lab notebook, original data or reproducible run record. Draft simulations must be described as simulations; theoretical examples and future test plans must not be described as completed physical experiments.

## Review outcomes — currently blank

- Human inventorship review date: **UNRESOLVED**
- Claim version reviewed: **UNRESOLVED**
- Inventors to name: **UNRESOLVED**
- Applicant and ownership basis: **UNRESOLVED**
- Human review of technical completeness / best mode: **UNRESOLVED**
- Reviewer and reasoning/evidence reference: **UNRESOLVED**
- Signature or certification: **NOT EXECUTED**

Update this record when the technical claims change. Any legal inventorship conclusion should use the final claimed subject matter and the actual contribution evidence, with a registered patent practitioner where needed.



# 12. Disclosure records
# Disclosure, prior-filing and priority ledger

**No verified filing date, priority date, public-disclosure deadline or patent-pending status has been established.**

Created September 8, 2026 PDT. Clock reference: 2026-09-09 05:06:20 UTC (September 8, 22:06:20 PDT). This date records preparation only; it is not an invention or filing date.

## Current known and unresolved items

| ID | Event or material | Date / timezone | Audience / access | Technical content exposed | Evidence | Present assessment |
|---|---|---|---|---|---|---|
| D-001 | Supplied paper `CCTA26_0150_FI (2).pdf` | Publication / presentation date UNKNOWN | Public status UNKNOWN | Baseline source paper; compare exact content with new proposal | Local supplied PDF | Do not infer public availability or priority from filename |
| D-002 | Supplied master prompt `Engineering_Patent_Master_Prompt(1).txt` | Prior distribution date UNKNOWN | Prior audience UNKNOWN | Drafting instructions; inspect separately from invention disclosure | Local supplied text | Reference material, not a patent filing |
| D-003 | Present AI-assisted drafting session | September 8, 2026 PDT | Session visibility and any legal confidentiality effect not assessed | Proposed improvement and draft materials | Session and repository files | Not a filed application; no public-disclosure legal conclusion |
| D-004 | Local repository / output creation | Present session | Local files created; no public push or publication by this researcher | Draft technical and patent materials | Local files | Local creation alone is not evidence of an official priority date |
| D-005 | Earlier papers, theses, preprints or code repositories | UNKNOWN | UNKNOWN | UNKNOWN | User to provide exact versions and public dates | Unresolved |
| D-006 | Conference presentation, poster, demo or abstract | UNKNOWN | UNKNOWN | UNKNOWN | Program, slides, recording, posting date and access terms | Unresolved |
| D-007 | Sale, offer for sale, public use or customer trial | UNKNOWN | UNKNOWN | UNKNOWN | Offers, invoices, terms, dates and technical scope | Unresolved |
| D-008 | Previous provisional, nonprovisional, PCT or foreign application | UNKNOWN | Patent Office / application details UNKNOWN | UNKNOWN | Filing receipt and original filed documents | Unresolved |
| D-009 | Nonpublic collaborators or investor disclosure | UNKNOWN | UNKNOWN | UNKNOWN | Recipients, agreements, exact content and dates | Unresolved; no confidentiality assumed |
| D-010 | Planned publication, submission, demonstration or repository push | UNKNOWN | UNKNOWN | UNKNOWN | Exact planned materials and target dates | Resolve before the event |

The supplied paper's authorship and publication history must be assessed against the actual new features. Do not treat the whole paper as either the user's own disclosure or as the new invention without evidence.

## How to complete each event

Record: exact date/time and timezone; event type; who disclosed; source of the disclosed technical matter; recipients; whether access was unrestricted, paywalled or restricted; confidentiality terms actually in force; URL and archived version where applicable; first accessible date; exact version/hash; related claim limitations; and evidence supporting these facts. Keep a separate row for materially changed versions.

An event described as private by a participant still needs its actual circumstances recorded. A document creation timestamp is not necessarily its public posting date. A submission deadline is not necessarily a publication date. Do not backdate entries or erase earlier versions when correcting a fact.

## Timing framework for factual review

Qualifying inventor-originated disclosure may receive a U.S. one-year grace-period exception; that is not a universal immunity for all earlier events. Earlier disclosure may prevent foreign patenting. The earliest relevant event and its relationship to the claimed subject matter must be reviewed before calculating a deadline. [USPTO provisional guidance](https://www.uspto.gov/patents/basics/apply/provisional-application)

Paris priority generally calls for subsequent patent filings within 12 months of the first application. For inventions made in the United States, foreign/international filing may require a USPTO foreign-filing license; six months after U.S. filing, the license is generally unnecessary for that subject matter if no secrecy order exists. Invention location and later-added subject matter matter to the assessment. [USPTO international protection](https://www.uspto.gov/patents/basics/international-protection/filing-patents-abroad)

A PCT filing claiming a first application's priority is normally made within 12 months; national phase action is usually due around 30 months from earliest priority, subject to each Office's requirements. The relevant national chapters must be checked for actual selected countries. [WIPO filing guidance](https://www.wipo.int/en/web/pct-system/filing/index), [WIPO PCT guide](https://www.wipo.int/en/web/pct-system/guide/index)

## Deadline worksheet — do not calculate without verified triggering facts

| Deadline item | Trigger and evidence | Confirmed deadline / timezone | Responsible person | Status |
|---|---|---|---|---|
| Potential U.S. disclosure bar | UNKNOWN event and legal relationship | NOT CALCULATED | UNASSIGNED | Fact review needed |
| Provisional-to-nonprovisional benefit | No verified provisional filing | NOT CALCULATED | UNASSIGNED | No application known filed |
| Paris / PCT priority year | No verified first filing | NOT CALCULATED | UNASSIGNED | Prior-filing records needed |
| PCT national phase | No verified PCT / priority details or countries | NOT CALCULATED | UNASSIGNED | Route not selected |
| Foreign-filing authorization | Invention location / filing history UNKNOWN | NOT DETERMINED | UNASSIGNED | National rules review needed |
| Next intended public disclosure | No date supplied | NOT RECORDED | UNASSIGNED | User factual input needed |

No reminder or automation has been created. Do not label materials patent pending until an actual applicable filing has been confirmed. No disclosure, submission, payment or publication was performed by this researcher.



# 13. Filing readiness and official links
# Filing readiness and official-source research

**Status: local preparation records; no patent application submitted.**

Research date: **September 8, 2026, America/Los_Angeles (PDT)**. Live clock check: **2026-09-09 05:06:20 UTC**, equivalent to September 8 at 22:06:20 PDT. Source pages were accessed during this session. Dates in filenames are not relied on as publication or priority dates.

The package uses a **U.S. utility patent drafting assumption**. Jurisdiction, applicant, actual inventors, ownership, and filing route remain unconfirmed. This memorandum is a preparation aid, not a patentability opinion or an executed application. The attached master prompt is reference material; its instructions do not independently authorize filing, signing, paying, publishing, or contacting others. No credentials belong in this repository.

## Route comparison

| Issue | U.S. provisional | U.S. nonprovisional utility | PCT international route |
|---|---|---|---|
| Purpose | Establish an initial application date for sufficiently disclosed subject matter | Seek examination and possible U.S. patent grant | Coordinate international filing and search before national/regional examination |
| Core technical content | Enabling disclosure and necessary drawings | Specification, claims, abstract, and necessary drawings | Request, description, claims, abstract, and necessary drawings under PCT requirements |
| Formalities | Provisional identification, inventor details, cover sheet/ADS, fee | ADS, fees, inventor oath/declaration and other applicable formalities | Competent receiving Office, eligible applicant, required fees and international formalities |
| Examination/grant | No merits examination; no patent issued from provisional alone | USPTO examines patentability; grant is uncertain | International search/written opinion; national/regional Offices decide grants |
| Timing to plan | Corresponding nonprovisional usually within 12 months to preserve benefit | Filing deadlines depend on prior filings and disclosures | Usually file within 12 months of first filing for priority; national phase usually by 30 months from earliest priority, with Office-specific exceptions |
| Main unresolved choice | Whether this route fits actual disclosure and territorial plans | Claim scope, inventorship, support and prosecution budget | Applicant nationality/residence, countries, receiving/search Offices, national security rules and total budget |

Sources: [USPTO provisional guidance](https://www.uspto.gov/patents/basics/apply/provisional-application), [USPTO applying overview](https://www.uspto.gov/patents/basics/apply), [USPTO utility guide](https://www.uspto.gov/patents/basics/apply/utility-patent), [WIPO PCT FAQs](https://www.wipo.int/en/web/pct-system/faqs/faqs), [WIPO international-phase guide](https://www.wipo.int/documents/d/pct-system/docs-en-guide-gdvol1.pdf). A PCT application does not produce a single worldwide patent.

## Drafting completion criteria

The initial disclosure must teach a skilled person how to make and use the proposed improvement. Describe implementation, interacting components, operating sequence, parameters, equations and assumptions, alternatives, failure behavior, and the best mode actually contemplated by an inventor. Include all essential matter initially; later claims need original support. A paper describing prior work does not automatically supply support for an added improvement. [USPTO MPEP §608](https://www.uspto.gov/web/offices/pac/mpep/s608.html)

For the proposed package, perform these substantive checks:

- Identify the new proposed mechanism separately from the supplied paper and cited literature.
- Map each independent claim limitation to an explicit description and figure; narrow or expand the disclosure where gaps exist.
- Mark proposed embodiments, actual simulation runs, unperformed tests, and physical measurements accurately.
- Define uncertainty models, operating limits, initialization, failure detection and fallback conditions instead of relying on broad functional outcomes.
- Check every figure identifier, equation variable, unit, and defined term for consistency.
- Keep legal novelty and human inventorship conclusions unresolved until the corresponding evidence is reviewed.

These are project preparation checks. They do not certify enablement, novelty, nonobviousness, eligibility, or freedom to operate.

### Abstract

For a U.S. nonprovisional, prepare **one paragraph, no more than 150 words, on its own page**. The current USPTO utility guide says no longer than 150 words; its missing-items guidance uses less than 150. Target **under 150 words** to satisfy both phrasings. An abstract in this provisional-style draft is included for usefulness, not represented as a universal provisional requirement. [Utility guide](https://www.uspto.gov/patents/basics/apply/utility-patent), [missing-items guidance](https://www.uspto.gov/patents/apply/when-patent-applications-are-incomplete-or-missing-information)

### Drawings and page presentation

Keep reproducible drawings on separate sheets with consistent reference numerals. Letter or A4 drawing sheets are permitted. Drawing margins: at least 2.5 cm top/left, 1.5 cm right and 1.0 cm bottom. Include views needed to understand the system and operations. The specification may use mathematical expressions/tables; flow diagrams belong in drawing sheets. [MPEP §608 / 37 CFR 1.84](https://www.uspto.gov/web/offices/pac/mpep/s608.html)

Use a single-column specification with legible nonscript text, preferably 12-point, 1.5 or double spacing, and consecutive page numbers. Claims and abstract start separately. A DOCX draft requires Patent Center validation before submission; a local render is not USPTO validation. [Utility guide](https://www.uspto.gov/patents/basics/apply/utility-patent)

## Verified official fees

**USD; checked September 8, 2026 PDT.** The live USPTO schedule states effective January 19, 2025, last revised August 14, 2026.

| Fee item | Standard | Small entity | Micro entity |
|---|---:|---:|---:|
| Provisional filing | 325 | 130 | 65 |
| Nonprovisional utility basic filing | 350 | 140 | 70 |
| Utility search | 770 | 308 | 154 |
| Utility examination | 880 | 352 | 176 |

The schedule separately lists a **$70 electronic basic utility filing fee for qualifying small entities**. These are fee components, not all-in estimates. Non-DOCX, paper filing, excess claims, size, late items, issue and other fees may apply. No entity status or discount eligibility has been established. PCT costs depend on receiving/search Office, currency, format, pages, reductions and national phase choices; no PCT total has been verified here. Recheck fees at actual filing. [USPTO fee schedule](https://www.uspto.gov/learning-and-resources/fees-and-payment/uspto-fee-schedule)

Micro status requires qualifying parties to meet small-entity criteria plus a permitted micro-entity basis and an application-specific certification. A low personal income alone is insufficient. [USPTO micro-entity guidance](https://www.uspto.gov/patents/laws/micro-entity-status)

## Information that must be resolved

| Unresolved fact | Evidence to obtain | Why it matters |
|---|---|---|
| Filing jurisdiction and desired countries | User's explicit territorial choice | Determines route, deadlines and formalities |
| Human inventors and contributions | Completed contribution record; dated technical accounts | AI output and paper authorship do not establish inventorship |
| Applicant/owner and obligations | Employment, university, collaboration and assignment agreements | Ownership may differ from inventorship |
| Legal names, residences and correspondence | Confirmed filing details from authorized person | Required forms must use accurate information |
| Government funding/property interest | Funding and grant/contract records | Required cover-sheet/specification statements may apply |
| Invention locations and applicant nationality/residence | Confirmed facts | Foreign-filing and PCT receiving-Office rules |
| Prior applications | Numbers, dates, countries, inventors and copies | Priority and related-application analysis |
| Public disclosures/sales/offers | Completed disclosure ledger with supporting records | Potential novelty bars and grace periods |
| Best mode and operational completeness | Actual inventor review and technical documentation | Adequacy of the initial disclosure |
| Entity status | Eligibility review for every relevant party | Fee reductions require a valid basis |
| Filing authority and signature | Final reviewed package and authorized human action | No signature or certification has been executed |
| Filing account readiness | Verified Patent Center enrollment | Password possession does not establish authorized eFiler status |

The official provisional cover sheet collects inventor names/residences, title, correspondence, representative information if applicable, government interest and signature information. Use placeholders until confirmed. [PTO/SB/16](https://www.uspto.gov/sites/default/files/documents/sb0016.pdf)

## Inventorship and disclosure controls

See [CONTRIBUTION_RECORD.md](CONTRIBUTION_RECORD.md) and [DISCLOSURE_LEDGER.md](DISCLOSURE_LEDGER.md). The proposal generated in this session is AI-assisted work and is not automatically attributed to the user. No inventor or applicant has been legally determined.

The current November 2025 USPTO guidance replaced its February 2024 AI guidance entirely. Ordinary human conception law applies; AI is a tool, not an inventor. With multiple human contributors, ordinary joint-inventorship principles apply. The earlier AI-specific application of the Pannu factors must not be used as the governing framework for a sole human working with AI. [Revised guidance, November 28, 2025 Federal Register](https://www.federalregister.gov/documents/2025/11/28/2025-21457/revised-inventorship-guidance-for-ai-assisted-inventions)

## Filing prerequisites and present status

Patent Center requires identity verification for all users from September 11, 2025. The new-user process includes a USPTO.gov account, MFA, identity verification and enrollment. The human user must complete any personal identity verification. No account was accessed by this researcher; no registration, signature, payment or filing was performed. [Patent Center](https://www.uspto.gov/patents/apply/patent-center), [new-user process](https://www.uspto.gov/patents/apply/applying-online/getting-started-new-users)

Preparation is reviewable when the technical files and figures are complete and all placeholders are visible. Submission readiness remains unresolved until the factual items above, actual route, final application content and filing authority are settled. No filing receipt or patent-pending status is claimed.

## Search record and coverage

All searches used the browser research tool during this session. Only primary USPTO, Federal Register and WIPO sources support this memorandum; search-result appearances from forums, firms and encyclopedias were not relied on. Official HTML was opened/searched, and official form/guide PDFs were accessed through the browser. No logged-in records, actual application file histories, national legal advice, paid patent database, or unpublished filings were inspected.

Queries executed:

1. `site.uspto.gov patents basics apply provisional application patent requirements drawings fees inventor`
2. `site.uspto.gov AI assisted inventions inventorship guidance 2025 2026`
3. `site.uspto.gov provisional application public disclosure foreign patent rights one year`
4. `site.uspto.gov fee schedule provisional application filing fee 2026 65 130 325`
5. `site.uspto.gov 37 CFR 1.84 margins drawings 2.5 cm 1.5 cm`
6. `site.uspto.gov foreign filing license patent invention made united states six months`
7. `site.uspto.gov protecting intellectual property abroad patent 12 months paris convention`
8. `site.uspto.gov nonprovisional utility patent application filing guide abstract 150 words`
9. `site.wipo.int PCT applicant guide international phase 30 months national phase international application no world patent`
10. `site.uspto.gov micro entity status requirements gross income 2026`

An initial open of `https://www.uspto.gov/patents/basics/international-protection` returned an internal error; the linked [filing-patents-abroad page](https://www.uspto.gov/patents/basics/international-protection/filing-patents-abroad) was successfully retrieved. Current AI guidance was reached through [USPTO's AI resource index](https://www.uspto.gov/initiatives/artificial-intelligence/artificial-intelligence-resources); its older January 2025 FAQ was not used as controlling guidance. The live fee HTML, not an older cached PDF, supplied the dated amounts. This was a filing-procedure review, not the technical prior-art search.



# 14. Reproducibility
# Reproducibility and integrity

## Verified execution environment
Python3.12.14 (MSC64-bit, bundled Windows runtime); ReportLab4.4.9 for PDFs; pypdf6.10.0 for PDF text checks; NumPy2.3.5 was available but is not required by the thermal simulator. The simulator, demo and tests use the Python standard library. Full platform strings and timing reside in each run_metadata.json. Arial system fonts are used by the PDF builder; fonts are not redistributed.

The delivered source does not import the source paper's models, code or raw data. The paper's public repository and manuscript were read as context. No supplied password or account credentials are stored in this package or needed to run it.

## Executed commands
From the project directory:
```text
python -m unittest discover -s tests -v
python demo.py
python run_experiments.py
python run_experiments.py --config config/evaluation.json
python run_experiments.py --config config/ack_followup.json
python run_experiments.py --config config/clipping_ablation.json
python build_documents.py
```

The unqualified experiment is the retained pilot (seeds 1000-1019). The final primary run uses seeds 2000-2019 and a strengthened nominal clipping baseline. Post-main actuator and clipping studies use seeds 3000-3019 and 4000-4019. A source/configuration amendment before final evaluation and separate follow-up protocols record the exact changes.

## Completed results and units
Primary:900 episodes, 810000 one-second sample transitions. ACK follow-up:100 episodes, 90000 transitions. Clipping ablation:120 episodes, 108000 transitions. Completed final/post-main total 1120 episodes, 1008000 transitions. Retained pilot:900 episodes, 810000 transitions. Each controller/scenario/seed run is an episode, not a separate motor or physical experiment.

Temperature is Celsius; state intervals are exported as absolute Celsius although the governor maintains Celsius rise. Applied/requested effort is a dimensionless aggregate proxy. Queue length and k are sample counts; the selected interpretation is one second per sample. Each raw row is a single simulated transition with pre-decision FIFO and posterior state interval.

## Files and replay
Each completed folder contains run_metadata.json, summary.csv, episodes.csv, example_traces.csv and raw_steps.csv.gz. Metadata contain actual parameters, seeds, duration and source/config SHA-256 values. source/ snapshots preserve exact versions for archived runs when code subsequently changes. FINAL_EVALUATION.txt, ACK_FOLLOWUP.txt and CLIPPING_ABLATION.txt identify the reviewed studies. LATEST.txt is merely the most recent run.

To replay an old run exactly, use its source snapshot and the embedded metadata configuration in a separate directory; compare episode metrics, not byte-identical gzip headers or timestamps. The current runner adds only a configurable mismatch window relative to the primary snapshot; the full policy's mathematics are unchanged. The extra exact-clip policy is a deliberately incorrect ablation, not a permitted production setting.

Outputs preserve previous runs by allocating new timestamped directories. A user-supplied --out path must not already exist. Main experimentation is O(episodes * steps * queue length); memory is dominated by retained representative trace dictionaries, while full raw traces stream directly to disk. Runtime is measured only for the whole simulation/logging loop, not a controller's worst-case execution time. Memory use was not benchmarked.

## Interrupted execution
One orchestration timeout left an incomplete gzip file without metrics/metadata. It is labeled INCOMPLETE.txt and contributes to no reported result. The archive omits that unusable partial raw byte stream while retaining the interruption record. All completed raw pilot and evaluation files are included.

## Integrity and authorship
MANIFEST.sha256 in the output directory records SHA-256 hashes for the delivered files, excluding the manifest itself and archive recursion. The archive has its own SHA-256 companion. A hash checks file integrity; it is not a trusted timestamp, a conception record, legal priority, proof of inventorship or a guarantee of reproducibility.

Technical assumptions, disclosure facts and human contributions remain separate records. Test and simulation execution was tool-assisted in this session, not personally performed lab work attributed to a named human.
