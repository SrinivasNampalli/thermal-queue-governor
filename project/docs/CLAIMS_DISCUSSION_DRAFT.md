# Internal claim discussion and support review

**Draft for challenge by a qualified patent practitioner. No filing recommendation. Broad novelty is a no-go on the present evidence; the narrower combination remains unestablished. No human inventor is assigned.**

These discussion claims describe the `interval_queue` demonstrator. They are not filed claims, an assertion of enforceable scope, or a patentability opinion. The accompanying disclosure’s paragraph numbers refer to `docs/TECHNICAL_DISCLOSURE.md`. Neither clipping-aware FDIR from the supplied paper nor any known component technique is asserted to be new. “Acknowledgment” means an externally asserted applied scalar in this code, with no authentication or independent execution verification.

## Discussion claims

**1.** A computer-implemented method for selecting a normalized effort in a discrete-time scalar thermal model, the method comprising:

(a) obtaining a model of nonnegative temperature rise `x` above a fixed ambient temperature, the model having transition `x_next=a x+b u^2+w`, with applied effort `u` in `[0,1]`, bounded coefficients satisfying `0<=a_min<=a_max<1`, `0<=b_min<=b_max` and `b_max>0`, and bounded additive disturbance satisfying `0<=w_min<=w_max`, and defining an allowable rise `R` from a temperature limit minus the ambient temperature;

(b) initializing a maintained state interval `[L,H]` from an externally supplied finite commissioning bound containing the modeled initial state;

(c) receiving a temperature observation governed by an upper-clipping sensor model and, when the observation is present, intersecting the maintained interval with a nonnegative measurement-consistent set, the set for a clipped observation having an unbounded upper endpoint;

(d) obtaining a requested effort in `[0,1]` and an externally supplied exact ordered FIFO of accepted pending efforts that are to apply before a newly selected effort;

(e) propagating an upper state bound from the intersected interval through each pending effort using `z_next=a_max z+b_max u^2+w_max`, while retaining bounds for the current state and every pending transition;

(f) when every retained bound satisfies `R`, selecting a nonnegative effort from a uniform effort grid, no greater than the requested effort, whose predicted transition following the entire FIFO also satisfies `R`;

(g) accepting the resulting prefix feasibility calculation subject to a validated condition that the interval `[0,R]` is invariant for the model under zero effort after the FIFO and the selected effort;

(h) latching an invalid state and returning zero selected effort upon an invalid queue, an invalid or inconsistent observation, or a failure of the prefix feasibility calculation; and

(i) advancing the maintained interval for the next decision using an externally asserted applied effort and the model’s lower and upper bounding transitions.

**2.** The method of claim 1, wherein the observation model is `y=min(T_a+x+v,C)`, with `|v|<=epsilon` and noise preceding clipping, and wherein an unsaturated observation supplies the interval `[y-T_a-epsilon,y-T_a+epsilon]`, while an observation at `C` supplies the half-line `[C-T_a-epsilon,infinity)`.

**3.** The method of claim 1, wherein an absent observation leaves the prior maintained interval unchanged by measurement processing, and a clipped observation does not replace a previously finite model-derived upper bound with the clipping level.

**4.** The method of claim 1, wherein advancing the maintained interval for an asserted applied effort `u` comprises calculating `L_next=a_min L+b_min u^2+w_min` and `H_next=a_max H+b_max u^2+w_max`.

**5.** The method of claim 1, wherein the FIFO includes the next effort to be applied and every accepted effort preceding the newly selected effort, and wherein failure is determined from the maximum of the current upper state and each successive queued upper state, without assuming that returning zero cancels a pending effort.

**6.** The method of claim 1, wherein, for upper state `z_d` after the FIFO and grid spacing `Delta`, selecting comprises calculating `c=sqrt(max(0,(R-a_max z_d-w_max)/b_max))`, choosing the downward grid value `Delta floor(min(requested,c,1)/Delta)`, and recomputing the upper state of its transition to verify the limit.

**7.** The method of claim 1, wherein the validated zero-effort condition is `w_max/(1-a_max)<=R`, so that any end-of-prefix upper state at most `R` remains bounded by `R` for an indefinite sequence of zero efforts in the stated model.

**8.** The method of claim 1, wherein initialization rejects a commissioning interval without a finite ordered nonnegative upper/lower pair, and model construction rejects a coefficient set that fails the zero-effort condition, before issuing a valid feasibility calculation.

**9.** The method of claim 1, wherein an invalid queue includes a queue exceeding 120 efforts, a nonfinite effort, or an effort outside `[0,1]`, and wherein such invalidity is latched before observation processing.

**10.** The method of claim 1, wherein, after the invalid state is latched, subsequent decisions from the same instance continue to return zero and invalid status without rebasing the interval from a later apparently consistent observation.

**11.** The method of claim 1, wherein an externally asserted applied effort that is nonfinite or outside `[0,1]` causes the invalid state to be latched and prevents that call from propagating the maintained interval, without treating range validation as authentication or evidence that the asserted effort actually applied.

## Construction and scope notes

The equations in claims 2 and 6 express the ideal arithmetic relationships. The current implementation uses the tolerances disclosed in [0010], [0013] and [0015]. It is not a directed-rounding implementation. A practitioner should decide whether to describe those numerical details explicitly or retain a mathematical formulation with an accurately limited implementation example. Do not claim a strict machine-arithmetic enclosure theorem from these tests.

Claim 1(b)’s containment condition is an external commissioning assumption. The constructor validates numerical shape and finiteness; it cannot check containment of an unknown physical temperature. Claim 1(d)’s exact FIFO condition and claim 1(i)’s asserted applied value likewise depend on the caller. Shape validation does not verify actuator execution. The latch is local software state, not a certified emergency stop.

The `decision_id` counter is disclosed for audit completeness but is omitted from the claims because it supplies no decision-consumption or replay protection. The code has no wall-clock expiry, network acknowledgment authentication, hardware interface, automatic recommissioning, or learned parameter identification. No claim covers the unimplemented alternatives [0030]–[0031].

## Existing test key and actual coverage

The identifiers below refer to the 15 existing test methods in `tests/test_governor.py`. This review lists their scope; execution results and experiment outputs are reported separately by the project. Passing tests provide examples and boundary checks, not exhaustive proof of all contracts.

| ID | Existing test method | Relevant scope and limit |
|---|---|---|
| T01 | `test_clipping_preserves_upper` | A clipped observation retains a finite upper bound and tightens the lower bound in one case. |
| T02 | `test_missing_is_prediction_only` | A missing reading leaves an existing interval unchanged. |
| T03 | `test_empty_intersection_rejects` | A strongly inconsistent reading raises an intersection error. |
| T04 | `test_clipped_unknown_start_rejected` | An infinite upper commissioning bound is rejected. |
| T05 | `test_invalid_model` | Rejects `a_max=1` and a zero-input-invariant violation; does not enumerate every malformed field. |
| T06 | `test_queue_changes_admissibility` | A hot queued prefix fails where an empty queue allows positive action. |
| T07 | `test_invalid_queue_latches` | A NaN queue effort causes invalidity that persists for a subsequent valid-shape queue. |
| T08 | `test_queue_overflow` | A queue of length 121 is rejected. |
| T09 | `test_requested_grid_quantization` | Demand `0.67` is rounded to `0.65` at default spacing. |
| T10 | `test_nondefault_nominal_parameters` | Comparator `nominal_queue` uses nondefault model parameters. This is not support for the claimed `interval_queue` guarantee. |
| T11 | `test_invalid_demand` | A NaN requested effort raises `ValueError`; this is an exception path, not the invalid latch. |
| T12 | `test_corners_contained` | Endpoint combinations for two states and three efforts are enclosed by `propagate`. |
| T13 | `test_zero_terminal_invariant` | Default model’s zero transition and equilibrium satisfy the terminal bound. |
| T14 | `test_upper_corner_closed_loop` | A 600-step upper-corner episode with a length-20 FIFO maintains validity, state containment and the sampled limit. |
| T15 | `test_inconsistent_packet_no_rebase` | Inconsistent reading produces zero/invalid instead of rebasing. |

No dedicated existing test checks invalid acknowledgment handling, all negative/out-of-range initialization cases, arbitrary grid spacing, every numerical clipping tolerance, or counter/replay behavior. Direct source support for a limitation must not be mislabeled as dedicated test coverage.

## Complete limitation support matrix

“FIG” identifies an authored vector figure in figures/architecture.svg or figures/flow.svg and its disclosure paragraph. “Nearest art” points to `research/prior_art_challenge.md`; it is a challenge reference, not an incorporation of missing disclosure. A test shown as partial does not independently establish the full row.

| Claim clause | Disclosure support | Delivered code support | FIG | Existing verification | Nearest art / review issue |
|---|---|---|---|---|---|
| 1 preamble: computed normalized-effort method | [0001], [0004], [0023] | `Governor.decide`; runner `main` | 1, [0028]; 2, [0029] | T14; runner source | R2; thermal context P1/R5 |
| 1(a): scalar state, fixed ambient, effort/parameter bounds and rise limit | [0004]–[0006] | `Model`; `Model.__post_init__`; `propagate`; `admissible` | 1: 110/130/150 | T05/T12/T13; fixed ambient comes from source | R1/R2; scalar thermal application not itself new |
| 1(b): finite commissioned state interval and containment assumption | [0007], [0022] | `Governor.__init__` | 2: initialization | T04; containment is assumed, not constructor-tested | R1 |
| 1(c): observation intersection, nonnegative state, no finite clipped measurement upper bound | [0008]–[0010] | `intersect_reading`; `Governor.decide` | 1: 100/110; 2: intersection | T01/T03/T15 | R1; supplied paper already discusses censoring |
| 1(d): bounded demand and exact FIFO before candidate | [0011]–[0012], [0023] | `Governor.decide`; `admissible`; runner `pending_before`, pop/append order | 1: 120/140; 2: validation | T06/T08/T11/T14; exactness is an external contract | R3 |
| 1(e): upper propagation through every pending transition and retained prefix | [0013] | `admissible`, `for u in pending` and `peak` | 2: queued prediction | T06/T14 | R2/R3 |
| 1(f): requested-effort-limited grid candidate after FIFO | [0014]–[0015] | `admissible`, `room`, `cap`, `action`, `end` | 2: candidate | T09/T14; exhaustive maximality not tested | R2; simple scalar solution alone is weak distinction |
| 1(g): prefix feasibility plus indefinite zero-tail condition | [0016]–[0017], [0022] | `Model.__post_init__`; final Boolean of `admissible` | 2: candidate and terminal test | T05/T13/T14 | R4 |
| 1(h): latch and zero on queue, observation or feasibility fault | [0018]–[0019] | `Governor.decide`, `valid`, `reason`, invalid return paths | 2: invalid branches | T03/T06/T07/T08/T15; T06 tests calculation, not latch | R2/R4; generic fail-closed behavior |
| 1(i): next-state update from externally asserted applied effort | [0005], [0020], [0023] | `Governor.advance`; runner `g.advance(expected)` | 1: 140 to 110; 2: advance | T12/T14; assertion truth is not verified | R3 |
| 2: noise-before-clipping law and both observation-set forms | [0008]–[0010] | `intersect_reading`; runner reading expression | 1: 100/110 | T01; runner source; no dedicated unsaturated-noise-edge test | R1; supplied paper background |
| 3: missing observation and finite prior upper retained under clipping | [0009]–[0010] | `intersect_reading`, `reading is None`, `upper=math.inf` | 2: missing/present branch | T01/T02 | R1 |
| 4: lower/upper transition equations | [0005], [0020] | `propagate`; `Governor.advance` | 1: 110 | T12/T14 | R1/R2 |
| 5: entire ordered queue, all-prefix maximum, no cancellation by zero | [0011], [0013], [0017]–[0018], [0023] | `admissible`; runner FIFO update | 1: 120/140; 2: prefix | T06/T14; pop/append source | R3/R4 |
| 6: square-root cap, grid floor and final recomputation | [0014]–[0015], [0027] | `admissible` | 2: candidate | T09/T14; analytical example; general proof uses monotonicity | R2; ordinary scalar constraint solving |
| 7: zero-input equilibrium bound and invariant interval | [0006], [0017] | `Model.__post_init__`; monotone zero transition in `propagate` | 2: terminal | T05/T13/T14 | R4 |
| 8: finite ordered initialization and invariant-valid model | [0006]–[0007] | `Governor.__init__`; `Model.__post_init__` | 2: initialization | T04/T05; other malformed pairs source-reviewed only | R1/R4 |
| 9: 120-entry/range/finite queue check before observation | [0012], [0019] | first queue check in `Governor.decide` | 2: queue validation | T07/T08; range endpoints source-reviewed only | R3; implementation capacity is not a novelty premise |
| 10: persistent invalidity and no subsequent rebase | [0019] | early `if not self.valid` in `Governor.decide`; no reset API | 2: latched branch | T07/T15; T07 checks later valid-shape queue | R1/R4; general defensive implementation |
| 11: invalid asserted applied value latches and prevents that propagation | [0020] | first branch of `Governor.advance` | 1: 140 to 110; 2: invalid ACK | Source inspection only; no dedicated existing test | R3; numeric validation is not execution verification |

## Practitioner challenge and next decision

R1–R4 make a broad formulation difficult: the narrow relationship between a censor-consistent bound, all queued commands, a quantized scalar suffix and an invariant fallback is the proposed discussion subject, with no established novelty conclusion. The current record provides no evidence of an unexpected technical interaction that overcomes the combination challenge. Claim 9’s queue-length constant and other arbitrary numeric restrictions may narrow wording without adding inventive merit.

The disclosure supports an implementation discussion, not an assurance that claim language will satisfy a jurisdiction’s eligibility, novelty, nonobviousness, enablement or definiteness requirements. Before any filing recommendation, a practitioner would need the supplied paper’s public-disclosure timeline, actual human contribution/inventorship records, an expanded claim-oriented prior-art search, and a reasoned position on the closest combinations. The work completed here does not file, publish or transfer rights in the proposed material.
