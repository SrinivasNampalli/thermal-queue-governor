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


## Guarded bridge 3D assembly - September 10, 2026

The new `tools/test-bridge-3d.cjs` acceptance passed against the final offline export in Chromium. It selected all **18 components through real canvas raycasts**, checked orbit and zoom independently from selection, exercised cutaway/exploded views and camera close-ups, and verified operating-system motion preferences including a live preference change. All ten stored cases retained their first/final samples, displayed results, final-only result reveal, and renderer synchronization. There were no client errors or external requests, and no horizontal overflow at 1440, 768, 390 or 320 pixels. Desktop, phone, sensor, electronics and exploded-assembly captures were visually inspected. The original nine-part schematic and ten-case replay acceptance passed again at five viewport widths.

The 3D source renders on state changes and during active camera/thermal animation, with offscreen drawing suspended. These are implementation choices, not measured frame-rate guarantees. Geometry includes explanatory motor internals, an enlarged sensor stack, and controller electronics. Stored temperatures drive its colours; electrical dynamics, mechanical rotation, actuator power and dimensional/manufacturing accuracy are not simulated. The thirteen mechanism tests and their stored data are unchanged.

A separate navigation regression exercises the persisted `pagehide` event contract: the retained page keeps its canvas and camera and can still step/play; ordinary teardown disposes the scene and stops playback. This check does not assert that a particular browser admits the page into its native back/forward cache. Offline and hosted walkthrough links resolve to their intended locations.

The final recorded walkthrough is approximately 68.79 seconds (H.264, 1360 by 1000, 24 fps), with eleven caption cues. Seven recorded selections used real 3D pointer clicks; one used the visible component selector. The nominal and strong-wire-leak examples display 130.0 C, and the guard-bypass example displays 85.0 C. All source/media hashes in `media/bridge-recording.json` match the final files, the MP4 fully decoded, and representative encoded frames and the poster were visually inspected. Local HTTP acceptance verified both walkthroughs, default caption loading/position, seeking/playback, all eighteen bridge options, mobile layout and zero client errors or failed/offsite requests. The README includes a GIF excerpt and the watch link.


## Exploded component callouts - September 10, 2026

The new callout acceptance passed against the offline guide. It exercised all 18 native explanation buttons through pointer and keyboard selection, the three groups of six cards, numbered pins and leader-line alignment, camera movement, entering/leaving the guide, reassembly, reduced motion, and the direct guide URL. Desktop layouts at 1440 and 1024 pixels place cards around the model; 768, 390 and 320 pixels place them below. No text or horizontal layout overflow, client errors, or external requests were recorded. Motor, sensor, electronics, desktop and phone captures were visually reviewed. All ten recorded case endpoints/results remain unchanged.

Projection anchors track the explanatory geometry and camera; they are not raycast measurements of which surface is physically visible. The bypass card is a clearly identified fault illustration. The previous video and its media bytes are unchanged. Its recording receipt now explicitly identifies captured commit 35248bca71428c7ae0585bdcc044276c42bd9b5e; all five source hashes were checked against that revision rather than the subsequently enhanced live page.

The original 18-part canvas/raycast acceptance also passed after integration. Local HTTP checks verified the guide deep link, card-to-inspector synchronization, guide dismissal, and both captioned videos, with zero client errors, offsite requests or failed requests.
