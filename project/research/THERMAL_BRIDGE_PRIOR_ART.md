# Guarded Thermal Bridge Interrogator: focused prior-art screen

Review date: 9 September 2026. Scope: a proposed sensing architecture, separate from the delivered Thermal Queue Governor. This note records technical disclosure overlap, not an assessment of enforceable claim scope or a finding of patent novelty.

## Finding

The original two-state thermal bridge has substantial prior disclosure. Sequentially change heat extraction at one location, measure two thermal equilibria, and calculate a remote temperature despite an uncertain intervening thermal path: that is already close to WO2008078271A1. Active thermal guards and correction of parasitic heat losses are also established. Neither the two-state algebra nor adding a guard is a defensible standalone distinction.

The narrower candidate worth evaluating is a **sensor pad with two independently controlled thermal paths**: a calibrated cooling shunt to a measured case, and a temperature-controlled guard that intercepts otherwise unknown lead/substrate leakage. Jointly changing shunt conductance and guard temperature can distinguish hot-side contact conductance from guard leakage while cooling the pad into its readable range. Three usable states identify three parameters; a fourth setting withheld from the fit tests their predictive consistency before output is accepted. This complete interaction was not identified in the inspected sources. Its novelty and non-obviousness remain unresolved, especially given the combination of switched thermometry, thermal guarding, and routine parameter identification.

## Concrete mechanism and the ambiguity it addresses

Proposed physical embodiment: a small temperature-sensing pad contacts an insulated winding through unknown conductance `Gb`. A switch selects calibrated conductance `Gi` from that pad to a case measured at `Tc`. Sensor leads and substrate supports first terminate thermally on an independently controlled guard measured at `Tg`; their aggregate conductance to the pad is unknown `Gl`. Merely placing a heater nearby does not establish this topology: the leakage paths must actually be intercepted.

For an equilibrium of the lumped model,

```text
Gi (Tsi - Tci) = Gb (Th - Tsi) + Gl (Tgi - Tsi)
qi = A - B Tsi + D Tgi
A = Gb Th; B = Gb + Gl; D = Gl
Gb = B - D; Th = A / (B - D); Gl = D
```

Fit three states whose rows `[1, -Tsi, Tgi]` have adequate rank and conditioning. Changing only `Gi` while fixing `Tg` cannot provide rank three. Independently perturbing `Tg` supplies the missing information if the experiment is well conditioned. The withheld fourth state's predicted pad temperature is

```text
Ts4_predicted = (A + D Tg4 + G4 Tc4) / (B + G4).
```

Every reading used as a numerical equality must be unclipped. A reading at a converter rail is a bound, not an exact pad temperature. The illustrative 95 °C rail is a simulation setting, not a demonstrated hardware limit. Parameters and boundary temperatures must remain sufficiently stable during interrogation; finite settling must be accounted for.

**Exact counterexample to the earlier design:** let the hot winding be 130 °C, the case and unperturbed guard 40 °C, and `Gb = Gl = 0.02 W/K`. At every shunt setting, these data also fit a leak-free model with apparent conductance `0.04 W/K` and apparent hot temperature **85 °C**. An additional shunt setting cannot expose that error. With `Gi = 0.01, 0.02 W/K` and guard 40 °C, the true pad temperatures are 76 and 70 °C. Changing the guard to 60 °C at `Gi = 0.01 W/K` produces 84 °C, separating the leakage term. These are derived model values, not physical measurements.

## Closest inspected disclosures

Publication dates below refer to the identified documents. Patent families, priority entitlement, prosecution histories, and current national claim scope were not audited.

| Primary source and pinpoint | Supported overlap | Boundary of the comparison |
| --- | --- | --- |
| [WO2008078271A1, Device and method for measuring core temperature](https://patents.google.com/patent/WO2008078271A1/en), 3 July 2008. Claims 1–3, 7–10, 13–14; description's special embodiment immediately preceding the drawings discussion. | Cooling, switched heat-flux states, variable thermal coupling or heatsink, and computation from measurements in two states. The description explicitly uses consecutive steady states and known `K1/K2`, or further measurements to determine it. | Strongest baseline challenge. The inspected passages do not specify converter-rail recovery, separately excited lead-leakage guard, or a withheld validation state that gates acceptance. Different names or motor application alone do not remove the overlap. |
| [US5816706A, Method and apparatus for determining internal temperature and coefficient of internal thermal conductivity in a structure](https://patents.google.com/patent/US5816706A/en), 6 October 1998. Claims 1–2; temperature computation and calibration description. | Two structures of different thermal conductance, four temperature-sensitive elements, and a known conductance ratio support internal-temperature determination. WO2008078271A1 discusses this earlier spatial approach when describing its variable-coupling approach. | Two thermal paths and ratio-based elimination are established. These inspected claims use separate structures rather than the proposed independently excited shunt and lead guard on one pad. |
| [WO2019133601A1, Body core temperature sensor with two TEGs](https://patents.google.com/patent/WO2019133601A1/en), 4 July 2019. Claims 1–2; description [0002]–[0006], [0048]–[0049]. | Two assemblies with different thermal resistances, temperature and heat-flow measurements, and core-temperature calculation. The background explains eliminating unknown skin resistance under assumptions shared across measurement locations. | Direct heat-flow sensing and spatial paths differ from calibrated shunt interrogation. The underlying inverse-temperature problem is already recognized; unknown contact alone is not a distinction. |
| [EP2419006A1, Deep tissue temperature probe constructions](https://patents.google.com/patent/EP2419006A1/en), 22 February 2012. Description [0003]–[0005]; claims 1, 6, 10–13. | The description explains axial zero-heat-flux guarding and radial heat-flow suppression; claims address substrate, sensor, heater, and slit arrangements. | Thermal guarding around a temperature probe is established. The described zero-flux operation equalizes temperatures; the candidate deliberately excites a leakage boundary for identification while retaining cooling headroom. The publication's claims should not be broadened to all guarding. |
| [US20200182815A1, Instruments for measurement of multiple material properties](https://patents.google.com/patent/US20200182815A1/en), 11 June 2020. Claims 1, 4, 15; discussion of the thermal guard and uncertainty analysis. | Claim 4 specifies a guard around sensors with three controlled zones to reduce parasitic heat losses, within claim 1's multiproperty instrument. Claim 15 addresses temperature calibration using a reference sample. | Active, controlled guards and correction of parasitic effects are known. The inspected text did not identify the proposed three-state joint recovery of winding temperature, bond conductance and guard leakage from an unclipped pad. |
| [Xing et al., An optimal guarding scheme for thermal conductivity measurement using a guarded cut-bar technique, part 2 guarding mechanism](https://www.sciencedirect.com/science/article/abs/pii/S1359431113004353), Applied Thermal Engineering 59, 504–514, 25 September 2013; DOI 10.1016/j.applthermaleng.2013.06.021. Publisher abstract, introduction and available section excerpts. | Varying the guard temperature gradient changes systematic errors from thermal-conductivity mismatch; guard conditions require deliberate design. | This supports a concrete warning against assuming a guard eliminates all errors. It does not establish the candidate's complete identification sequence. The entire article was not inspected. |

## What would remain to demonstrate

The possible contribution is the coordinated hardware topology and interrogation sequence, including a quantitative reason to excite both paths. A fourth-state holdout must remain excluded from fitting, and its acceptance tolerance must reflect measurement and calibration uncertainty. It is independent of fitting, **not independent metrology**. A low residual is necessary evidence of consistency with this model, not proof of the recovered winding temperature.

Two exact limits must remain visible in any prototype or disclosure:

1. **Unknown bypass directly to the case.** If an additional unmodeled conductance `Gx` bypasses the guard and reaches fixed `Tc`, the fit can return `Gb_hat = Gb + Gx` and `Th_hat = (Gb Th + Gx Tc)/(Gb + Gx)`. All guard and shunt holdouts can still pass. Recoverability therefore depends on physically intercepting or separately bounding this bypass.
2. **Common calibration errors.** A common temperature offset on the pad, case and guard shifts recovered `Th` by the same amount without necessarily creating a holdout residual. A common multiplicative shunt-calibration error rescales fitted conductances; in this ideal linear model it does not by itself change recovered `Th`. More states using the same calibration do not independently resolve those errors.

An engineering comparison should therefore include the exact 130-to-85 °C ambiguity, its removal with guard excitation, and its reappearance with an unguarded case bypass. It should also expose poor conditioning, almost detached bonds, transient drift, temperature-dependent conductances and stuck clipping. A measured fixture must demonstrate actual path interception and quantify how interrogation perturbs the winding. These requirements describe proposed validation; this source review supplies no motor or hardware validation.

## Reproducible search record

Public web/patent search on 9 September 2026; exact query strings below. Queries 1–21 screened the original bridge, 22–30 the revised guard. Results were followed into claims and descriptions, rather than treating titles as evidence.

```text
01 "temperature measurement" "contact resistance" "two" "thermal" patent
02 "dual heat flux" "thermal resistance" temperature patent
03 "temperature sensor" "cooling" "measurement range" thermal resistance patent
04 "temperature" "switchable thermal" sensor
05 "temperature" "contact thermal resistance" "active" measurement two
06 "temperature sensor" "thermal divider"
07 Menges simultaneous sample temperature probe sample contact thermal resistance active thermometry
08 "temperature sensor" "cooling" "different" "thermal resistance" "calculate"
09 "temperature measurement" "switchable" "heat" "resistance"
10 patent temperature sensor "cooling" "two" "contact resistance"
11 "temperature measurement" "thermal resistance" "alternately"
12 "core temperature" "variable thermal resistance" sensor
13 "temperature sensor" "cooled" "two temperatures"
14 "thermometry" "cooling" "contact resistance"
15 "ncomms10874" pmc
16 "temperature measurement" "cooling power" "thermal resistance" patent sensor
17 "temperature sensor" "variable" "heat sink" "unknown" patent
18 "thermometry" "variable thermal" conductance
19 "core temperature" "third" "heat flux" "state"
20 "thermometer" "three" "thermal conductance"
21 "temperature sensor" "saturation" "thermal resistance" "cooling"
22 "temperature" "active guard" "thermal resistance" sensor
23 "temperature measurement" "guard" "parasitic" patent
24 "temperature sensor" "guard temperature" "thermal" patent
25 "thermal" "guard temperature" "varying" measurement
26 "thermometry" "guard" "contact resistance"
27 "temperature sensor" "thermal guard" "contact" patent
28 "guard" "thermal resistance" "identification" sensor temperature
29 "temperature" "guard" "parasitic conductance" measurement
30 "thermometry" "guard" "modulation"
```

Additional primary full texts inspected during screening: [EP4328557A1](https://data.epo.org/publication-server/rest/v1.2/patents/EP4328557NWA1/document.pdf), claim 1 and description [0006], concentric dual heat paths; and [Yoshimura, Tamura and Huang, EMBC 2021](https://www.paperhost.org/proceedings/embs/EMBC21/files/2312.pdf), section II, calibration of a dual heat-flux thermometer. They reinforce spatial-path and calibration overlap without changing the central comparison.

Access limitations: [Menges et al. 2016](https://www.nature.com/articles/ncomms10874) was available as an indexed publisher excerpt, but direct full-text retrieval failed; no full algorithm comparison is claimed. Full-text retrieval also failed for US11253157B2 and US10753896B2. US5816706A was successfully inspected earlier in this screen, although later reload attempts failed. These failures are not evidence that relevant features are absent. This bounded search did not exhaust classification searches, non-English claims, or every citation family.
