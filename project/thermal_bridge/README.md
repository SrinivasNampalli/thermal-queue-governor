# Guarded thermal bridge concept experiment

A separate sensor-module investigation: independently change a cooling bridge and a thermal guard to distinguish winding heat from lead losses. See the [technical design](../research/GUARDED_THERMAL_BRIDGE.md) and [prior-art comparison](../research/THERMAL_BRIDGE_PRIOR_ART.md).

Run from the repository root:

```sh
python project/thermal_bridge/model.py --check
python -m unittest discover -s project/thermal_bridge/tests -v
```

Omit `--check` to regenerate `results.json`. Verification preserves decisions and uses numeric tolerances of 1e-10 relative / 1e-8 absolute to allow last-bit mathematical-library differences across operating systems. The interactive [offline page](../../thermal-bridge.html) replays those actual computed traces; it does not execute a physical device. The template and build export live under `demo/`.

`model.py` uses exact one-state exponential evolution with prescribed source, guard and housing boundaries. The estimator receives only measured observations and nominal shunt calibration. Ten constructed cases include six rejected faults/conditions and two known false-consistency cases. These are neither randomized motor episodes nor measured accuracy claims. The separate motor-specific study remains pending specifications.

The reported energy is heat through the modeled bridge, not total electrical energy. Guard actuation, mechanical switches, sensor electronics and motor dynamics are not modeled. `consistent` is a model-fit result, never an authorization to drive a motor.
