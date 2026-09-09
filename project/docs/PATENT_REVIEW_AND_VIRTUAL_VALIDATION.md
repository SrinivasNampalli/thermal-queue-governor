# Thermal Queue Governor

## Patent review and virtual-motor validation preparation

**Document authors: Srinivas Nampalli and Saathvik Gampa.** September 9, 2026. AI-assisted technical review; this supplement does not replace the preserved original study or dossier.

The owner reports equal (50/50) general technical contributions. Specific contributions, dates, supporting conception records, and patent inventorship remain unresolved. The project maintainer is SrinivasNampalli. Original-material rights remain reserved pending review.

## Review outcome

The expanded review maps all eleven discussion claims to eleven primary-source groups and records twenty-five exact search queries. There is substantial prior-art overlap in saturation-aware estimation, delayed command governors, thermal current limits, pending-command scheduling, finite-prefix safety checks, safe continuation, and quantized input selection. The evidence does not establish that this invention is unique.

The exact interaction of a censor-consistent scalar interval, an immutable accepted FIFO, every-prefix feasibility, maximum admissible grid effort, and a zero-input tail remains a narrow research subject. No inspected primary document was identified as disclosing every element together; the limited search does not establish its absence from the wider literature or make a predictable combination inventive. The detailed claim matrix and comparison locations follow in this packet.

## Completed review fields

| Field | Recorded state |
| --- | --- |
| Working project title | Thermal Queue Governor |
| Technical subject | Conditional scalar thermal command admission with clipped sensing and accepted FIFO commands |
| Document authors | Srinivas Nampalli; Saathvik Gampa |
| Contribution statement | User-reported equal general technical contribution; detailed allocation and dates not supplied |
| Implemented embodiment | Existing synchronous Python governor and interactive scalar prototype |
| Claims reviewed | Existing eleven discussion claims; original text preserved |
| Broad novelty assessment | Strong documented overlap; broad unique-invention framing unsupported |
| Narrow patentability | Unresolved; requires further combination analysis and professional review |
| Patent inventors, applicant, ownership | Not established by document author names or the 50/50 statement |
| Filing jurisdiction | Not selected; prior US-style discussion drafting is not a filing decision |
| Filing/submission status | No application, declaration, or inventor signature submitted by this work |
| Public disclosure | GitHub publication recorded separately; complete earliest-disclosure facts remain unresolved |
| Selected motor | Owner will provide the exact model and specifications |
| New motor-specific calibration / held-out episodes | Zero / zero |
| Physical motor test episodes | Zero |

## What the new test harness represents

The independent illustrative plant models drive current, winding temperature, housing temperature, and sensor temperature. Current-squared heating depends on temperature-dependent copper resistance. Separate thermal masses and conductances represent stored heat and cooling. A lagged sensor is clipped after bounded noise. The actual simulated winding state is never clipped.

The code separates requested effort, accepted FIFO effort, reported applied command, and actual simulated RMS current. Current can continue producing heat after a zero command. This is a useful challenge to the original model's actuator assumptions. It is an averaged thermal/current model, not a full electrical circuit, electromagnetic, speed, torque, or mechanical-load simulator.

The harness includes synthetic numerical and integration checks. Such checks verify software equations and accounting against artificial fixtures; they do not calibrate or validate the motor the owner intends to select. No generic study was run and relabeled as that motor. The draft protocol blocks study execution until it is finalized for the selected motor.

## Validation sequence and decision gates

1. Obtain the manufacturer, exact motor/variant, datasheet, and intended drive/controller.
2. Assess model suitability and record parameter sources, units, mounting/cooling conditions, sensor placement, and real operating limits. Do not import the illustrative 105 C threshold as a product specification.
3. Publish the finalized protocol and source/configuration identity before data collection. Keep calibration and held-out seeds/conditions disjoint.
4. Estimate declared allowances using calibration data only. A finite empirical envelope is not a global physical bound. Preserve model infeasibility and failed checks rather than tuning them away after testing.
5. Run paired held-out comparisons with clipping, dropout, changing ambient/load, and falsely reported actuation. Report winding peaks, containment misses, operating and reference-limit breaches, command throughput, and command/current differences separately.
6. Compare numerical resolutions and retain the raw traces and computing-environment receipt. A run on a GitHub-hosted VM verifies software execution, not a physical motor.
7. Plan independent physical measurements and protective hardware before any bench validation. No physical experiment has occurred in this phase.

## Evidence boundaries and next inputs

The historical study remains 1,120 final/post-main episodes and 1,008,000 transitions, with a separate 900-episode pilot. Its 90.4% effort and zero sampled breaches refer to 120 primary TQG episodes satisfying that scalar model's assumptions. They are not measurements from the new multi-state plant or a real motor. The original 47 Python tests passed again during this review, and the primary evidence recalculation reproduced the preserved figures without adding episodes.

The immediate required input is the motor's exact model and datasheet, plus its drive/controller if known. Human contribution records need actual technical ideas and approximate dates; an invented split would not provide that evidence. Filing decisions also require the missing jurisdiction, ownership, and disclosure facts.

Current records are linked from the [GitHub repository](https://github.com/SrinivasNampalli/thermal-queue-governor): the [search log](https://github.com/SrinivasNampalli/thermal-queue-governor/blob/main/project/research/PATENT_SEARCH_LOG_2026-09.md), [process log](https://github.com/SrinivasNampalli/thermal-queue-governor/blob/main/project/research/VALIDATION_PROCESS_LOG.md), [contribution record](https://github.com/SrinivasNampalli/thermal-queue-governor/blob/main/project/research/CONTRIBUTION_RECORD.md), and [draft harness protocol](https://github.com/SrinivasNampalli/thermal-queue-governor/blob/main/project/virtual_motor/PROTOCOL.md). The packet's following sections preserve the detailed review and motor intake worksheet.
