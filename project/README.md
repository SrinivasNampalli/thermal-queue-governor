# Thermal Queue Governor

Research and patent-review package based on a supplied robot-motor predictive-maintenance paper. This is a scalar synthetic control demonstrator. Broad patent novelty has high prior-art overlap; human inventorship and filing readiness are unresolved.

## Run
Verified with Python3.12.14. Simulation and tests use only the Python standard library.

```powershell
python demo.py
python -m unittest discover -s tests -v
python run_experiments.py --config config/evaluation.json
```

Run from this directory. Each experiment creates a new timestamped results folder; no previous completed run is overwritten. The final900-episode evaluation took about47 seconds on the execution host, including raw logging. Your runtime can differ. Raw logs are tens of megabytes per large run.

For the two disclosed post-main studies:

```powershell
python run_experiments.py --config config/ack_followup.json
python run_experiments.py --config config/clipping_ablation.json
```

The preserved primary run is identified by results/FINAL_EVALUATION.txt. Separate pointers identify ACK_FOLLOWUP and CLIPPING_ABLATION. LATEST.txt means the most recently executed run; it is not necessarily the primary evaluation. Do not replace reviewed pointers with an unrelated run when regenerating reports.

## Contents
- src/governor.py: observer, queue admission and comparison policies.
- tests/test_governor.py: 15 original boundary and conditional-invariant tests.
- tests/test_governor_extended.py: 22 additional tests, including independent grid-oracle, delayed closed-loop, clipping, latch, and ACK-limitation checks.
- tests/test_experiments.py: 10 isolated CLI/data-integrity tests, including output-path regressions. The complete suite has 47 tests; see research/ADDITIONAL_TESTS.md.
- docs/: editable research paper, technical disclosure, 11 discussion claims/support matrix and guide.
- research/: exact search log, prior art, evidence/provenance, protocols/amendments, independent review and filing gaps.
- results/: completed primary, pilot and follow-up data plus source snapshots. One incomplete run is labeled.
- figures/: exact SVG explanatory figures and plot data.
- build_documents.py: reproducible report generator; requires ReportLab4.4.9 and Arial font files at the documented Windows path.
- REPRODUCIBILITY.md: environment, commands, hashes and limitations.

Delivered PDFs are review exports, not validated patent-office submission files. Markdown is the editable disclosure/claims format; no DOCX is implied.

## Result
In120 main valid-model episodes, the full controller had zero sampled limit breaches and delivered 90.4% of requested effort on average. A simpler constant cap also avoided breaches and delivered 67.1%. An inaccurate applied-action report caused113 containment misses while the internal flag remained valid in a separate follow-up. No hardware or network protocol is validated.

No paper code/data were imported. All new numerical parameters are synthetic. Read the source audit and prior-art challenge before making research-originality or patentability claims.
