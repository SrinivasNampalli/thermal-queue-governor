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
