# Reference-excited thermal bridge: physical bench protocol

Version: draft 1, 10 September 2026. Status: **not executed; no hardware, physical measurements, instrument records, or calibration certificates have been supplied.** Every numerical value below is a proposed test target or hypothetical fixture setting, not a measured result. This protocol is AI-assisted engineering preparation. It is not a motor qualification, a safety certification, or evidence of patentability.

## Objective and scope

Determine whether independently exciting the *actual measured reference endpoint* permits a clipped temperature-sensing pad to distinguish heat from a hot source from heat lost through a bypass to that endpoint. Compare the proposed method against a suitable wider-range contact sensor and the earlier shunt-only method. Determine where the revised method must refuse an estimate.

The first specimen is a stationary heated metal coupon representing a local hot surface. Its material, dimensions, heater and bond will be selected and measured when apparatus exists. It is not an actual motor or a validated motor equivalent. A later motor study requires a specified motor, instrumented winding temperatures and a separate protocol covering load, speed, vibration, insulation, electromagnetic interference and installation effects.

The model under test is:

```text
Gi (Ts - Tc) = Gb (Th - Ts) + Gl (Tg - Ts) + Gx (Tc - Ts)
A = Gb Th; B = Gb + Gl + Gx; D = Gl; E = Gx
qi = A - B Tsi + D Tgi + E Tci
Gb = B - D - E; Th = A / Gb
```

`Th` is the local source temperature, `Ts` the pad temperature, `Tg` the guard temperature and `Tc` the local reference endpoint temperature. `Gb`, `Gl` and `Gx` are source-bond, guard-leakage and reference-bypass conductances. `Gi` is the independently calibrated switched cooling conductance. Four fit states identify the four lumped coefficients when the measurements are informative; a fifth state tests a withheld prediction. No state at a readout rail is treated as an exact temperature.

A bypass to a different, unchanged boundary is outside this four-parameter model unless independently bounded. Moving a nearby island does not move the temperature of an entire motor housing. This endpoint distinction is a primary experiment, not an assumption to hide in the fixture drawing.

## Apparatus and records required

| Function | Proposed implementation and required evidence | Actual record |
| --- | --- | --- |
| Controlled hot source | Stationary coupon with an electric heater, local source regulation, measured electrical input and a separate rated overtemperature cutout. Map temperature gradients near the sensor attachment. | Model, material, dimensions, limits and photographs: **unprovided**. |
| Independent source reference | A calibrated thermometer with usable range above the highest source setting, mounted close enough to characterize the same local surface. A second reference location quantifies the spatial gradient. Its logger and calibration must be independent of the bridge's temperature conversion. | Sensor/logger models, serials, calibration certificates, placement and uncertainty: **unprovided**. |
| Measuring pad | A low-mass pad with temperature readout and recorded raw converter codes, rail flags and conversion coefficients. Quantify self-heating and attachment repeatability. | Geometry, materials, sensor, converter, rail behavior and calibration: **unprovided**. |
| Actual reference endpoint | A thermally isolated local return island, independently heated/cooled and measured at the points where the shunt and intentional bypass terminate. Measure gradients across the island and its connection to the outer fixture. | Actuator/sensor models, layout, bandwidth, gradients and power capability: **unprovided**. |
| Guard | A separately controlled and measured guard carrying intended lead/support thermal intercepts. Measure pad-side and return-side attachment temperatures where needed. | Geometry, lead routing, control performance and sensors: **unprovided**. |
| Calibrated shunts | At least three reproducible thermal-conductance states between pad and reference. Characterize conductance versus temperature, switching hysteresis and repeated assembly. Measure heat flow using a separately calibrated method. | States, `Gi(T)` data, uncertainties and calibration method: **unprovided**. |
| Deliberate bypasses | Removable thermal straps from pad to the controlled reference, and separately from pad to an independently monitored outer fixture or ambient sink. Characterize each path independently before validation. | Conductances, endpoints, drawings and mounting method: **unprovided**. |
| Data and protection | Synchronized logging of all temperature channels, raw readings, actuator commands and measured voltage/current; independent fault shutdown. Retain original files and configuration hashes. | Hardware, sample rate, timing accuracy, operating limits and operator: **unprovided**. |

The wider-range comparison sensor is a separate measurement method. If one physical instrument is used as both the benchmark and source reference, disclose that dependency; it cannot provide independent error evidence for its own benchmark result. Prefer a separate benchmark sensor and an independently calibrated source-reference chain.

## Preparation and preregistration

Perform exploratory assembly, calibration, timing and excitation-design work first. These are development data, even when physically measured. Use them to choose achievable actuator settings, settling windows and a credible uncertainty budget. Do not move development runs into the validation set.

Before collecting the first reserved validation run, commit a protocol revision containing the actual apparatus inventory, calibration files, geometry, estimator version, all thresholds, conductance intervals, clipping behavior, test matrix, run order and randomization seed. Record file hashes. Any later change creates a new revision and a new validation campaign; retain the failed or superseded campaign.

Keep both kinds of holdout separate:

1. **Within-cycle holdout:** state E is excluded from the coefficient fit. Its measurement may gate acceptance but may not refit coefficients or adjust tolerances.
2. **Campaign holdout:** complete assemblies and runs reserved after development. Their independent source temperatures, fault labels and outcomes are unavailable for fitting, calibration or threshold selection. Release them only for scoring.

A ground-truth fault label must never become a hidden estimator input. Any online topology qualification or fault gate must use information genuinely available to the device, such as documented installation bounds or independent diagnostics. If no such information establishes a bound, a conditional software result must not be presented as an unconditional temperature bound.

## Calibration and topology qualification

Calibrate pad, guard and reference channels over their usable temperatures and the independent source thermometer over the full proposed source range. Record offsets, slopes, nonlinearity, hysteresis, drift, readout quantization, timing, self-heating and correlations. Recheck calibration after the campaign. A shared temperature calibration error is not removed by collecting more thermal states.

For each shunt, measure heat flow and endpoint temperature difference in a separate calibration fixture or a separately justified calorimetric arrangement. Record parasitic-loss correction and its uncertainty. Do not use the same fitted `Th` being evaluated to calibrate `Gi`. Include common shunt-scale error, state-dependent error and temperature dependence.

Verify the actual path topology before calling an assembly qualified. With source conditions held stable, perturb the guard, then the local reference, then the outer fixture temperature in separate experiments. Measure which parts and attachment endpoints follow each change. Repeat after remounting and with deliberate lead-routing changes. Estimate bounds on residual paths that bypass both controlled endpoints, including supports, wires, convection and radiation over the intended temperature range.

Photographs alone do not prove all heat follows the intended route. If residual coupling cannot be bounded tightly enough for the output interval, mark that assembly **unqualified**. A software solver can still return numbers for it, but those numbers do not establish temperature accuracy.

## Proposed interrogation sequence

The following settings illustrate independent excitation. They are not committed apparatus settings or claimed achievable performance. During development, replace them with measured, rated settings that keep fit readings below the actual rail and give sufficient information.

| State | Shunt | Guard target | Local reference target | Use |
| --- | --- | --- | --- | --- |
| Rest | Minimum cooling | 40 degrees Celsius | 40 degrees Celsius | Record initial condition and whether the pad clips. |
| A | Calibrated state S1 | 40 degrees Celsius | 40 degrees Celsius | Fit. |
| B | Calibrated state S2 | 40 degrees Celsius | 40 degrees Celsius | Fit; changes shunt. |
| C | Calibrated state S1 | 60 degrees Celsius | 40 degrees Celsius | Fit; changes guard independently. |
| D | Calibrated state S1 | 40 degrees Celsius | 60 degrees Celsius | Fit; changes actual reference independently. |
| E | Calibrated state S3 | 50 degrees Celsius | 50 degrees Celsius | Held-out prediction. |

Use *measured endpoint temperatures*, not commanded targets, in the estimator. Both increased and decreased reference excursions should be tested. Freeze a maximum dwell and a settling rule after development. A proposed initial settling rule is an absolute temperature slope below 0.02 degrees Celsius per second over a 10-second window, plus a model-based bound on remaining transient error; slope alone is insufficient for a slow hidden thermal node.

Capture the full transient and switching events. Independently characterize the time constants and select a sample rate that resolves the fastest relevant response; the proposed starting target is at least 20 samples over that response time. Repeat with slower acquisition and timing offsets as fault challenges.

If clipping is imposed digitally to emulate a limited measurement chain, retain the untouched pre-clipping readings on a separate validation channel and label the clipping as **emulated**. Never describe this as demonstrating a physical sensor's temperature survivability or actual converter saturation. A later actual-clipping experiment must characterize the real rail and recovery behavior.

## Reserved validation matrix

A proposed primary matrix is three source targets (110, 130 and 150 degrees Celsius), three characterized bypass levels to the controlled reference (absent within calibration resolution, comparable to the source bond, and larger than the source bond), and two independently characterized bond conditions (nominal and weakened). These values and levels are hypotheses for fixture planning, not measured specifications. Replace any condition outside actual component ratings before preregistration.

Use three independently assembled specimens and five complete cycles per condition: 270 proposed cycles per method. Run the proposed method, the shunt-only method, and the wider-range sensor comparison under matched conditions, with order randomized and documented. Repeated cycles on one specimen are correlated observations; do not count every sample as an independent trial.

In addition, reserve these challenges with at least five cycles on each specimen at a representative source setting. The operator may know the fixture condition; the estimator must not receive a hidden ground-truth label.

| Challenge | Required observation |
| --- | --- |
| Bypass to controlled reference | Confirm that the bypass's physical endpoint follows `Tc`; compare recovered temperature and bypass conductance against independent measurements. |
| Bypass to an unchanged outer fixture | Attempt the original alias deliberately. Record whether the held-out residual can remain small while the estimate is wrong. Qualification must fail if that path exceeds the stated residual-path bound, even if the fit passes. |
| Weak or dependent excitation | Hold `Tc` fixed, make `Tc` follow `Tg`, and reduce excursion size. Verify refusal when rank or uncertainty is inadequate. |
| Actuator limit or stuck state | Freeze each actuator in turn, limit heating/cooling power and misreport commanded state while retaining measured endpoints. Determine which failures are visible without ground-truth labels. |
| Source drift | Apply rising and falling source profiles during a cycle; compare actual drift with the frozen drift enclosure. Include slow drift capable of passing a simple settling test. |
| Multiple thermal nodes | Add a thermal mass or distributed contact; test whether lag and gradients defeat the lumped-model assumptions. |
| Temperature-dependent paths | Change mean temperature and gradient, test remounting and contact pressure, and compare fitted conductances with calibration bounds. |
| Sensor and calibration faults | Inject pad offset, common temperature offset, stuck codes, clipping, timestamp skew, common shunt-scale error and state-dependent shunt error. Distinguish injected electronic/software faults from naturally observed faults. |
| Interrogation disturbance | Record source-reference excursions and input-power changes caused by cooling and heating. Repeat once with regulated source temperature and once with fixed source power so regulation cannot conceal the perturbation. |

An intentionally out-of-domain challenge can demonstrate a limitation even when it produces an incorrect accepted estimate. Report it as a failure of the applicable guarantee or of domain qualification; do not delete it because it is inconvenient.

## Proposed acceptance and reporting rules

The following are **draft engineering targets**, selected for an initial coupon experiment. They are not standards, achieved results, or a motor's safety limits. Final values and the justification for each must be frozen before reserved validation data are collected.

| Item | Proposed criterion |
| --- | --- |
| Reference quality | The expanded uncertainty of the independent source reference, including placement and gradient effects, is at most 0.5 degrees Celsius over the evaluated local measurand. State coverage factor and interpretation. |
| Useful temperature interval | For an accepted result, the reported interval has width at most 10 degrees Celsius. Report acceptance rate as well as accuracy so refusal of all readings cannot count as success. |
| Point estimate | On accepted, qualified cases, absolute error relative to the independent source reference is at most 2 degrees Celsius. Failure of this utility target must remain visible even if a wider interval covers the reference. |
| Conservative observed coverage | Every accepted interval contains the independently reported source-reference interval for that cycle. If it does not, record an observed coverage failure. This finite-data criterion does not prove universal coverage. |
| Definite underestimate | Separately count cases where the bridge's upper endpoint is below the source reference's lower endpoint. Proposed target: zero in the qualified validation matrix. Report the count even outside that matrix. |
| Holdout | State E's observed pad interval overlaps the propagated predicted interval under the frozen uncertainty and model-error bounds. Overlap is a consistency gate, not independent source validation. |
| Excitation and faults | Refuse a bounded estimate when the frozen identifiability, calibration, settling, range or qualification requirements fail. Unknown and unbounded inputs may not be replaced by convenient nominal values. |
| Source disturbance | Maximum change of the independent local source reading caused by interrogation is at most 1 degree Celsius under the separately specified fixed-power comparison, or the disturbance is explicitly included in the claimed measurand and uncertainty. |
| Practical utility | Proposed target: at least 90 percent accepted cycles in the nominal qualified matrix and a complete cycle within 120 seconds. Report energy per cycle and added source/cooling power without claiming an energy advantage in advance. |

Compute the benchmark comparison from the same reserved conditions. Report absolute error, interval coverage, refusals, time to a usable estimate, source disturbance, actuator energy, component count and calibration effort for each method. Report median, upper-tail and worst observed values. Do not claim the bridge outperforms a wider-range sensor merely because a deliberately clipped sensor performs poorly.

There is no motor admission or safe operating-temperature threshold in this coupon protocol. A later control study must derive such thresholds from the specified motor and application, rather than borrowing these accuracy targets.

## Uncertainty and the meaning of a software certificate

Create an uncertainty budget covering calibration, repeatability, correlations, sensor placement, gradients, conversion, shunt conductance, settling, source drift and residual thermal paths. NIST TN 1297 distinguishes statistically evaluated components from components evaluated by other information and explains the need to report measurement uncertainty; it also treats correlations explicitly. Use this as metrology guidance, not as a claim of NIST approval. [NIST TN 1297, classification of uncertainty components](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-2-classification-components-uncertainty).

Keep probabilistic uncertainty and hard enclosures distinct. An expanded uncertainty interval with a stated coverage factor is not an absolute error bound. If a solver needs deterministic upper/lower bounds, document the engineering evidence and remaining coverage assumptions used to form them. More Monte Carlo draws do not turn an assumed distribution into a physical guarantee.

A software certificate can establish a conditional statement: given the supplied measurement enclosures, parameter bounds and model assumptions, its verified computation encloses compatible source temperatures or refuses an estimate. It cannot establish that a real, unmeasured bypass satisfies those bounds. A fifth thermal state does not resolve every shared calibration error or every indistinguishable topology. The physical tests above assess those assumptions; the software result does not replace them.

## Evidence package and permitted conclusion

For each cycle retain raw sensor codes and engineering-unit conversions, rail flags, timestamps, measured endpoint temperatures, source-reference data, actuator commands and measured power, complete transient records, calibration revision, installation photographs, estimator hash, fit/holdout separation, interval, point estimate, decision and reason. Preserve rejected and aborted cycles with their reasons. Hash original data and keep corrections in separate derived files.

Publish a campaign report containing the preregistered version, actual apparatus inventory, calibration and uncertainty records, raw-data manifest, analysis version, every acceptance denominator, all failure cases, benchmark comparison and deviations. Clearly distinguish exploratory runs, reserved validation runs and synthetic results.

**Current conclusion:** this protocol is prepared; physical validation is not performed. If a future campaign succeeds, the supported conclusion is limited to the tested fixture, range, installation and documented uncertainty assumptions. It does not establish general motor safety or invention uniqueness. The separate [prior-art challenge](REFERENCE_EXCITATION_PRIOR_ART.md) remains applicable regardless of test outcome.
