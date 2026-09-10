# Reference-excited thermal bridge: prior-art challenge

Review date: 10 September 2026. This is a bounded technical disclosure screen for a proposed revision to the Guarded Thermal Bridge Interrogator. It supplements [the earlier screen](THERMAL_BRIDGE_PRIOR_ART.md); it does not replace that record, establish patentability, or supply physical validation. Research and drafting were AI assisted. It makes no new assertion about human inventorship.

## Finding

**Adding a controllable reference temperature can remove the previously demonstrated fixed-case bypass ambiguity within the specified model. That mathematical repair does not establish a patentable invention.** Switched cooling, guard-heated probes, changing a heat-sink temperature to measure thermal resistance, and separating contact effects through thermal excitation already appear in inspected primary sources.

The newly identified SEMITEC disclosure is a particularly relevant hardware challenge: it combines a measuring element, a protective heating element, and cooling below the target temperature. The heat-sink modulation disclosure is an additional challenge to treating reference-temperature excitation itself as new. The complete proposed four-unknown identification and bounded-acceptance sequence was not identified in the inspected passages; this is a search limitation, not a finding that no such disclosure exists.

## Proposed revision being screened

The existing bridge has a calibrated, switchable cooling conductance `Gi` from a sensor pad to a measured reference at `Tc`, plus a separately controlled and measured guard at `Tg`. The revision deliberately changes `Tc` independently of `Tg`, allowing a bypass conductance `Gx` from the pad directly to that reference to be estimated rather than assumed absent.

At equilibrium, the stipulated lumped model is:

```text
Gi (Ts - Tc) = Gb (Th - Ts) + Gl (Tg - Ts) + Gx (Tc - Ts)
qi = A - B Tsi + D Tgi + E Tci
A = Gb Th; B = Gb + Gl + Gx; D = Gl; E = Gx
Gb = B - D - E; Th = A / Gb
```

Four fit states require adequately independent rows `[1, -Tsi, Tgi, Tci]`, readable sensor values, calibrated shunts, sufficient settling, and sufficiently stable parameters. A fifth state withheld from fitting checks a prediction. The proposed decision also accounts for measurement and calibration uncertainty before an output is accepted. These equations are a derivation for this project, not a summary of the patents below.

If `Tc` never changes, its column is proportional to the constant column and the hot-source contribution cannot be separated from the bypass contribution. Merely adding another shunt setting does not repair this. If `Tc` and `Tg` change together in a dependent pattern, four nominal settings likewise do not guarantee four independent equations.

**The physical endpoint matters:** actuating a small reference island does not identify a bypass that instead terminates on an unchanged motor housing or ambient surface. The independently excited temperature must be the actual endpoint of the leakage represented by `Gx`, or its relation to that endpoint must be independently bounded. An additional unknown path to a fixed, unmeasured boundary can recreate the original ambiguity. A held-out state remains a model-consistency check, not an independent thermometer.

## Closest inspected disclosures

The comparisons below concern disclosed technical content. Publication dates identify the cited documents; priority entitlement, patent-family coverage, validity, and present enforceable claim scope were not audited. Patent text was inspected through Google Patents reproductions, with the EPO publication also available for EP3377881B1. No current legal-status conclusion is drawn from database labels.

| Primary source and inspected location | Overlap supported by the source | Remaining distinction to investigate |
| --- | --- | --- |
| [WO2008078271A1, Device and method for measuring core temperature](https://patents.google.com/patent/WO2008078271A1/en), 3 July 2008; claims 1-3, 7-10, 13-14 and the mathematical discussion immediately before the claims. | Variable thermal coupling, switched heat-flux states, an active cooler or variable heat sink, and calculation of a remote/core temperature from changed thermal conditions. The description also discusses multiple time samples and solving coupled equations for unknown quantities. | Strong baseline overlap. The inspected text does not specify the present separate guard and independently excited bypass endpoint with four-parameter recovery. More states or fitting equations alone are weak distinctions. |
| [US20230296447A1, Temperature measurement device, temperature measurement method, and temperature attenuation measurement method](https://patents.google.com/patent/US20230296447A1/en), 21 September 2023; claims 1, 5, 9-11; description of the first embodiment and related-art discussion. | A measuring element exchanges heat with a protective heating element through an insulating layer; the protective element is controlled to equal the measuring element's temperature. A temperature control element can cool the measuring element below the target; claim 5 specifies a Peltier element. Claims 9 and 11 use pulses of different durations for temperature-decay measurement. | This directly challenges a broad cooled-pad-plus-guard concept. The cited claims equalize guard and measuring temperatures rather than independently varying guard and reference to identify separate leakage paths. Converter clipping recovery and the proposed four-unknown fit were not found in these inspected claims. |
| [EP3377881B1, Devices and methods for detecting analytes using thermal waves](https://patents.google.com/patent/EP3377881B1/en), 4 January 2023; Fig. 2 description, claims 1-3, 8-11 and 16. [EPO publication PDF](https://data.epo.org/publication-server/rest/v1.2/publication-dates/20230104/patents/EP3377881NWB1/document.pdf). | A controller raises and lowers heat-sink temperature at a chosen frequency; thermal response, including phase and amplitude, conveys heat-transfer information. The description expressly connects thermal-wave measurements with thermal resistance. Claims concern an analyte-binding material and concentration measurement. | Independently commanded heat-sink temperature is established excitation hardware, even in a different application. These inspected passages do not describe the bridge's winding/bond/guard/bypass recovery. Merely moving a known technique to motors would leave a substantial combination question. |
| [EP2419006A1, Deep tissue temperature probe constructions](https://patents.google.com/patent/EP2419006A1/en), 22 February 2012; description paragraphs [0003]-[0005], [0007], and claims 1, 6, 10-13. | Guard heaters, equal-temperature zero-heat-flux operation, reduction of radial leakage, and multi-zone probe constructions are disclosed. | A thermal guard and attempts to suppress parasitic paths are established. Deliberately exciting a leakage boundary for identification differs from the cited equalization operation, but combining these ideas still needs review. |
| [US20250383236A1, Thermal property measurement systems and methods for electronics](https://patents.google.com/patent/US20250383236A1/en), 18 December 2025; claims 1-2, 7, 15-19; description sections II.B and III. | Periodic heating on one face, a heat sink on the other, temperatures measured on both faces, and extraction of interfacial conductance. The description uses amplitude/phase information and provides numerical experiments for buried-interface measurement. | This reinforces that active excitation plus inverse conductance estimation is established work. Its inspected geometry measures bonded layers with two accessible outward surfaces; it does not establish the proposed clipped pad and separately excited guard/bypass topology. |
| [Menges et al., Temperature mapping of operating nanoscale devices by scanning probe thermometry](https://www.nature.com/articles/ncomms10874), Nature Communications 7, 10874, 3 March 2016; DOI 10.1038/ncomms10874. Publisher-indexed abstract and introductory excerpt only. | A self-heated scanning probe and temperature-modulated sample provide time-dependent and average heat-flux signals that separate sample-temperature variation from unknown contact effects. | Temperature and contact-related effects have already been separated by active thermometry. The full article could not be retrieved in this screen, so no complete algorithm comparison or claim of absent features is made. |

## What could be argued, and what cannot yet be argued

A narrower technical proposition is a **defined thermal topology and interrogation sequence**: a rail-limited pad, a calibrated cooling path, separately controlled guard and reference boundaries, independent identification of source contact and two leakage conductances, and an output gate based on physically justified uncertainty limits and a withheld prediction. Any draft claim would need to specify how those physical elements cooperate and why the resulting measurement is useful beyond ordinary guarded or switched thermometry.

That proposition remains unresolved. Combining a known cooled guarded probe with known thermal-boundary excitation and standard identification methods is a serious challenge. A low fitting residual, another equation, more test cases, a 3D drawing, or an application to motors does not on its own answer it. No source found in a small search is not evidence of global uniqueness.

A persuasive engineering comparison would preserve the old 130-to-85 degree Celsius counterexample, show the revised method recovering or conservatively refusing that case, and repeat the test with measurement errors, weak excitation, temperature-dependent paths, source drift, and a bypass ending somewhere other than the actuated reference. A real fixture needs an independent source thermometer, measured actuator behavior, calibrated conductances, and a comparison with a suitable wider-range sensor. Any software results belong to the accompanying validation report, not to this source screen.

## Search record and access limits

Eight focused web queries were run on 10 September 2026. Results were followed into primary patent claims/descriptions and a publisher research excerpt. Exact queries:

```text
01 "temperature measurement" "heat sink" "varying" "thermal resistance" patent
02 "thermal conductance" "identification" "boundary temperatures"
03 "temperature sensor" "parasitic" "modulation" guard patent
04 "temperature" "thermal resistance" "independently" "heat sinks" patent
05 thermal sensor calibration independent boundary temperature perturbation conductance identification parasitic heat leakage
06 patent heat sink temperature modulation thermal resistance measurement thermal wave guard
07 Menges temperature contact resistance active thermometry modulated probe 2016
08 "temperature" "conductance" "identifiability" thermal sensor boundary
```

Additional primary research inspected was [Munde, Chuang and Islam, arXiv:2511.09960](https://arxiv.org/abs/2511.09960), including the HTML sections on non-contact thermal-resistance calibration and contact-path modeling. It describes Joule-heating-based calibration and explicitly treats parasitic thermal paths and uncertainty. It supplies background on calibration discipline, not an exact match for the proposed reference-excitation method. The abstract page and rendered HTML presented differing manuscript-date information, so this screen does not rely on its date for a patent priority determination.

A result for CN121253598A suggested active thermal-bridge modulation and separation of parasitic heat flow. Direct [primary patent retrieval](https://patents.google.com/patent/CN121253598A/en) failed. Its secondary search excerpt is an unverified follow-up lead; no technical or novelty conclusion here relies on it. Direct full-text retrieval of the Menges article also failed; only the publisher-indexed excerpt described above was used.

This search did not exhaust classification searches, non-English full texts, backward/forward citations, later prosecution amendments, related national families, dissertations, or unpublished applications. The important SEMITEC family should receive a full claim chart before relying on a cooled guarded sensor as a patent distinction. Neither physical validity nor patent eligibility, novelty, non-obviousness, or freedom to operate is established by this document.
