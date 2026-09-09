# Interactive demo validation

Historical local verification on September 9, 2026, before the review corrections below:

- All 23 portable Node.js tests pass. They cover independent grid admission, clipped observations, interval containment, exact FIFO latency, scheduler waiting/expiry, faults, reset isolation, and metric reconciliation.
- All 16 components are selectable through both the component picker and actual raycast pointer clicks in Chromium.
- Exploded view works; dragging rotates the scene without accidentally changing the selected component.
- Play advances the simulation, pause freezes it, and step advances one second. Bounds and queued forecasts remain valid during the tested run.
- Applying new settings explicitly starts a fresh run. The optional waiting mode produces the expected 20-second timeout rejections.
- The history legend toggles series. No horizontal overflow was found at 1360, 768, 390, or 320 pixels.
- No browser script or console errors were recorded in the acceptance run.

The test scripts are committed alongside the demo. The GitHub Actions configuration runs the numerical and browser checks on uploaded source; a configured workflow is not evidence that a particular revision has passed. The underlying Python research suite is preserved separately and has 47 tests.

The extra geometry and component explanations are illustrative. No physical motor, inverter, electrical protection, sensor installation, or hardware communication protocol was tested.

## Original single-file landing page acceptance

The additional `tests/landing-smoke.cjs` acceptance run validates the repository-root `index.html` with the browser offline. It checks both 3D models, hero-to-prototype component selection, all 16 direct component clicks, plot rendering, play/pause/step and command injection, and the research-scope disclosure. It also checks the operating-system reduced-motion preference, the page motion toggle, and no horizontal overflow at 1440, 1024, 768, 390, and 320 pixels. The run recorded zero remote requests and zero browser errors. Desktop and mobile page captures were visually inspected.

The landing page presents the existing recorded study figures; it does not simulate extra research episodes to populate its comparison. The zero-breach and 90.4% figures explicitly refer to the 120 primary TQG episodes, while the 1,120 episodes and 1,008,000 transitions cover the broader study.

## September 9 review corrections

The responsive simulator now uses the same 780-pixel breakpoint for its related layout changes. The browser checks explicitly cover 768 pixels, including the single-column arrangement, rather than relying only on neighboring phone and desktop widths.

Accessibility feedback uses three polite live regions: control/component feedback, command admission, and thermal/results summaries. While running, admission updates are limited to once per five wall-clock seconds and summaries to once per 15 seconds, independent of simulation speed. Pause and step provide immediate summaries. The silent walkthrough's English VTT track is enabled by default. These implementation and browser assertions do not substitute for testing with actual assistive technology.

The public and offline exports now have different packaging. In this reviewed local build, generated `docs/index.html` is 51,413 bytes and loads deferred scripts from the same site with SHA-384 integrity checks. The repository-root offline `index.html` is 1,069,508 bytes and embeds its dependencies. Both use the same pinned, hash-verified local libraries. The generated compact prototype also embeds those libraries and is linked from the landing page. These document sizes are uncompressed bytes, not network-transfer or rendering-time benchmarks.

Generated `docs/`, duplicate compact exports, and the intermediate fragment are no longer tracked; the Pages workflow assembles deployment artifacts from source. Media has one tracked source copy in `demo/media/`. The historical `PROJECT.zip` is removed from the current tracked tree and designated for release-asset distribution. This changes the current tree, not existing Git history. Publication, release attachment, and CI completion must be verified separately.

The [primary evidence reanalysis](../project/research/PRIMARY_EVIDENCE.md) adds seed-level spread, a deterministic paired cluster bootstrap, and the near-limit peak of 104.99997190667195 °C. The editable manuscript has been corrected to describe this numerical boundary result and the uncertainty method. These are analyses of preserved synthetic results; no new research episodes or hardware measurements were added.

## Guarded thermal bridge acceptance - September 9, 2026

The separate `thermal-bridge.html` replay passed `tools/test-thermal-bridge.cjs` in Chromium with networking disabled and reduced motion enabled. The check exercised all ten stored cases, four observations per case, all nine selectable hardware parts, keyboard timeline control, play/pause/step, final-result visibility and exact displayed-result parity. Both known false-consistency cases show prominent explanations. No client errors, remote requests, horizontal overflow or component-label overflow were recorded at 1440, 1024, 768, 390 and 320 pixels. Desktop and phone screenshots were visually inspected. The original landing acceptance also passed after adding the new concept link.

These are browser and synthetic-mechanism checks. The model prescribes thermal boundaries and excludes guard-actuator energy and hardware dynamics. It makes no physical motor-validation or patentability claim.
