# Source-paper boundary and discrepancy record

Source supplied: CCTA26_0150_FI (2).pdf, seven pages. Title: Control-Aware Predictive Maintenance of Industrial Robot Motors Using Multi-Sensor Fusion and FDIR Integration. Authors printed in the source: Srinivas Nampalli, Sri Tanav Kambhampati, Saathvik Gampa, Siavash Farzan. These are source attributions, not inventorship assignments for this project. All seven pages were extracted and visually inspected; Figure 6 was inspected at higher resolution.

## Already disclosed
Pages 2-3 disclose aligned temperature/voltage/position features, proxy IQR labels, classifier comparison and FDIR. Page 4 expressly treats sustained near-ceiling temperature as censored evidence and biases recovery toward throttling. Page 6 identifies FDIR as a deployment blueprint. Adding sensor fusion, censored-temperature detection, or a generic FDIR stop ladder therefore is not this project's proposed contribution.

## Unresolved internal discrepancy
Page 4 Table II reports RF ROC-AUC 0.871. Page 5 Table IV reports counts 7234, 876, 724, 2284 (total 11118). Page 6 Figure 6 instead displays RF and XGBoost AUC=1.000 and counts 12551, 0, 2, 4436 (total 16989). These figure/table results cannot describe the same test set and operating point as presented. Possible stale plotting artifacts are an inference, not an established explanation. The authors should reconcile figure generation and dataset partitions. This project neither reproduces nor chooses between those results.

Page 2 also says a difference of accumulated encoder positions is invariant to re-zero events. An uncorrected reset produces a jump in consecutive differencing; reset metadata or coordinate compensation would be needed. This observation is a mathematical audit of the statement, not a claim that the supplied implementation mishandles resets.

## Public source check
The manuscript's linked [GitHub repository](https://github.com/tanav-kambhampati/robot-motor-pdm-fusion) was publicly readable during this session. The repository overview and README were inspected; source code and raw data were not reproduced. The repository labels its license section as submitted for IEEE publication review, which is not an explicit reuse license. No source code/data was imported into this project. The earliest publication of that repository, the manuscript, or each disclosed feature remains unknown; obtain exact version/date records from the authors.

## Consequence for this project
The follow-up uses the clipping/FDIR context to motivate a separate, synthetic control study. None of the paper's reported classification scores, raw measurements, execution latencies, or model parameters is represented as reproduced evidence. A scalar motor-rise model, noise bound, latency and temperature limit are explicitly selected assumptions. Current/effort sensing and an accepted-command interface are additional requirements absent from the provided dataset description.
