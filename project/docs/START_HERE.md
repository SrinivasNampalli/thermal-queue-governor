# Thermal Queue Governor

A reproducible research prototype and patent-review draft for motor thermal control.

## The idea
When a temperature sensor reaches its ceiling, the motor may be hotter than the displayed number. A delayed controller also has to account for commands the actuator has already accepted. This project keeps a bounded temperature estimate, projects those pending commands, and admits another command only if the modeled temperature can stay below a limit with a zero-effort continuation.

The supplied paper already describes sensor clipping, anomaly screening and FDIR. This project adds a concrete scalar thermal-control implementation and tests the interaction of clipped readings and queued commands. The proposed mechanism builds on well-established control and estimation methods.

[[FIGURE:architecture]]

## What was built and tested
Runnable Python code,15 boundary tests, a research manuscript, a numbered technical disclosure, 11 discussion claims with a support matrix, two vector explanatory figures, raw simulation data, source snapshots and filing-readiness records.

The primary comparison ran 900 episodes across five controllers. In the full controller's 120 valid-model episodes there were no sampled105 C limit breaches or interval-containment failures. Mean applied effort was 90.4% of requested effort; a simple robust constant cap also avoided breaches and delivered 67.1%. These are synthetic results, not hardware measurements or factory productivity.

[[TABLE:primary_short]]

A separate ablation that incorrectly treated clipped temperature as exact breached in 28/40 episodes. A deliberately inaccurate applied-action report caused the full controller's interval to miss the true state, including113 steps while its internal flag still read valid. That flag cannot establish that the physical assumptions remain true.

## Patent outcome
Broad claims to interval estimation, robot command governors, delays or thermal derating have substantial prior-art overlap. Narrow novelty and nonobviousness are unestablished. The package is suitable for technical and practitioner review; it is not a granted patent, filed application, or recommendation to submit the discussion claims unchanged.

Human conception/inventorship, ownership, jurisdiction, prior disclosures and filing facts remain unresolved. The paper's named authors and the account owner have not been assigned as inventors of this AI-assisted proposal. The U.S. filing route is an illustrative planning assumption.

## A short explanation to say aloud
“I built a simulation of a motor thermal limiter that accounts for commands already waiting at the actuator. It treats a clipped sensor as incomplete information, then calculates how much additional effort the model can allow. It passed its stated model checks in the synthetic tests, but real calibration and actuator reporting are still required. Similar methods already exist, so patentability needs further review.”

## Where to go next
Read RESEARCH_MANUSCRIPT.pdf for methods and actual results. Read TECHNICAL_DISCLOSURE.pdf for the concrete embodiment. FULL_REVIEW_DOSSIER.pdf includes the prior-art challenge, claims/support, source audit, negative results, provenance and filing gaps. PROJECT.zip contains editable Markdown originals, runnable source, configurations and data.

Before a filing decision, have an appropriate human inventor and registered practitioner assess conception, rights, prior disclosure dates, claim differentiation and technical sufficiency. Before hardware use, calibrate and validate the model and actuator contract independently.
