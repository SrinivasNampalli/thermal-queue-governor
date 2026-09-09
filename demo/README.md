# Interactive motor and thermal governor

[Open the landing page](https://srinivasnampalli.github.io/thermal-queue-governor/) · [Jump to the prototype](https://srinivasnampalli.github.io/thermal-queue-governor/#prototype) · [Watch the recorded walkthrough](https://srinivasnampalli.github.io/thermal-queue-governor/watch.html)

Click a component in the 3D model to highlight it and read its purpose. The component selector provides the same information by keyboard. Drag to rotate the assembly, or switch on exploded view to expose the internals.

The 16 component groups include the housing, stator, windings, rotor, shaft, bearings, cooling fan, encoder, temperature sensor, terminals, protective earth, phase cables, inverter, DC-link capacitor, current sensing, and controller. These are a generic motor-and-drive schematic, not a dimensioned design, wiring plan, bill of materials, or validated physical architecture.

## Explore the controller

- **Play, pause, step, and speed:** one simulation sample represents one second.
- **Commands:** inject effort requests and inspect the eight-slot accepted FIFO. Already accepted commands retain their order and effort.
- **Original governor:** reduce a request to the largest safe grid effort after accounting for queued heat.
- **Demo waiting scheduler:** wait for full requested effort; reject after 20 simulated seconds. This upstream policy is an explanatory addition, not part of the original controller.
- **Thermal settings:** set the temperature ceiling, commissioning-interval width, and effort ceiling. Apply & restart explicitly begins a new run rather than rewriting accepted commands or inventing a narrower live bound.
- **Results:** simulated actual temperature, bounds, clipped readings, queued upper peak, delivered effort, completion throughput, and rejected requests update from the same run.

The sensor saturates at 95°C. A clipped reading provides a lower constraint and does not force the model upper bound down to 95°C. The actual-temperature check uses simulator truth unavailable from a saturated physical sensor. Electrical waveforms, current, voltage, magnetics, bearing wear, and load mechanics are not simulated.

## Run or rebuild

The repository-root `index.html` is the complete landing page and simulator in one file. Open it directly, including offline: all runtime code and dependencies are embedded. Research and video links point to the public repository/site and require internet access. No build process is needed to use this file.

The generated `demo/index.html` is a compact simulator-only export with the same pinned, locally bundled libraries and no CDN dependencies. It is also published as `/prototype.html`. To serve this view from the repository root:

```sh
python -m http.server 8000 --directory demo
```

Open `http://localhost:8000`. No account, backend, or hardware connection is used.

The simulator sources are `src/interface.html`, `src/thermal-engine.js`, `src/motor-scene.js`, and `src/components.js`. The landing page's layout, styles, and motion controls are in `src/landing.html`. When editing the source, optionally rebuild all preassembled pages with the Python standard library:

```sh
python demo/tools/build_demo.py
node --test demo/tests/thermal-engine.test.cjs
```

The build emits three views from the same simulator: a root `index.html` offline download, a compact `demo/index.html` with embedded libraries, and a smaller public `docs/index.html` with deferred local scripts and SHA-384 integrity checks. Vendor assets are verified against publisher provenance before assembly. The generated `docs/`, compact HTML, and intermediate fragment are ignored by Git. GitHub Actions builds and uploads Pages artifacts; it does not commit duplicate pages or media. Source media is stored once in `demo/media/`.

For browser interaction tests or a new recording:

```sh
cd demo
npm ci
npx playwright install chromium
npm run test:browser
npm run test:landing
npm run record
npm run build
```

Recording also requires FFmpeg with H.264 and GIF encoders on PATH, or `FFMPEG_PATH` set to its executable. Optional `CHROMIUM_EXECUTABLE` and `PLAYWRIGHT_MODULE_PATH` overrides support an existing local runtime. The recording script operates the actual UI, burns in chapter captions, and produces MP4, a short GIF preview, a poster, and caption/recording metadata. Raw intermediate video stays in a temporary folder or the `DEMO_RECORD_DIR` override.

The interactive CI job uses the official Playwright `v1.62.1-noble` container, pinned by digest and matched to the npm lockfile. Browsers and their system dependencies are already installed, so CI does not depend on unrelated runner-wide apt repositories. Update the image version and digest together with Playwright when upgrading. See the [official container CI guidance](https://playwright.dev/docs/ci#via-containers) and [Docker version guidance](https://playwright.dev/docs/docker#image-tags).

## Evidence and references

See [validation](VALIDATION.md) and [third-party/component sources](THIRD_PARTY_NOTICES.md). The 23 JavaScript tests and browser checks are additional software verification; they do not add research episodes to the preserved paper or certify hardware.

The MP4 contains a real browser recording of this synthetic demo. It is silent with explanatory captions. The GIF is a cropped excerpt of that same recording.

## Separate guarded sensor concept

The [Guarded Thermal Bridge Interrogator](../thermal-bridge.html) is a self-contained replay of ten computed sensor-module experiments with a selectable cooling bridge and an independently controlled thermal guard. Its [technical design](../project/research/GUARDED_THERMAL_BRIDGE.md) and [model](../project/thermal_bridge/) explain the equations, tests and known false-consistency cases. It does not change the TQG controller.

`python tools/build_demo.py` also bundles this page from `src/thermal-bridge.template.html` and the recorded model results. Run `node tools/test-thermal-bridge.cjs` to check the offline replay and component interactions in Chromium. The public URL is [thermal-bridge.html](https://srinivasnampalli.github.io/thermal-queue-governor/thermal-bridge.html).
