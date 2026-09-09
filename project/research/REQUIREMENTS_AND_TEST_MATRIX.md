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
