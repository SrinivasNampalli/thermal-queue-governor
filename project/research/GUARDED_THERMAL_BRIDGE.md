# Guarded Thermal Bridge Interrogator

Engineering candidate and executable mechanism experiment — September 9, 2026.

Document authors designated by the user: Srinivas Nampalli and Saathvik Gampa. This particular concept, implementation, and constructed experiments were developed with AI assistance in this session; specific human conception is not assigned by this document.

## The proposed device

A small sensor module attached to a motor winding uses **two independently controlled thermal paths** to distinguish a hot winding from a sensor that is being cooled through its wires. One actuator cools the sensing pad through a calibrated bridge. A second actuator changes the temperature of a guard collar through which the pad's leads and substrate paths are routed. The controller observes how the pad responds to both changes.

The intended useful output is a conditional estimate of winding temperature, attachment conductance, and heat leakage through the leads, even when the original temperature channel is clipped. This changes the measurement hardware and its interrogation procedure. The existing FIFO governor is a separate project component and is not modified by this experiment.

[Run the interactive concept](https://srinivasnampalli.github.io/thermal-queue-governor/thermal-bridge.html) · [Executable model and results](../thermal_bridge/) · [Focused prior-art comparison](THERMAL_BRIDGE_PRIOR_ART.md)

This is a new candidate in this project, not an established first invention worldwide. Earlier patents already describe switched cooling thermometry and active thermal guards. The specific interaction under investigation is independent cooling-path and guard excitation to separate winding coupling from parasitic coupling in a clipped measurement system. Its novelty and practical value remain questions to test.

## Why the second actuator matters

Consider a 130 °C winding attached to a sensor through a thermal conductance of 0.020 W/K. Its leads also conduct 0.020 W/K to a 40 °C housing. Switching a calibrated cooling bridge between 0.020 and 0.050 W/K produces settled sensor readings of 70 and 60 °C.

A two-state estimator that ignores lead losses returns **85 °C**, not 130 °C. Adding more cooling settings cannot fix this particular ambiguity: the winding and cold lead path look exactly like one intermediate-temperature source.

The proposed guard changes the lead-path endpoint independently. Raising the measured guard from 40 to 65 °C while setting the bridge to 0.035 W/K gives a third sensor temperature of 70.6667 °C. Those three observations distinguish the two conductances and reconstruct 130 °C. A fourth setting, 0.040 W/K with a 50 °C guard, is withheld from the fit and predicts a sensor reading of 65 °C.

These are exact ideal-model calculations. The comparator is deliberately misspecified to expose a physical ambiguity. It is not a performance win over a correctly instrumented commercial thermometer or a full thermal-network estimator.

## Physical embodiment to investigate

| Part | Proposed function | What still needs physical evidence |
|---|---|---|
| Electrically insulated sensing pad | Contact an end winding through a stable, unknown thermal bond | Dielectric integrity, local temperature uniformity, repeatable attachment and thermal mass |
| Temperature element and limited readout | Measure pad temperature; explicitly flag saturation | Whether clipping occurs in electronics/software or in the sensing element; calibration and self-heating |
| Guard collar around pad supports and leads | Route significant unwanted heat paths to a measured, controlled temperature | Three-dimensional heat-flow analysis, bypass leakage, convection and radiation |
| Bidirectional guard actuator and thermometer | Change the guard boundary independently of the bridge | Control bandwidth, spatial uniformity, electrical isolation, power and heat rejected to housing |
| Calibrated bridge to housing | Select several known effective thermal conductances without moving the winding bond | Conductance versus contact pressure, temperature, wear and vibration; switching repeatability |
| Housing reference thermometer | Measure the actual cold endpoint for each observation | Location error and housing gradients |
| Acquisition controller | Sequence challenges, reject clipping, fit parameters and check the withheld state | Measurement uncertainty, numerical conditioning, timeouts, independent protection and fault behavior |

A bench embodiment could use a small ceramic pad, a thermoelectrically controlled guard, and mechanically selected conductive links to a temperature-controlled reference block. Their conductances must be measured in the assembled geometry. A motor-integrated miniature switch, its dimensions, durability and manufacturing process are not yet designed. The diagram is a functional hardware schematic, not a fabrication drawing.

The simulator prescribes guard and housing temperatures as ideal boundaries. It does not simulate the actuator, sensor electronics, housing heating, insulation, wiring circuit, or motor. In particular, reported bridge heat is not total device power and excludes guard power. Routing all important leakage through the guard is a physical design requirement, not something the software can assume has been accomplished.

## Governing equations and identification

Let `Ts` be the sensing-pad temperature, `Th` the winding contact temperature, `Tg` the measured guard temperature, and `Tc` the measured bridge endpoint. Let `Gb` be winding-to-pad conductance, `Gl` pad-to-guard conductance, and `Gi` the calibrated bridge conductance at setting i. The illustrative pad heat capacity is `Cs = 0.04 J/K`.

```text
Cs dTs/dt = Gb (Th - Ts) + Gl (Tg - Ts) - Gi (Ts - Tc)
y = min(Ts, 95 °C)
```

At equilibrium, define `qi = Gi (Tsi - Tci)`. Then:

```text
qi = A - B Tsi + D Tgi
A = Gb Th       B = Gb + Gl       D = Gl
Gb = B - D      Gl = D            Th = A / Gb
```

Three independent states give three equations. The implementation fixes the guard at one temperature for A and B, changes it for C, and obtains:

```text
B = (qB - qA) / (TsA - TsB)
D = (qC - qA + B (TsC - TsA)) / (TgC - TgA)
A = qA + B TsA - D TgA
```

Separation of A/B pad temperatures and a distinct guard temperature are essential. Division by near-zero inferred winding conductance makes source temperature unobservable. The fourth observation is not reused to improve the fit; its residual can reject some model failures, but cannot prove the model complete.

The model integrates each constant-boundary interval with its exact exponential solution and analytically integrates heat through the bridge. Estimation receives only observed pad, guard and housing temperatures, stated bridge conductances, and clipping/settling flags. The source temperature and true conductances are available only to the synthetic plant and the evaluation display.

## Implemented interrogation sequence

1. Record a 3-second resting interval. The nominal fixture's pad starts above the 95 °C readout ceiling.
2. Apply A and B: 20 seconds each at bridge conductances 0.020 and 0.050 W/K, with guard at housing temperature.
3. Apply C: 20 seconds at 0.035 W/K, with guard 25 °C above housing. This is the independent guard probe.
4. Apply D: 20 seconds at 0.040 W/K, with guard 10 °C above housing. This is the unused consistency challenge.
5. Use each phase's final two seconds. Reject clipping/near-clipping, nonfinite data, observed settling rate at or above 0.02 °C/s, less than 2 °C A/B separation, inadequate guard excitation, nonphysical fitted conductance, inferred bond below 0.008 W/K, or a D residual above 0.75 °C.

All thresholds and 83-second duration are illustrative research settings. The estimator returns a point estimate and `consistent` or `inconclusive`. It does not calculate a validated safety interval or authorize motor operation. Each plateau can look settled while the source changes between plateaus. A real operating motor may not remain sufficiently stable for this protocol.

## Executed evidence

The [stored result file](../thermal_bridge/results.json) contains ten constructed cases with time traces, observable inputs, decisions, and integrated bridge heat. They are separate from all previous TQG episodes and from the pending motor-specific validation study.

| Constructed case | Result | What it demonstrates |
|---|---|---|
| Nominal 130 °C source; 0.005 W/K guarded leakage | Consistent; estimate about 130 °C | Pad clipping recovery and joint parameter fit in the assumed model |
| Strong 0.020 W/K guarded leakage | Consistent; estimate about 130 °C | Separates the leakage that makes the shunt-only comparator report 85 °C |
| Weak 0.003 W/K bond | Inconclusive | Fitted attachment falls below the illustrative threshold |
| Fully detached pad | Inconclusive | Does not identify the source from an unattached pad |
| Housing at 100 °C | Inconclusive | Passive bridge cannot obtain the required unclipped readings |
| Winding rises 10 °C before D | Inconclusive; about 3.077 °C residual | Detects this particular inter-stage source change |
| D bridge delivers 70% of calibration | Inconclusive; about 6.444 °C residual | Detects this particular actuator/calibration fault |
| Every bridge delivers 50% of calibration | **Consistent despite a weak actual bond** | Common scale error biases both fitted conductances; consistency is insufficient |
| Extra 0.020 W/K path bypasses guard to housing | **Consistent; false 85 °C estimate for a 130 °C source** | Unmodeled parallel leakage can defeat every challenge |
| Readout fixed at 75 °C | Inconclusive | An unchanging plausible reading lacks the required excitation response |

Thirteen software tests cover analytical equilibria, flux/energy balance, the independent identification fixture, clipped/unsettled/invalid inputs, detachment, observable-only estimation, step refinement, all case outcomes, the shunt-only counterexample, and a finite measurement-error sweep. Exact integration is for this one-state constant-boundary model only.

For the strong-leakage fixture, 81 combinations of pad errors in `{-0.1, 0, +0.1} °C` produce up to **5.18455 °C** source-estimation error despite perfect reference and bridge calibration. All remain consistent in that finite test. The first proposed 3 °C sensitivity assertion failed; the report and regression now preserve the observed larger error. This is sensitivity evidence, not an accuracy guarantee or exhaustive noise validation.

## Conditions that can defeat the design

An unmeasured direct-to-housing conductance `Gx` changes the fitted winding parameters to:

```text
Gb_fit = Gb + Gx
Th_fit = (Gb Th + Gx Tc) / (Gb + Gx)
```

This ambiguity survives all bridge and guard settings. More challenge points do not remove it. Independent physical characterization must constrain such bypasses. Similarly, a common multiplier on all bridge conductances can be absorbed into both fitted conductances, so absolute bond qualification needs independently traceable calibration.

Other unresolved effects include source drift, thermal gradients, multiple winding hotspots, radiation, airflow, changing attachment during switching, readout offsets, guard thermometer error and actuator lag. The thermal source held constant in most fixtures is an assumption, not a finding about a real motor.

## Narrow invention question and next decisive experiment

The candidate combination is: an electrically insulated motor-contact pad; a calibrated selectable cooling bridge that brings the pad readout below saturation; a separately controlled measured guard that intercepts parasitic paths; an excitation sequence making winding and guard coupling separately identifiable; and a withheld boundary challenge before reporting a conditional reconstruction. Merely cooling a sensor, adding a guard, solving linear equations, or checking a residual is not claimed here as independently new.

The next physical experiment is a heated coupon with an independent reference thermometer. Compare a direct wider-range sensor, shunt-only reconstruction, and the proposed guard protocol on the same coupon. Intentionally vary attachment and add measured guard-bypass paths. Measure uncertainty, reconstruction error, total actuator energy, time, and whether the guard can be built with sufficiently small unknown bypass. If its error/cost/time is worse than replacing the clipped channel with a suitable sensor, the practical case fails. If unsafe underestimation remains compatible with calibrated uncertainty, this candidate cannot be used for motor safety admission.

No motor model has been selected from supplied specifications, no physical coupon or motor has been run, and no patent application has been filed. These experiments make the design concrete and falsifiable; they do not resolve inventorship, novelty or patentability.
