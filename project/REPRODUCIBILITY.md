# Reproducibility and integrity

## Verified execution environment
Python3.12.14 (MSC64-bit, bundled Windows runtime); ReportLab4.4.9 for PDFs; pypdf6.10.0 for PDF text checks; NumPy2.3.5 was available but is not required by the thermal simulator. The simulator, demo and tests use the Python standard library. Full platform strings and timing reside in each run_metadata.json. Arial system fonts are used by the PDF builder; fonts are not redistributed.

The delivered source does not import the source paper's models, code or raw data. The paper's public repository and manuscript were read as context. No supplied password or account credentials are stored in this package or needed to run it.

## Executed commands
From the project directory:
```text
python -m unittest discover -s tests -v
python demo.py
python run_experiments.py
python run_experiments.py --config config/evaluation.json
python run_experiments.py --config config/ack_followup.json
python run_experiments.py --config config/clipping_ablation.json
python build_documents.py
```

The unqualified experiment is the retained pilot (seeds 1000-1019). The final primary run uses seeds 2000-2019 and a strengthened nominal clipping baseline. Post-main actuator and clipping studies use seeds 3000-3019 and 4000-4019. A source/configuration amendment before final evaluation and separate follow-up protocols record the exact changes.

## Completed results and units
Primary:900 episodes, 810000 one-second sample transitions. ACK follow-up:100 episodes, 90000 transitions. Clipping ablation:120 episodes, 108000 transitions. Completed final/post-main total 1120 episodes, 1008000 transitions. Retained pilot:900 episodes, 810000 transitions. Each controller/scenario/seed run is an episode, not a separate motor or physical experiment.

Temperature is Celsius; state intervals are exported as absolute Celsius although the governor maintains Celsius rise. Applied/requested effort is a dimensionless aggregate proxy. Queue length and k are sample counts; the selected interpretation is one second per sample. Each raw row is a single simulated transition with pre-decision FIFO and posterior state interval.

## Files and replay
Each completed folder contains run_metadata.json, summary.csv, episodes.csv, example_traces.csv and raw_steps.csv.gz. Metadata contain actual parameters, seeds, duration and source/config SHA-256 values. source/ snapshots preserve exact versions for archived runs when code subsequently changes. FINAL_EVALUATION.txt, ACK_FOLLOWUP.txt and CLIPPING_ABLATION.txt identify the reviewed studies. LATEST.txt is merely the most recent run.

To replay an old run exactly, use its source snapshot and the embedded metadata configuration in a separate directory; compare episode metrics, not byte-identical gzip headers or timestamps. The current runner adds only a configurable mismatch window relative to the primary snapshot; the full policy's mathematics are unchanged. The extra exact-clip policy is a deliberately incorrect ablation, not a permitted production setting.

Outputs preserve previous runs by allocating new timestamped directories. A user-supplied --out path must not already exist. Main experimentation is O(episodes * steps * queue length); memory is dominated by retained representative trace dictionaries, while full raw traces stream directly to disk. Runtime is measured only for the whole simulation/logging loop, not a controller's worst-case execution time. Memory use was not benchmarked.

## Repository follow-up

The September 9 repository preparation adds independent boundary/property tests, isolated CLI integration tests, and GitHub Actions for Python 3.12/3.13 on Linux and Windows. The original 15-test review remains a historical record; see research/ADDITIONAL_TESTS.md for the expanded suite and actual execution results.

A CLI regression was corrected: relative output paths and absolute paths outside this project now complete successfully. The runner resolves the output directory before writing it. LATEST.txt stores a project-relative path for an output inside the project and an absolute path for an external output. Existing output directories are still rejected. This change concerns file paths only; src/governor.py and the simulation mathematics are unchanged. Archived run metadata and source snapshots retain their original hashes. Follow-up test runs are temporary fixtures and are not added to the research episode count.

## Interrupted execution
One orchestration timeout left an incomplete gzip file without metrics/metadata. It is labeled INCOMPLETE.txt and contributes to no reported result. The archive omits that unusable partial raw byte stream while retaining the interruption record. All completed raw pilot and evaluation files are included.

## Integrity and authorship
MANIFEST.sha256 in the output directory records SHA-256 hashes for the delivered files, excluding the manifest itself and archive recursion. The archive has its own SHA-256 companion. A hash checks file integrity; it is not a trusted timestamp, a conception record, legal priority, proof of inventorship or a guarantee of reproducibility.

Technical assumptions, disclosure facts and human contributions remain separate records. Test and simulation execution was tool-assisted in this session, not personally performed lab work attributed to a named human.
