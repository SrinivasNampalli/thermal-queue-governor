# Original delivery checks (before GitHub publication)

2026-09-09T05:43:27.522Z

The original PDFs have selectable text and were rendered and visually reviewed on every page. The dossier has 68 pages, research manuscript 8, technical disclosure 9 and guide 2. Two separate AI visual-review passes covered all 68 dossier pages; root reviewed the standalone PDFs. Earlier blank-page, orphaned-record, split-claim and codeblock defects were corrected.

The two-sheet results workbook contains 1120 episodes and 61 formula summary groups. Independent data controls, formula recalculation, error scan, export inspection and visual review passed. Desktop Excel was not tested.

The 15 implementation tests and documented deterministic demo pass. The archive is built with a file-hash manifest and its source entry points are rerun after extraction; archive verification is recorded in PROJECT.zip.sha256 and the external verification log. Hashes are integrity records, not priority or inventorship proof.

Outcome: scalar simulation demonstrated; physical implementation untested; broad novelty framing rejected; narrow patentability unresolved; human inventorship/ownership and filing facts unresolved. No account login, publication, signature, payment or application submission occurred. Supplied credentials are not in the deliverables.

## Historical September 9 repository follow-up

The additional software verification is recorded in project/research/ADDITIONAL_TESTS.md and its release_checks log/JSON. The suite now contains 47 tests. Relative and external experiment-output paths are fixed without changing the controller mathematics. The PDFs and workbook remain the reviewed original study exports. The updated ZIP and manifest include the additional tests and GitHub workflow. Repository publication is now authorized by the user; it is separate from any patent filing.

## Historical interactive demo and recording follow-up

The separate `demo/` folder adds 16 selectable motor/drive component groups, an exploded view, explanatory component descriptions, and the thermal simulator. Its 23 JavaScript tests pass, and Chromium acceptance checks cover all 16 direct component clicks, keyboard selection, play/pause/step, waiting expiry, and four viewport widths. The Python suite was rerun and all 47 tests pass.

The MP4 is an actual browser recording of the shipped synthetic demo, approximately 52 seconds long, with on-screen captions. Representative frames were inspected for readable hardware, sensor clipping, and result metrics. The README GIF is an excerpt of that recording. The exact encoded duration and recording provenance are in `demo/media/recording.json`.

The `docs/` directory is a generated copy for GitHub Pages. The root manifest covers the current repository files other than itself. `PROJECT.zip` remains the earlier research bundle with its historical internal manifest; the interactive demo and video are distributed separately. These changes add software and explanatory geometry, not new research episodes or hardware-validation evidence.

## Historical landing page follow-up

The repository-root `index.html` is now a complete, offline landing page with the existing interactive simulator. `docs/index.html` is the identical GitHub Pages copy; `docs/prototype.html` preserves the earlier compact simulator. Added content covers the problem, control flow, scoped results comparison, and patent discussion status. Its local vendor assets include publisher provenance and license texts. Offline browser acceptance checks cover both models, all 16 component selections, controls, research-scope disclosure, motion preferences, and desktop/mobile widths. No controller mathematics or historical study results changed.

## September 9 review corrections

The preceding sections preserve the checks and packaging of earlier deliveries. Their descriptions of committed duplicate exports, the tracked ZIP, and an identical public/offline landing page no longer describe the current build.

- **Responsive and accessible interface:** related simulator layout rules now share the 780-pixel breakpoint, with 768 pixels explicitly checked by the browser suite. Three polite live regions separate control/component feedback, command admission, and thermal/results summaries. Running admission announcements are limited to once per five wall-clock seconds; thermal/results summaries to once per 15 seconds. Pause and step provide immediate summaries. The silent video's English VTT captions default to enabled.
- **Public and offline packaging:** the reviewed local build emits a 51,413-byte public HTML document with deferred same-site scripts and SHA-384 integrity checks. The root offline HTML is 1,069,508 bytes with dependencies embedded. The compact prototype also bundles the pinned libraries and is linked from the landing page. These are uncompressed document sizes, not measured rendering or download times.
- **Current source tree:** generated `docs/`, compact exports, and intermediate build artifacts are removed from tracking; the Pages workflow builds the publication artifact. Media is tracked once under `demo/media/`. The historical `PROJECT.zip` is removed from the current tree and designated for a release attachment, retaining its existing checksum. No Git history purge is recorded here. Release upload, repository rename, deployment, and CI completion require their own external verification.
- **Portable experiment paths:** `LATEST.txt` and newly written source-hash metadata keys use forward slashes. Ten isolated CLI tests passed locally, including direct serialized-path checks with Windows and POSIX parsing. Original run metadata, snapshots, and simulation mathematics are preserved.
- **Research evidence:** [PRIMARY_EVIDENCE.md](project/research/PRIMARY_EVIDENCE.md) reports 20 paired seed clusters, a 20,000-replicate bootstrap, and the primary TQG peak of 104.99997190667195 °C. Its uncertainty intervals describe the selected synthetic design. The manuscript now explicitly discusses the near-limit numerical result and does not present it as an engineering safety margin. The reanalysis adds no research episodes or physical measurements.

The rights notice and citation metadata distinguish public access and maintainer attribution from reuse permission, ownership, or patent inventorship. Earlier visual review and test records remain historical evidence; they do not automatically certify later source changes or revised PDF exports.
