# Independent virtual-motor test harness

**DRAFT · SIMULATION ONLY · awaiting the selected motor's specifications.** No calibration or held-out study has run. The current numeric values are illustrative placeholders used only for synthetic software-verification tests. A Python process on Windows is not an actual motor and does not by itself establish virtual-machine execution.

This harness connects the unchanged scalar `project/src/governor.py` controller to a separate four-state plant. `plant.py` contains no controller recurrence: current follows a first-order drive response, copper heating depends on current squared and winding resistance, winding/housing temperatures exchange heat through thermal conductances, and a separate sensor state introduces lag. Current-loop heat remains after a zero command.

The reusable runner provides paired TQG/fixed-cap comparisons, clipping/dropout and actuator/environment challenges, operating-ceiling and physical-ceiling metrics, resolved intersample winding peaks, deterministic disjoint seeds, a separate calibration phase, source/configuration snapshots and hashes, compressed raw CSV, aggregate CSV/JSON, and numerical step-refinement checks. These facilities are not results or physical validation. See the [draft protocol](PROTOCOL.md).

## Run synthetic software checks

From the repository root, with Python 3.12 or later and the standard library:

```sh
python -m unittest discover -s project/virtual_motor/tests -v
```

The tests check analytical current/thermal solutions, energy accounting, sensor lag, current-tail heating, resolved intersample peaks, and the controller/FIFO adapter. Small artificial test fixtures do not constitute calibration or the proposed 72-episode study.

The full calibration/held-out dataset-writing sequence has not been executed as a study. The local software-check receipt is `VERIFICATION.json`; it records the actual runtime, test count and source hashes. A passing energy balance alone is insufficient: independent analytical heating and fast-sensor regressions also check integration accuracy.

The experimental command is deliberately blocked while `protocol.json` is DRAFT. After the motor-specific protocol is reviewed, finalized, and set to a `FROZEN` status, the intended two-phase sequence is:

```sh
python project/virtual_motor/run_virtual_motor.py calibrate --out project/virtual_motor/results/CHOSEN_RUN_ID
# Publish the frozen source, protocol, and calibration snapshot before held-out execution.
python project/virtual_motor/run_virtual_motor.py validate --run project/virtual_motor/results/CHOSEN_RUN_ID --protocol-commit FULL_40_CHARACTER_COMMIT_SHA
```

Never modify the snapshot or calibration to make held-out results pass. Source/config changes require a new run directory and a new protocol. The runner leaves earlier outputs untouched. The publication commit argument records the caller's supplied commit; the runner does not independently query GitHub or prove the time of publication.

## Model and units

With current `I` in A and temperatures in °C, the equations are:

```text
dI/dt  = (I_rated × drive_effort × load_factor − I) / tau_current
R(Tw)  = R20 × [1 + alpha × (Tw − 20)]
Cw dTw/dt = I² R(Tw) − Gwh (Tw − Th)
Ch dTh/dt = Gwh (Tw − Th) − Gha (Th − Ta)
dTs/dt = (Tw − Ts) / tau_sensor
reading = min(Ts + bounded_noise, clipping_ceiling), or missing
```

`Cw`/`Ch` are J/K, `Gwh`/`Gha` W/K, resistance Ω, time constants seconds, and copper coefficient 1/K. `R20` is an **effective copper-loss resistance for the chosen current convention**: phase resistance, line-to-line resistance and RMS/peak currents cannot be substituted without conversion. Current is solved analytically; temperatures use RK4. Energy accounting uses the same RK4 quadrature for Joule input and ambient heat flow. No temperature state is clipped; only the sensor reading is clipped.

The integration step is the smaller of the requested maximum and limits from current, sensor and thermal time scales. Actual substeps are logged; a numerical refinement scales all these limits. Very fast dynamics can substantially increase runtime, and an advance requiring over one million substeps fails explicitly instead of returning an under-resolved result.

The normalized drive command is not actual RMS current. RMS current is integrated analytically over each sample and logged separately, including normal drive transients and deliberate false acknowledgments. This is an averaged current/thermal model, not a PWM, electromagnetic, rotor-speed, torque, mechanical-load or full-circuit simulator. Resolved peaks are numerical observations, not mathematical continuous-time bounds.

## Motor information needed

- Manufacturer, exact model/variant, datasheet and intended drive/controller.
- Rated/continuous and peak current, duration limits, and whether values are phase/line, RMS/peak.
- Winding resistance, reference temperature and phase/line convention; winding material or temperature coefficient.
- Winding and case temperature limits, normal ambient range, cooling/mounting conditions and desired operating margin.
- Winding→housing and housing→ambient thermal resistances and time constants/capacities, or independent heating/cooling measurements to estimate them.
- Current-loop response or control bandwidth, current measurement availability, and how actual applied effort is acknowledged.
- Sensor type/location, response time, accuracy/noise, clipping ceiling, sampling period and dropout behavior.
- Command/actuation delay, queue semantics, and a representative workload or operating cycle.

Missing quantities must remain explicit uncertainty assumptions or require additional measurement. Datasheet agreement and software checks alone do not establish physical motor safety.
