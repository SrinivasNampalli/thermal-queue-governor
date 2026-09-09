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
