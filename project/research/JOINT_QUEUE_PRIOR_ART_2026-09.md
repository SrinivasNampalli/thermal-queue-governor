# Joint thermal state and FIFO progress: focused prior-art note

**9 September 2026 — bounded technical review and proposed next experiment.** This supplements the [eleven-claim review](PATENT_REVIEW_2026-09.md). It does not establish novelty, assign human inventorship, amend claims, or report a motor experiment. Motor-specific validation still awaits the datasheet and operating specifications.

**Finding:** preserving the dependence between plant state and uncertain buffered inputs is already explicit in networked-control research. Deterministic sets indexed by execution modes and checked along every allowed transition are also established. The useful unresolved question is whether a precisely specified FIFO thermal specialization admits a compact, sound implementation with a demonstrated computational advantage. Absence of an exact match in this small search supplies no novelty guarantee.

## Candidate to specify, not delivered functionality

Maintain a union of compatible hypotheses `B_k = union_h (X_h × {q_h, age_h, evidence_h})`. Here `X_h` is a thermal interval, `q_h` identifies the next irrevocable command and remaining suffix, and `age_h` supports a stated maximum service delay. Evidence history must preserve information needed to interpret delayed observations. Distinct execution histories can have the same queue head but different temperatures because heat has cooled for different durations.

For each allowed edge, propagate `x_next = a*x + b*u_applied² + w` and advance the queue **together**. A wait edge consumes a sample without retiring the head; an execute edge applies and retires it. Specify whether waiting means zero current or a held previous current: those produce different heat. Reject only hypotheses inconsistent with bounded, time-aligned evidence. A clipped temperature supplies a half-line, not an exact temperature. An admission must satisfy the limit for every surviving hypothesis, every allowed future service path, and every prefix through the candidate, followed by the applicable terminal condition.

Illustrative arithmetic, **not motor data or an experiment**: with `a=0.9, w=0`, an uncertain heat pulse of 20 from `x=100/3` produces pairs `(50, empty)` and `(30, pulse20 pending)`. A new pulse of 29 gives future peaks 74 and 71.3, respectively. Mixing temperature 50 with the other history's pending pulse invents a peak of 87.5. At a limit of 75, this Cartesian overapproximation rejects an action that both compatible histories permit. This assumes zero-power waiting; positive pulses can be represented by suitable `b*u²` values. The example demonstrates lost dependence, not a new estimation principle.

## Closest inspected primary sources

| Source and exact location | Supported overlap | Difference or unresolved point |
| --- | --- | --- |
| **Fischer, Hekler and Hanebeck (2012)**, *State Estimation in Networked Control Systems*, Information Fusion, pp. 1947–1954. [Author PDF](https://isas.iar.kit.edu/pdf/Fusion12_Fischer.pdf), §I-B; §III-A/B, eqs. (6)–(8). | Explicitly identifies temporal dependence caused by buffering. Augments plant state with still-applicable inputs and a hidden buffer mode; measurements improve inference about applied inputs. Discusses exponential mode histories, merging and pruning. | Stochastic/MMSE estimation with replacement by the newest time-indexed sequence. It does not provide this deterministic, irrevocable-FIFO thermal admission rule. General joint state/buffer estimation is clearly overlapping. |
| **Rosenthal, Noack and Hanebeck (2017)**, *State Estimation in Networked Control Systems With Delayed and Lossy Acknowledgments*, MFI, DOI `10.1109/MFI.2017.8170359`. [Author PDF](https://isas.iar.kit.edu/pdf/MFI17_Rosenthal.pdf), §III eqs. (3)–(6), §III-C; [extended chapter](https://isas.iar.kit.edu/pdf/LNEE18_Rosenthal.pdf), §3 and conclusion. | A bank of mode-conditioned estimates incorporates delayed acknowledgments by conditioning the past mode and recomputing subsequent estimates. The extension expressly suggests robust estimation using transition structure. | Gaussian/IMM approximation, not deterministic enclosure. Buffer replacement and inferred application differ from immutable FIFO service and measured current. Acknowledgment-aware hypothesis updates are already disclosed. |
| **Athanasopoulos, Smpoukis and Jungers (2017)**, *Invariance in Constrained Switching*, [arXiv v1, 2 February](https://arxiv.org/abs/1702.00598), [original PDF](https://arxiv.org/pdf/1702.00598v1), §2.1 eqs. (1)–(5), Definition 3, Proposition 1. | Retains a continuous-state set per automaton node. Invariance requires every allowed edge's reachable set to belong to the destination set. This is a direct deterministic challenge to mode-paired robust safety. | Its stated linear switching/disturbance assumptions and invariance problem are not the complete clipped-observation FIFO admission problem. Applying its structure here is a technical inference; a FIFO-specific compression theorem remains unestablished. |
| **Bemporad and Garulli (1997)**, *Predictive Control via Set-membership State Estimation for Constrained Linear Systems with Disturbances*. [Original ECC paper](https://cse.lab.imtlucca.it/~bemporad/publications/papers/ecc97-sm-mpc.pdf), §2 eqs. (9)–(12), §3 Theorem 1. | Combines set estimation and constraints for all compatible states/disturbances, with finite-prefix and tail reasoning. | Does not expressly give this hidden FIFO progress model. Robust admission over compatible histories must be compared against an adapted constrained predictor, not just a deliberately decorrelated baseline. |
| **US7248009B1 (24 July 2007)**, *Motor temperature control using estimated motor temperature based on motor power dissipation*. [Original patent text](https://patents.google.com/patent/US7248009B1/en), claims 1, 6–9; Figs. 4–5, eqs. (1)–(3). | Current-derived dissipation, thermal storage/cooling, future thermal headroom and current limiting are explicit. The description integrates winding/housing temperatures and uses squared current with winding resistance. | No joint uncertain-FIFO belief was identified in these passages. The patent's current approximation is not a calibrated loss model for the unspecified motor. Energy-based thermal accounting alone is an established ingredient. |

## Next evidence gate

1. **Prove containment first.** Define timing, duplicate/partial execution, service bounds and current during waits. Show every physical history satisfying those assumptions retains a representative hypothesis after propagation and pruning. Do not discard a possible history merely because its probability is small.
2. **Test the proposed simplification against an exhaustive oracle.** Enumerate small queues and all allowed service histories; compare admission decisions, peak bounds, branch counts and runtime. Use the same information and terminal assumptions. Include a Cartesian-hull ablation to measure dependence loss, but use a correctly adapted joint robust predictor as the serious comparator. Equivalent decisions are a valid result.
3. **Justify compression and evidence.** Merging needs identical future-relevant queue/timing/evidence semantics or a proved simulation/dominance relation. A cooler state with more unexecuted heat cannot be dropped because it is cooler. A cumulative current-energy reading cannot distinguish equal-energy commands or establish their order. Account for sensor errors, time alignment and loss-model uncertainty before pruning; preserve any additional correlations that the chosen measurement requires.

These are proposed proof and benchmark obligations, not established results. “Avoids double counting” explains an overapproximation error; it does not itself establish an inventive step or an advantage over existing joint methods.

## Search record and limits

Eight exact queries were used:

```text
"networked control" "joint" "buffer" "state estimation" acknowledgments
"packetized predictive control" "buffer" "Markov" acknowledgments
"set-valued" "state estimation" "input" "acknowledgments"
"model predictive control" "automaton" "packet" delay robust
"thermal" "energy accounting" "queued" control motor
"correlation" "packetized predictive control" state estimation
"set-membership" "constrained switching" "automaton" estimation
site.ti.com OR site:microchip.com motor "I2t" "thermal"
```

The last query contained the literal malformed `site.ti.com` term and mostly returned component/fuse material; it supplies no motor-specific conclusion. Fischer was reached directly and via the Rosenthal chapter's reference 19. The automata source was reached through [Jungers's institutional bibliography](https://perso.uclouvain.be/raphael.jungers/content/publications); the cited arXiv title/version is used rather than assuming every linked publication is identical. All five mapped source groups had original text accessible. A ScienceDirect lead on robust packetized predictive control returned an access error; a guessed ResearchGate identifier resolved to an unrelated publication and was excluded. No claims depend on either. This bounded pass did not complete patent-family, classification, prosecution or citation closure, or establish current legal status.
