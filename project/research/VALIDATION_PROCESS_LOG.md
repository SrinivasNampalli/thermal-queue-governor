# Patent review and validation process log

## September 9, 2026 - initiation and scope

The owner requested an expanded patent review, documented virtual-motor testing on GitHub, and document authors Srinivas Nampalli and Saathvik Gampa. The owner's later reply reports equal (50/50) general technical contributions. Specific conception facts, dates, and claim-level attribution have not been supplied and are not inferred from that percentage. See [AUTHORS.md](../../AUTHORS.md) and the append-only [contribution record](CONTRIBUTION_RECORD.md).

The expanded prior-art search is a dated technical challenge review, not a finding of patentability or a freedom-to-operate opinion. Search queries, accessed references, and limitations are retained in the new review and search log. The original claims and earlier search records remain available.

## September 9, 2026 - model preparation and owner selection

An illustrative software-in-the-loop test harness was proposed with four independent plant states: current, winding temperature, housing temperature, and lagged sensor temperature. Its purpose is to challenge assumptions omitted by the original one-state simulator, including delayed heat and command/current mismatch. Its numeric defaults were not measured on a motor.

Before calibration or held-out data was generated, the owner selected **a specific motor and will provide its model and specifications**. Accordingly, the illustrative protocol remains a draft and no 72-episode held-out study is represented as complete or preregistered. Synthetic engineering tests may exercise the equations and runner; those are software verification, not validation of the owner's motor. See the [motor intake worksheet](MOTOR_SPECIFICATION_INTAKE.md).

The planned sequence is motor selection, source/specification review, model suitability assessment, protocol/source freeze, calibration, held-out software-in-the-loop evaluation, and later independent physical validation. Each data phase must have an explicit source/configuration identity and retain negative outcomes. Historical studies must not be pooled with these new phases.

## Execution environment and evidence rules

Local preparation uses Python on the owner's Windows computer. A Python process is not described as a local VM. The repository's Python checks also run on GitHub-hosted Linux and Windows runners; those standard runners use VMs according to [GitHub's runner documentation](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners). A completed Actions job is evidence that those software checks ran in that environment, not evidence of a physical motor or a calibrated digital twin.

The GitHub Actions workflow log and its commit identifier are the authoritative execution record. A job not yet completed is pending. Test counts, execution links, and results are added only after the corresponding checks actually finish. Software tests and future calibration/refinement runs are counted separately from held-out motor validation episodes.

## Outstanding inputs

- Exact motor model/datasheet and intended drive/controller.
- Specific human technical contributions, approximate dates, and any existing evidence.
- Filing jurisdiction, applicant/ownership facts, and complete public-disclosure timing for a professional filing review.

No application, declaration, inventor signature, ownership assignment, or patent-office submission has been made by this work.

## September 9, 2026 - numerical review and correction

Independent code review found that solving current endpoints analytically did not automatically resolve the heat integral between them. In an artificial isolated-winding fixture with a 0.1 ms current time constant and a requested 25 ms step, the initial implementation returned 0.653333 J rather than the analytic 0.00784 J. Its internal energy balance still closed because both sides used the same inaccurate quadrature. This was a software defect, not a measured motor result.

The plant now limits its numerical step using the current, sensor, and thermal time scales, and reports the actual substep count. A separate rerun of that fixture returned 0.007840010613933059 J across 2,000 substeps, a relative error of approximately 0.0001354%. Regression checks cover that current tail, fast sensor lag, analytical thermal behavior, and the FIFO/controller adapter. These checks establish behavior for their fixtures, not a general numerical error certificate or physical validation.

The historical 47-test Python suite passed again and the original primary evidence recalculation reproduced its stored values. The updated website passed offline, reduced-motion, component-selection, simulation-control, and 320-1440 px layout checks. All eight updated manuscript pages and all eleven supplement pages were rendered and visually inspected. New VM execution results are recorded only after the GitHub jobs complete.

The new harness has **24 passing synthetic software tests** on local Python 3.12/Windows. The [verification receipt](../virtual_motor/VERIFICATION.json) records the tested source hashes and zero calibration/held-out executions. Both experiment phases reject a DRAFT protocol. The full dataset-writing workflow remains unexecuted pending selected-motor specifications; the passing unit/integration fixtures must not be presented as completion of that workflow.
