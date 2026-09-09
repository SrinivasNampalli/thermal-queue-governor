The workbook builder uses the bundled @oai/artifact-tool package. Set up a node_modules junction to the bundled runtime package directory, then run the builder with the workspace root as its argument (the root containing outputs/project). It reads completed result pointers and writes RESULTS_DATA.xlsx plus QA files. It does not run new experiments.

## September 2026 review PDFs

From the repository root, run `python project/tools/build_review_documents.py` on Windows with ReportLab and the Windows Arial fonts available. This renders the current manuscript and the review/validation-preparation packet. The packet combines its Markdown introduction with the expanded claim review and motor intake worksheet. The builder does not regenerate the historical dossier, source snapshots, raw experiments, workbook, or exported figures.

PDF author metadata follows the current document authors, Srinivas Nampalli and Saathvik Gampa. Re-render and visually inspect every page after changing the source. The existing `project/build_documents.py` remains the full historical-package builder; only use that full build when intentionally refreshing all of its outputs.
