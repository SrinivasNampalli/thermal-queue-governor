# Additional software tests and repository preparation

Executed 2026-09-09T15:34:04.898785+00:00 on Python 3.12.8 (Windows).

**47 tests passed: 15 original, 22 new governor tests, and 10 new CLI integration tests.** The documented demo also passed. The exact test log, environment, and source hashes are in [release_checks/additional_tests.log](release_checks/additional_tests.log) and [release_checks/additional_tests.json](release_checks/additional_tests.json).

## Added coverage

- The governor tests compare 480 deterministic cases against an independent closed-form FIFO trajectory and exhaustive effort-grid oracle. They check the largest admissible effort, current and intermediate queue peaks, and sensitivity to FIFO ordering.
- Five delayed closed loops (0, 1, 7, 60, and 120 samples) cover 1,800 synthetic transitions with time-varying parameters inside the declared model box, bounded sensor noise, missing readings, and changing demand. They check interval containment and the conditional thermal limit.
- Boundary tests cover clipped and unclipped sensor laws, measurements below ambient within sensor error, commissioning intervals, nonfinite and out-of-range inputs, the 120-command queue boundary, invalid-state latching, and the analytical infinite zero-input tail.
- CLI integration fixtures reconcile raw transitions, episode metrics, and summary metrics; verify metadata counts and hashes; replay seeded runs; reorder policies and seeds; check FIFO/ACK records and selected traces; and confirm that the mismatch injection changes actual effort. These tests use disposable project copies and do not modify the archived study results or pointers.

## A limitation that remains

The ACK negative control deliberately reports zero effort while the plant applies full effort. From an initial rise of 80 C, true rise reaches 80.59 C while the observer upper bound is 79.64 C. With the next reading missing, the validity flag remains true. The test passes by reproducing this known failure outside the applied-effort contract; it is not evidence of protection against actuator mismatch.

## Defect fixed by the new tests

The experiment runner previously wrote completed outputs and then failed while updating LATEST.txt for a relative --out path or an absolute output outside the project. The runner now resolves the selected path before creating it, records a project-relative latest pointer for internal paths, and records an absolute pointer for external paths. Regression tests cover both cases and verify that an existing output directory and its contents are preserved when overwrite is rejected.

The controller implementation and simulation mathematics are unchanged. Original run metadata, source snapshots, PDFs, and workbook preserve the prior study. Temporary test fixtures do not increase the reported research episode count.

## GitHub automation and package

The repository workflow runs all 47 tests and the demo on Linux and Windows with Python 3.12 and 3.13. It has read-only repository permissions and pins the two GitHub actions to exact commits. Remote execution results are shown in the repository's Actions tab; this local report does not claim a remote result before it runs.

The full ZIP was rebuilt to include these tests, their evidence, and the workflow. The archive is checked against its manifest and its demo and tests are rerun after extraction. The current archive checksum is in PROJECT.zip.sha256 at the repository root. Historical 15-test statements in the original review exports describe that earlier review snapshot.

These are software and synthetic-model checks, not hardware certification, a proof of patentability, or a patent filing.
