# Reference-excited bridge research

**Software verification of hypothetical thermal networks. No physical validation, calibrated motor, or motor operating permission.**

Read the [technical revision and known failure](../research/REFERENCE_EXCITATION_REVISION.md), [prior-art screen](../research/REFERENCE_EXCITATION_PRIOR_ART.md), and [unexecuted bench protocol](../research/REFERENCE_EXCITATION_BENCH_PROTOCOL.md). The [interactive evidence report](https://srinivasnampalli.github.io/thermal-queue-governor/reference-bridge.html) shows all stationary cases and the separate finite-rate challenge. It supplements the original three-dimensional explanation; its revised reference actuator is not part of that historical replay.

From the repository root, using Python 3.12 or 3.13 (standard library only):

```sh
python -m unittest discover -s project/reference_bridge/tests -v
python project/reference_bridge/model.py --check
python project/reference_bridge/dynamic_challenge.py --check --summary
```

To regenerate evidence deliberately, omit `--check` on `model.py` and run `dynamic_challenge.py --output project/reference_bridge/dynamic_results.json --summary`. Rebuild the page with `python demo/tools/build_demo.py`.

`protocol.json` fixes 14 stationary scenarios and the acquisition/qualification assumptions used for the first saved run. `results.json` contains observations, raw synthetic traces, evaluation-only truth, and exact rational primal/dual certificates. `dynamic_results.json` contains three independently integrated finite-rate cases, observable settling decisions, step-refinement and energy checks. `VERIFICATION.json` records completed local commands and source/data hashes; GitHub Actions provides its own commit-linked execution logs.

The estimator sees observations and declared error bounds only. A 130 °C source with the modeled reference bypass is recovered at the point-estimate level, but its 113.7–158.3 °C interval fails the proposed precision criterion. An additional unexcited ambient leak still produces a false 85 °C result. Both outcomes are preserved. Passing a regression that demonstrates a failure means the failure remains reproducible; it does not mean the apparatus passed validation.
