# Reference-excited thermal bridge: technical revision and evidence

September 10, 2026. **Hypothetical apparatus; software verification only. Physical measurements: zero.**

The owner confirmed that no motor, test fixture or reference thermometer is available and authorized hypothetical context. The parameters below are design assumptions, not measured properties or a commercial motor specification. This revision does not establish patent uniqueness, filing readiness or safe motor operation.

## What changed

The original guarded bridge has a reproducible weakness: heat escaping from the sensing pad to a fixed 40 °C case can make a 130 °C winding appear to be 85 °C, even when its unused challenge observation agrees. The revised candidate deliberately changes **the actual endpoint temperature of that bypass**, independently of the guard, and measures the endpoint temperature. Four independent fit states identify a fourth thermal coefficient. A fifth observation remains outside the fit and challenges the resulting prediction.

This requires a physical change: a controlled local thermal return island that receives both the selectable shunt and the modeled reference bypass. Changing a software number, measuring a nearby case temperature, or heating an unrelated part does not implement it. A whole motor housing may be too massive or coupled to the winding for the assumed experiment. The first proposed apparatus is therefore a heated coupon, not a claimed working motor assembly.

The second change is an explicit uncertainty enclosure. A plausible point estimate alone no longer qualifies the result. Exact rational primal and dual calculations establish conditional bounds when they can be certified. Missing excitation, clipping, unsettled observations, inconsistent holdout data, weak attachment evidence, and overly broad intervals produce an inconclusive result. Every result carries `hardware_validated: false` and `motor_permission: not_authorized`.

## Equation and identifiable quantities

Let the source, sensing pad, guard and controlled return temperatures be `Th`, `Ts`, `Tg` and `Tc`. Conductances are winding bond `Gb`, guard leakage `Gl`, reference bypass `Gx` and calibrated selectable shunt `Gi`, all in W/K. Pad capacity is `Cs` in J/K.

```text
Cs dTs/dt = Gb(Th − Ts) + Gl(Tg − Ts) + Gx(Tc − Ts) − Gi(Ts − Tc)

Gi(Ts − Tc) = A − B Ts + D Tg + E Tc       [settled approximation]
A = Gb Th;  B = Gb + Gl + Gx;  D = Gl;  E = Gx
Gb = B − D − E;  Th = A / Gb
```

The four columns `[1, −Ts, Tg, Tc]` must be independent. Four observations are necessary for this four-coefficient nominal fit; merely collecting more rows at a fixed reference does not remove the original ambiguity. Measured guard and reference spans must each reach the proposed 5 °C minimum, and the actual matrix must also have full rank. A positive, identifiable bond is necessary to infer the source.

For the constructed `Th=130, Gb=.020, Gl=.005, Gx=.020` fixture:

| Phase | Purpose | Gi (W/K) | Tg (°C) | Tc (°C) | Ideal Ts (°C) |
|---|---|---:|---:|---:|---:|
| A | Fit | .020 | 40 | 40 | 67.692308 |
| B | Fit | .050 | 40 | 40 | 58.947368 |
| C | Fit | .035 | 65 | 40 | 64.062500 |
| D | Fit | .035 | 40 | 55 | 72.812500 |
| E | Unused challenge | .040 | 50 | 48 | 67.411765 |

The exact equilibrium equations recover `(A,B,D,E)=(2.6,.045,.005,.020)` and `Th=130 °C`. The old fixed-reference fit instead absorbs the bypass into its apparent bond: `Gb'=Gb+Gx=.040`, `Th'=(Gb Th+Gx Tc)/(Gb+Gx)=85 °C`.

## What the uncertainty certificate does and does not prove

Set `h=Th`, `l=Gl/Gb`, `x=Gx/Gb`, `r=1/Gb`, with `l,x,r ≥ 0`. For each of the first four observations, temperature error intervals are `[slo,shi]`, `[glo,ghi]`, `[clo,chi]` and the shunt calibration interval is `[ilo,ihi]`. The bounded unsettled heat residual is `q`. Every consistent stationary parameter vector must satisfy:

```text
h + (glo−shi)l + (clo−shi)x
  + [min(ilo(clo−shi), ihi(clo−shi)) − q]r ≤ shi

−h + (slo−ghi)l + (slo−chi)x
  + [−max(ilo(chi−slo), ihi(chi−slo)) − q]r ≤ −slo
```

Both signs of the pad-to-reference temperature difference are covered. Relaxing shared-error correlations enlarges the feasible set conservatively. No minimum bond is imposed to force success. The program finds an exact rational feasible witness and nonnegative dual multipliers: `Aᵀλ=c` certifies `cᵀz ≤ bᵀλ`; using `−c` gives a lower bound. It reports temperature bounds and a lower bound on bond strength from an upper bound on `r`. Missing certificates remain inconclusive. Displayed float endpoints are rounded outward; the report stores the exact fractions and certificate weights.

These are mathematical bounds **conditional on the declared topology, stationary source and conductances, calibration/error intervals, and residual-heat budget**. The code cannot authenticate those physical assumptions. An observed plateau does not prove that hidden source temperature is stationary or that pad storage heat is below the assumed budget. The fifth observation tests the nominal prediction; it is neither used to tighten the first-four-state enclosure nor proof that all model errors have been detected.

## Actual software results

The [protocol](../reference_bridge/protocol.json), including all 14 stationary cases and acceptance criteria, was written before generating its first saved report in this development session. It is a local development protocol, not an independently timestamped preregistration or a reserved physical validation dataset. The cases deliberately target known mechanisms; their proportions are not failure probabilities or a population success rate.

The [stored report](../reference_bridge/results.json) preserves every case. With ±0.1 °C on each thermometer, ±1% shunt calibration and ±0.001 W residual heat, the known bypass fixture returns a point estimate of **130.000000005 °C** and a conditional interval of **113.724–158.282 °C**. The entire interval is above the illustrative 105 °C limit. Its **44.557 °C width fails the preset 20 °C precision criterion**, so the status is inconclusive. This corrects the modeled false-cool mechanism without pretending to have achieved useful precision.

At ±5% shunt uncertainty the interval expands to **100.346–252.029 °C** and straddles the limit. At ±10% no finite temperature/attachment certificate is produced. These results make shunt calibration and experiment conditioning concrete technical weaknesses rather than hidden assumptions.

The detached, missing-excitation, clipped, weak-bond, holdout-drift and holdout-shunt-fault cases withhold qualified results. The cool 80 °C fixture is model-consistent. The ambient-leak case below is also incorrectly model-consistent, demonstrating why that status is not a hardware safety flag. The common shunt gain error can distort apparent bond strength; absolute conductance calibration still matters.

## Remaining exact failure: an unexcited hidden boundary

Suppose an additional pad leak `Ga=.020 W/K` leads to a fixed unexcited ambient `Ta=40 °C`. The following two physical parameter sets are observationally identical to this estimator:

| Parameter | Actual hot source | Indistinguishable cooler model |
|---|---:|---:|
| Th | 130 °C | 85 °C |
| Gb | .020 W/K | .040 W/K |
| Ga to fixed 40 °C | .020 W/K | 0 |
| Gl, Gx, Cs | Same | Same |

Both have `Gb Th + Ga Ta = 3.4 W` and `Gb+Ga=.040 W/K`. Consequently they produce the **same differential equation**, not merely the same five equilibria, for every selectable shunt, guard and reference waveform. The synthetic hidden-leak case actually returns **85.000000001 °C**, an **80.740–90.750 °C** interval and model-consistent status while truth is 130 °C. That failure is retained in automated tests and the public report.

Extra repeats, a clever classifier or a VM cannot distinguish exactly identical observable data. The practical response is to establish that unexcited paths are negligible/bounded by independent physical characterization, route relevant heat paths to measured excited boundaries, or add an independent observable that breaks this equivalence. This revision has **not** physically established any of those conditions. It must not authorize a motor from its output alone.

## Separate finite-rate challenge

An independently written [RK4 plant](../reference_bridge/dynamic_challenge.py) uses finite source and pad capacities, source heater regulation, ambient losses, and guard/reference actuator states with finite response times. It does not call the stationary plant's equilibrium or advance functions. Only measured pad, guard, reference and calibrated shunt channels reach the estimator; hidden truth and case labels remain evaluation-only.

All three saved [dynamic cases](../reference_bridge/dynamic_results.json) are inconclusive: the regulated case has too wide an interval, and the slow-response and changing-load cases fail observable settling. No thresholds were relaxed after seeing these outcomes. The largest matched transient difference between 0.04 s and 0.02 s integration steps is **1.3401 × 10⁻⁵ °C**; the largest fine-step energy-balance residual is **4.78 × 10⁻¹² J**. These verify numerical behavior for the constructed networks, not their physical truth or a general integration-error bound.

The dynamic report exposes required ideal actuator thermal powers and heat transfer. Electrical energy, efficiency, achievable power and real actuator feasibility remain unknown. The stationary report records shunt heat only; it does not describe that as total system energy. The 100-second synthetic sequence is not demonstrated motor measurement latency.

## Physical validation and patent review still needed

The [unexecuted bench protocol](REFERENCE_EXCITATION_BENCH_PROTOCOL.md) specifies a heated coupon, independent truth thermometer, controlled return island, deliberate leakage faults, calibration, blind reserved trials and energy/time comparisons. No instruments, calibration certificates, raw physical readings or motor specifications have been supplied. All physical-result fields remain empty or not run.

The [focused prior-art screen](REFERENCE_EXCITATION_PRIOR_ART.md) found disclosures of cooled guarded sensors, thermal pulses and deliberate heat-sink temperature changes. Reference excitation by itself is not established as new. The complete proposed measurement/qualification procedure remains an unresolved invention candidate; software success does not establish patent novelty or nonobviousness.

The document authors remain **Srinivas Nampalli and Saathvik Gampa**, as designated by the owner. This revision, its code, synthetic cases and explanatory text were developed with AI assistance. No specific human conception contribution, date, experimental act or patent inventorship has been invented or assigned by splitting technical details between authors. Historical studies, PDFs, video and the original 3D replay remain identifiable as earlier work.
