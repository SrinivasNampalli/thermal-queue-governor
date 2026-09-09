# Frozen experiment protocol
Recorded before first evaluation run; exact UTC timestamp and SHA-256 are in protocol_freeze.json.

The hypothesis is that a queue-aware interval governor can preserve a sampled thermal upper limit in the stated scalar plant contract while delivering useful normalized effort during sensor clipping and missing observations. This is a synthetic thermal model, not a reproduction of the source paper or a robot safety certification.

## Primary decision gates
G1: zero hidden-state interval-containment failures and zero sampled temperature breaches for interval_queue in all in-contract scenarios. One such event falsifies the implementation/assumptions combination.
G2: report normalized applied effort divided by requested effort and compare with a simple robust constant cap. Mean delivered fraction >=0.50 in every in-contract scenario is the selected usefulness threshold; no universal superiority required.
G3: invalid sensor/queue inputs must invalidate the certificate; hidden model violations may remain undetected under clipping. Out-of-contract failures are preserved.
G4: assess whether ignoring pending commands causes breaches; if it does not, report the lack of evidence for queue differentiation.

## Design
Nine scenarios, 20 deterministic seeds (1000-1019), five controllers, 900 one-second transitions per episode. Six scenarios are in contract; three explicitly violate it. All parameters are selected illustrative values, not identified from the source paper. No learned model or tuning is used. Baseline thresholds (93/88 C), nominal midpoint parameters, and grid step 0.05 are fixed before evaluation. Stronger nonlinear motor MPC is out of scope; nominal_queue includes the same delay information and future-zero horizon as the candidate.

Exogenous a,b,w,sensor noise, initial truth, dropout masks, requested effort and hidden violation events are identical within each scenario-seed pair. Each controller generates its own plant state and resulting observations. The policy API receives only current observed sensor packet, finite startup interval, accepted pending commands, and requested action; hidden state, future disturbances, and labels are available only to evaluator.

## Scenarios
no_delay: baseline sensor noise and varying demand; queue length zero.
delay_8: eight accepted commands may execute before a new command.
delay_20: same with 20-step latency.
dropout_60: delay eight plus a 60-second missing-sensor block and seeded isolated missing samples.
hot_start: initial true temperature near 99 C, interval [68,75] C above ambient and queue initially zero; clipped start has finite commissioning bound.
upper_corner: a,b,w exactly at declared upper bounds, delay 20 and missing-sensor block.
model_violation: hidden a=0.998 and b=1.45 after step 250, exceeding the model box.
stuck_low: sensor returns 60 C after step 250.
queue_mismatch: simulator executes an unreported effort of 1.0 during steps 250-274.

## Metrics and interpretation
Raw rows retain time, truth, sensor, requested/accepted/applied actions, observer interval, validity, predicted peak, queue and cumulative effort. Per-episode metrics are maximum temperature, breach samples, episode breach indicator, effort fraction, clipped/missing samples, invalid states, and interval misses. Timing is measured for the entire computation, not a controller deadline guarantee. Aggregate means and paired comparisons treat each seed as the sampling unit; distributions here are illustrative scenarios, not an empirical industrial population. All traces and negatives remain in the package.

## Boundary checks
Unit tests cover censored measurement intersection, no finite upper bound at startup, empty intersection, nonfinite action, invalid model, thermal zero-input terminal invariance, queue overflow/invalid values, queue-aware rejection, observer containment at interval corners, and sampled invariant behavior. Simulation-only pass does not establish calibrated bounds, actuator acknowledgment correctness, intersample peaks, winding-to-sensor lag, holding torque, or physical safety.
