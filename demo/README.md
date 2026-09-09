# Interactive motor and thermal governor

[Open the demo](https://srinivasnampalli.github.io/Patent/) · [Watch the recorded walkthrough](https://srinivasnampalli.github.io/Patent/watch.html)

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

Open `index.html` in a browser with internet access for the pinned Three.js and D3 libraries. Alternatively, from the repository root:

```sh
python -m http.server 8000 --directory demo
```

Open `http://localhost:8000`. No account, backend, or hardware connection is used.

The editable sources are `src/interface.html`, `src/thermal-engine.js`, `src/motor-scene.js`, and `src/components.js`. Rebuild the single-page export with the Python standard library:

```sh
python demo/tools/build_demo.py
node --test demo/tests/thermal-engine.test.cjs
```

The standalone template preserves the original visualization exporter’s styles and sandbox wrapper. The public demo is assembled entirely from the committed files. The build also refreshes `docs/`, the GitHub Pages export served from the repository’s `main` branch.

For browser interaction tests or a new recording:

```sh
cd demo
npm ci
npx playwright install chromium
npm run test:browser
npm run record
npm run build
```

Recording also requires FFmpeg with H.264 and GIF encoders on PATH, or `FFMPEG_PATH` set to its executable. Optional `CHROMIUM_EXECUTABLE` and `PLAYWRIGHT_MODULE_PATH` overrides support an existing local runtime. The recording script operates the actual UI, burns in chapter captions, and produces MP4, a short GIF preview, a poster, and caption/recording metadata. Raw intermediate video stays in a temporary folder or the `DEMO_RECORD_DIR` override.

## Evidence and references

See [validation](VALIDATION.md) and [third-party/component sources](THIRD_PARTY_NOTICES.md). The 23 JavaScript tests and browser checks are additional software verification; they do not add research episodes to the preserved paper or certify hardware.

The MP4 contains a real browser recording of this synthetic demo. It is silent with explanatory captions. The GIF is a cropped excerpt of that same recording.
