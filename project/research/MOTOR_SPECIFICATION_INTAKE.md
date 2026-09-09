# Motor specification intake

Status on September 9, 2026: **awaiting the motor model and specifications from the owner**. The owner selected a specific motor instead of proceeding with a generic validation study. No particular product has been inferred or selected on the owner's behalf.

## First information needed

Provide the manufacturer and exact model/part number, preferably with a datasheet link or file. Identify the intended drive/controller if known. This is enough to begin checking what the manufacturer documents and what still needs measurement.

## Parameter and evidence worksheet

| Item | Current value or status | How it will be established |
|---|---|---|
| Manufacturer, motor family, exact part number | Not provided | Owner's selection and manufacturer datasheet |
| Motor topology and winding connection | Not provided | Manufacturer data; affects how current and resistance map to copper losses |
| Rated supply, current, speed, and load | Not provided | Datasheet plus intended operating point |
| Winding resistance and reference temperature | Not provided | Datasheet and, when available, calibrated measurement; distinguish phase from line-to-line values |
| Winding and housing thermal properties | Not provided | Manufacturer thermal data, mounting conditions, and identification experiments |
| Continuous and transient temperature limits | Not provided | Manufacturer specifications and application derating |
| Sensor type, position, accuracy, lag, and clipping ceiling | Not provided | Sensor/controller specifications and calibration |
| Driver, current regulation, current limit, PWM, and shutdown behavior | Not provided | Driver documentation and measurements |
| Cooling, enclosure, mounting, ambient range, and duty cycle | Not provided | Intended setup, photographs/drawings, and measured boundary conditions |
| FIFO latency, command units, timestamps, and actual-current feedback | Not provided | Controller/communications documentation and logged execution evidence |
| Independent reference temperature and protective cutoff | Not provided | Instrument selection and a bench-test procedure before physical testing |

A datasheet value is not automatically a verified worst-case bound. Unknown parameters remain unknown; illustrative defaults must not silently become specifications for the selected motor. A winding-temperature estimate and a casing-mounted sensor reading are distinct quantities.

## Validation gates

1. Record the exact motor, source documents, units, and applicable operating conditions.
2. Check whether the available averaged current/two-node thermal model can represent that motor and drive. Extend or replace it when required; for example, its present form does not model speed, back EMF, torque, or individual phase waveforms.
3. Establish parameter ranges and a commissioning procedure from documented or measured evidence. Reserve separate calibration and held-out conditions.
4. Publish a versioned protocol and source/configuration hashes before calibration and held-out evaluation. Select the real temperature limits, rather than importing the generic 105 C example.
5. Run software-in-the-loop trials in the documented computing environment. Keep synthetic truth separate from sensor/controller inputs and report all failures.
6. Assess the model against independent physical measurements when equipment and a test procedure are available. A VM run is software execution and cannot replace this gate.

The existing 1,120-episode scalar study and its headline performance numbers remain historical synthetic results. There are currently **zero motor-specific validation episodes and zero physical-motor test episodes** in this new validation phase.
