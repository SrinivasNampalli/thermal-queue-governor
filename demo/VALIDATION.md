# Interactive demo validation

Local verification on September 9, 2026:

- All 23 portable Node.js tests pass. They cover independent grid admission, clipped observations, interval containment, exact FIFO latency, scheduler waiting/expiry, faults, reset isolation, and metric reconciliation.
- All 16 components are selectable through both the component picker and actual raycast pointer clicks in Chromium.
- Exploded view works; dragging rotates the scene without accidentally changing the selected component.
- Play advances the simulation, pause freezes it, and step advances one second. Bounds and queued forecasts remain valid during the tested run.
- Applying new settings explicitly starts a fresh run. The optional waiting mode produces the expected 20-second timeout rejections.
- The history legend toggles series. No horizontal overflow was found at 1360, 768, 390, or 320 pixels.
- No browser script or console errors were recorded in the acceptance run.

The test scripts are committed alongside the demo. GitHub Actions reruns the numerical and browser checks on the uploaded source. The underlying Python research suite is preserved separately and has 47 tests.

The extra geometry and component explanations are illustrative. No physical motor, inverter, electrical protection, sensor installation, or hardware communication protocol was tested.

## Single-file landing page

The additional `tests/landing-smoke.cjs` acceptance run validates the repository-root `index.html` with the browser offline. It checks both 3D models, hero-to-prototype component selection, all 16 direct component clicks, plot rendering, play/pause/step and command injection, and the research-scope disclosure. It also checks the operating-system reduced-motion preference, the page motion toggle, and no horizontal overflow at 1440, 1024, 768, 390, and 320 pixels. The run recorded zero remote requests and zero browser errors. Desktop and mobile page captures were visually inspected.

The landing page presents the existing recorded study figures; it does not simulate extra research episodes to populate its comparison. The zero-breach and 90.4% figures explicitly refer to the 120 primary TQG episodes, while the 1,120 episodes and 1,008,000 transitions cover the broader study.
