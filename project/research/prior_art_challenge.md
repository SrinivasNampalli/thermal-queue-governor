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
