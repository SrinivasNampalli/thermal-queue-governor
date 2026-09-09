/* Educational cutaway schematic. Geometry is illustrative, not a wiring or fabrication specification.
 * The drive electronics explain a possible implementation; the scalar simulator does not model these circuits.
 * No hardware interface, electrical protection, physical ACK authentication, or real motor control is implemented.
 */
window.mountThermalMotor = async function mountThermalMotor(container, colors, options = {}) {
  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js');
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
  canvas.setAttribute('role', 'img');
  container.appendChild(canvas);

  const col = name => new THREE.Color(colors[name] || colors.foreground);
  const fg = col('foreground'), bg = col('background');
  const neutral = fg.clone().lerp(bg, 0.46);
  const bright = fg.r + fg.g + fg.b > bg.r + bg.g + bg.b ? fg.clone() : bg.clone();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
  const assembly = new THREE.Group(); scene.add(assembly);
  scene.add(new THREE.HemisphereLight(bright, neutral, 2.35));
  const keyLight = new THREE.DirectionalLight(bright, 3.4);
  keyLight.position.set(3, 7, 6); scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(col('bounds'), 1.75);
  rimLight.position.set(-4, 1, -5); scene.add(rimLight);
  const fillLight = new THREE.DirectionalLight(bright, 1.3);
  fillLight.position.set(-4, 2, 5); scene.add(fillLight);

  const materials = new Set(), textures = new Set(), pickables = [];
  const components = new Map();
  const movers = [];
  const matCache = new Map();
  const definitions = {
    casing: { color: neutral, metalness: 0.65, roughness: 0.32, side: THREE.DoubleSide },
    dark: { color: fg.clone().lerp(bg, 0.68), metalness: 0.35, roughness: 0.43 },
    steel: { color: fg.clone().lerp(bg, 0.24), metalness: 0.83, roughness: 0.24 },
    copper: { color: col('bounds'), metalness: 0.58, roughness: 0.29 },
    board: { color: col('reading').lerp(bg, 0.5), metalness: 0.12, roughness: 0.53 },
    reading: { color: col('reading'), metalness: 0.2, roughness: 0.4 },
    bounds: { color: col('bounds'), metalness: 0.3, roughness: 0.36 },
    actual: { color: col('actual'), metalness: 0.2, roughness: 0.38 }
  };
  function component(id) {
    if (components.has(id)) return components.get(id);
    const group = new THREE.Group();
    group.userData.componentId = id; assembly.add(group); components.set(id, group);
    return group;
  }
  function mat(id, type) {
    const cacheKey = id + ':' + type;
    if (matCache.has(cacheKey)) return matCache.get(cacheKey);
    const result = new THREE.MeshStandardMaterial(definitions[type]);
    result.userData.baseColor = result.color.clone();
    result.userData.componentId = id;
    result.userData.type = type;
    materials.add(result); matCache.set(cacheKey, result); return result;
  }
  function group(id, base = [0, 0, 0], delta = [0, 0, 0], parent = component(id)) {
    const result = new THREE.Group(); result.position.fromArray(base); parent.add(result);
    movers.push({ object: result, base: new THREE.Vector3(...base), delta: new THREE.Vector3(...delta) });
    return result;
  }
  function mesh(id, geometry, type, parent = component(id)) {
    const result = new THREE.Mesh(geometry, typeof type === 'string' ? mat(id, type) : type);
    result.userData.componentId = id;
    parent.add(result); if (id) pickables.push(result); return result;
  }
  function box(id, size, position, type, parent) {
    const result = mesh(id, new THREE.BoxGeometry(...size), type, parent);
    result.position.fromArray(position); return result;
  }
  function cylinder(id, radius, length, type, x = 0, parent, open = false, start = 0, arc = Math.PI * 2) {
    const result = mesh(id, new THREE.CylinderGeometry(radius, radius, length, 48, 1, open, start, arc), type, parent);
    result.rotation.z = Math.PI / 2; result.position.x = x; return result;
  }
  function ring(id, radius, tube, type, x, parent, arc = Math.PI * 2) {
    const result = mesh(id, new THREE.TorusGeometry(radius, tube, 8, 64, arc), type, parent);
    result.rotation.y = Math.PI / 2; result.position.x = x; return result;
  }
  function tube(id, points, radius, type, parent) {
    return mesh(id, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 28, radius, 6, false), type, parent);
  }
  function label(text, position, id, parent = component(id), width = 0.26) {
    const bitmap = document.createElement('canvas'); bitmap.width = 128; bitmap.height = 80;
    const ctx = bitmap.getContext('2d');
    ctx.fillStyle = colors.background; ctx.fillRect(0, 0, 128, 80);
    ctx.strokeStyle = colors.bounds; ctx.lineWidth = 5; ctx.strokeRect(3, 3, 122, 74);
    ctx.fillStyle = colors.foreground; ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 64, 43);
    const texture = new THREE.CanvasTexture(bitmap); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: true, transparent: true }); materials.add(material);
    const sprite = new THREE.Sprite(material); sprite.position.fromArray(position); sprite.scale.set(width, width * 0.625, 1);
    sprite.userData.componentId = id; parent.add(sprite); pickables.push(sprite); return sprite;
  }

  const housing = group('housing', [0, 0, 0], [0, 0.35, -0.72]);
  const cutStart = 0.83, cutArc = Math.PI * 2 - 1.66;
  cylinder('housing', 1, 2.65, 'casing', 0, housing, true, cutStart, cutArc);
  for (let i = 0; i < 15; i++) cylinder('housing', 1.105, 0.04, 'casing', -1.25 + i * 0.18, housing, true, cutStart, cutArc);
  for (const x of [-1.41, 1.41]) {
    const endPlate = mesh('housing', new THREE.RingGeometry(0.48, 1.01, 48), 'casing', housing);
    endPlate.rotation.y = Math.PI / 2; endPlate.position.x = x;
    ring('housing', 0.97, 0.075, 'casing', x, housing);
    for (let j = 0; j < 8; j++) {
      const angle = j * Math.PI / 4;
      const bolt = cylinder('housing', 0.053, 0.085, 'steel', x + Math.sign(x) * 0.08, housing);
      bolt.position.y = Math.cos(angle) * 0.86; bolt.position.z = Math.sin(angle) * 0.86;
    }
  }
  for (const x of [-0.88, 0.88]) {
    box('housing', [0.48, 0.35, 1.28], [x, -1.09, 0], 'casing', housing);
    box('housing', [0.73, 0.1, 1.5], [x, -1.29, 0], 'dark', housing);
    for (const z of [-0.54, 0.54]) {
      const screw = mesh('housing', new THREE.CylinderGeometry(0.053, 0.053, 0.025, 6), 'steel', housing);
      screw.position.set(x, -1.225, z);
    }
  }
  const stator = group('stator', [0, 0, 0], [0, 0.13, -0.2]);
  cylinder('stator', 0.905, 2.3, 'steel', 0, stator, true, cutStart, cutArc);
  for (let j = 0; j < 18; j++) {
    const angle = j * Math.PI * 2 / 18;
    const tooth = box('stator', [2.19, 0.14, 0.115], [0, Math.cos(angle) * 0.815, Math.sin(angle) * 0.815], 'dark', stator);
    tooth.rotation.x = angle;
  }
  for (let j = 0; j < 12; j++) cylinder('stator', 0.908, 0.014, 'dark', -1.02 + j * 0.185, stator, true, cutStart, cutArc);

  const windings = group('windings', [0, 0, 0], [0, 0.74, 0.45]);
  for (let j = 0; j < 18; j++) {
    const angle = j * Math.PI * 2 / 18 + 0.145;
    for (const offset of [-0.034, 0.034]) {
      const winding = box('windings', [2.28, 0.07, 0.055], [0, Math.cos(angle) * 0.733 + Math.cos(angle + Math.PI / 2) * offset, Math.sin(angle) * 0.733 + Math.sin(angle + Math.PI / 2) * offset], 'copper', windings);
      winding.rotation.x = angle;
    }
  }
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) ring('windings', 0.72 + i * 0.027, 0.029, 'copper', side * (1.045 + i * 0.055), windings);

  const rotorMove = group('rotor', [0, 0, 0], [0.28, -0.05, 0.04]);
  const spinningRotor = new THREE.Group(); rotorMove.add(spinningRotor);
  cylinder('rotor', 0.47, 2.43, 'dark', 0, spinningRotor);
  for (let j = 0; j < 16; j++) {
    const angle = j * Math.PI * 2 / 16;
    const bar = box('rotor', [2.22, 0.02, 0.044], [0, Math.cos(angle) * 0.472, Math.sin(angle) * 0.472], 'steel', spinningRotor);
    bar.rotation.x = angle;
  }
  for (const x of [-1.17, 1.17]) ring('rotor', 0.44, 0.026, 'steel', x, spinningRotor);
  const shaftMove = group('shaft', [0, 0, 0], [0.28, -0.05, 0.04]);
  const spinningShaft = new THREE.Group(); shaftMove.add(spinningShaft);
  cylinder('shaft', 0.165, 4.24, 'steel', 0.12, spinningShaft);
  cylinder('shaft', 0.205, 0.28, 'steel', 1.65, spinningShaft);
  box('shaft', [0.45, 0.053, 0.081], [2.01, 0.168, 0], 'dark', spinningShaft);
  for (const side of [-1, 1]) {
    const bearing = group('bearings', [side * 1.43, 0, 0], [side * 0.65, 0, 0]);
    ring('bearings', 0.335, 0.069, 'steel', 0, bearing);
    ring('bearings', 0.204, 0.036, 'steel', 0, bearing);
    for (let j = 0; j < 10; j++) {
      const angle = j * Math.PI / 5;
      const ball = mesh('bearings', new THREE.SphereGeometry(0.051, 12, 8), 'steel', bearing);
      ball.position.set(0.02, Math.cos(angle) * 0.267, Math.sin(angle) * 0.267);
    }
    ring('bearings', 0.27, 0.013, 'dark', 0.06, bearing);
  }

  const fanMove = group('fan', [-1.79, 0, 0], [-1.04, 0.12, 0]);
  const spinningFan = new THREE.Group(); fanMove.add(spinningFan);
  cylinder('fan', 0.26, 0.16, 'dark', 0, spinningFan);
  for (let j = 0; j < 9; j++) {
    const angle = j * Math.PI * 2 / 9;
    const blade = box('fan', [0.1, 0.41, 0.22], [0, Math.cos(angle) * 0.48, Math.sin(angle) * 0.48], 'bounds', spinningFan);
    blade.rotation.set(angle, 0.21, 0.12);
  }
  for (let j = 0; j < 3; j++) ring('fan', 0.49 + j * 0.18, 0.018, 'steel', -0.12, fanMove);
  for (let j = 0; j < 8; j++) {
    const angle = j * Math.PI / 4;
    const spoke = box('fan', [0.025, 1.63, 0.023], [-0.14, 0, 0], 'steel', fanMove); spoke.rotation.x = angle;
  }
  const encoder = group('encoder', [-2.14, 0, 0], [-1.23, 0.2, 0]);
  cylinder('encoder', 0.31, 0.26, 'dark', 0, encoder);
  cylinder('encoder', 0.245, 0.016, 'bounds', -0.14, encoder);
  ring('encoder', 0.26, 0.025, 'steel', -0.13, encoder);
  for (let j = 0; j < 12; j++) {
    const angle = j * Math.PI / 6;
    const mark = box('encoder', [0.025, 0.065, 0.018], [-0.16, Math.cos(angle) * 0.196, Math.sin(angle) * 0.196], 'steel', encoder);
    mark.rotation.x = angle;
  }
  box('encoder', [0.19, 0.22, 0.21], [0.01, 0.28, 0], 'dark', encoder);

  const terminals = group('terminals', [-0.41, 1.13, -0.12], [-0.1, 0.75, -0.35]);
  box('terminals', [0.81, 0.14, 0.65], [0, 0, 0], 'casing', terminals);
  box('terminals', [0.69, 0.13, 0.49], [0, 0.135, 0], 'dark', terminals);
  for (let row = 0; row < 2; row++) for (let j = 0; j < 3; j++) {
    const stud = mesh('terminals', new THREE.CylinderGeometry(0.052, 0.052, 0.1, 6), 'copper', terminals);
    stud.position.set(-0.23 + j * 0.23, 0.24, -0.14 + row * 0.28);
    box('terminals', [0.06, 0.016, 0.26], [-0.23 + j * 0.23, 0.205, 0], 'copper', terminals);
  }
  ['U', 'V', 'W'].forEach((letter, j) => label(letter, [-0.23 + j * 0.23, 0.42, 0.16], 'terminals', terminals, 0.19));
  const earth = group('earth', [0.24, 1.03, 0.46], [0, 0.35, -0.72]);
  const earthStud = mesh('earth', new THREE.CylinderGeometry(0.074, 0.074, 0.08, 6), 'steel', earth);
  ring('earth', 0.087, 0.019, 'actual', 0, earth).rotation.set(Math.PI / 2, 0, 0);
  label('PE', [0.1, 0.21, 0.04], 'earth', earth, 0.24);
  tube('earth', [[0, 0, 0], [0.21, -0.04, 0.17], [0.25, -0.38, 0.18], [0.38, -0.67, 0.16]], 0.025, 'actual', earth);

  const sensor = group('temp_sensor', [0.48, 0.82, 0.43], [0.16, 0.69, 0.46]);
  const sensorBody = box('temp_sensor', [0.235, 0.105, 0.21], [0, 0, 0], 'reading', sensor);
  sensorBody.rotation.x = -0.4;
  cylinder('temp_sensor', 0.042, 0.28, 'steel', 0, sensor).rotation.z = 0;
  label('T', [0, 0.21, 0.03], 'temp_sensor', sensor, 0.19);

  // Exposed adjacent drive board is a conceptual component map, not a circuit diagram.
  const driveOffset = [3.25, -0.79, 0.37];
  const driveDelta = [0.42, 0.03, 0.52];
  const drive = group('inverter', driveOffset, driveDelta);
  box('inverter', [1.77, 0.11, 1.71], [0, 0, 0], 'board', drive);
  box('inverter', [1.89, 0.1, 1.83], [0, -0.16, 0], 'casing', drive);
  for (const x of [-0.76, 0.76]) for (const z of [-0.74, 0.74]) {
    const standoff = mesh('inverter', new THREE.CylinderGeometry(0.035, 0.035, 0.16, 8), 'steel', drive);
    standoff.position.set(x, -0.09, z);
    const screw = mesh('inverter', new THREE.CylinderGeometry(0.049, 0.049, 0.018, 6), 'steel', drive);
    screw.position.set(x, 0.067, z);
  }
  box('inverter', [1.14, 0.11, 0.58], [0.03, 0.13, -0.04], 'casing', drive);
  for (let i = 0; i < 9; i++) box('inverter', [0.04, 0.34, 0.56], [-0.48 + i * 0.125, 0.29, -0.04], 'steel', drive);
  for (let j = 0; j < 3; j++) for (const row of [-1, 1]) {
    box('inverter', [0.2, 0.11, 0.12], [-0.35 + j * 0.35, 0.13, row * 0.36], 'dark', drive);
    for (let lead = 0; lead < 3; lead++) box('inverter', [0.019, 0.022, 0.11], [-0.405 + j * 0.35 + lead * 0.055, 0.073, row * 0.445], 'copper', drive);
  }
  box('inverter', [0.86, 0.14, 0.17], [-0.08, 0.14, -0.72], 'dark', drive);
  for (let j = 0; j < 3; j++) {
    const screw = mesh('inverter', new THREE.CylinderGeometry(0.033, 0.033, 0.027, 8), 'steel', drive);
    screw.position.set(-0.35 + j * 0.27, 0.228, -0.72);
  }
  label('DRV', [0.64, 0.18, 0.72], 'inverter', drive, 0.33);
  const capacitors = group('dc_link', driveOffset, driveDelta);
  for (const x of [0.36, 0.7]) {
    const capacitor = mesh('dc_link', new THREE.CylinderGeometry(0.142, 0.142, 0.48, 28), 'dark', capacitors);
    capacitor.position.set(x, 0.3, -0.57);
    const capTop = mesh('dc_link', new THREE.CylinderGeometry(0.126, 0.126, 0.016, 28), 'steel', capacitors);
    capTop.position.set(x, 0.55, -0.57);
    box('dc_link', [0.016, 0.004, 0.17], [x, 0.56, -0.57], 'dark', capacitors);
    box('dc_link', [0.17, 0.004, 0.016], [x, 0.56, -0.57], 'dark', capacitors);
  }
  label('DC', [0.54, 0.75, -0.55], 'dc_link', capacitors, 0.23);
  const currentSense = group('current_sensor', driveOffset, driveDelta);
  box('current_sensor', [0.28, 0.25, 0.23], [-0.69, 0.2, -0.46], 'reading', currentSense);
  const senseOpening = mesh('current_sensor', new THREE.TorusGeometry(0.052, 0.015, 8, 24), 'dark', currentSense);
  senseOpening.position.set(-0.69, 0.2, -0.335);
  box('current_sensor', [0.025, 0.02, 0.42], [-0.69, 0.2, -0.46], 'copper', currentSense);
  const controller = group('controller', driveOffset, driveDelta);
  box('controller', [0.37, 0.065, 0.35], [-0.42, 0.12, 0.46], 'dark', controller);
  for (let i = 0; i < 8; i++) for (const side of [-1, 1]) {
    box('controller', [0.016, 0.022, 0.084], [-0.565 + i * 0.041, 0.085, 0.46 + side * 0.206], 'steel', controller);
    box('controller', [0.084, 0.022, 0.016], [-0.42 + side * 0.217, 0.085, 0.315 + i * 0.041], 'steel', controller);
  }
  box('controller', [0.19, 0.065, 0.08], [0.02, 0.11, 0.56], 'steel', controller);
  for (let i = 0; i < 4; i++) box('controller', [0.075, 0.042, 0.036], [0.14 + i * 0.13, 0.084, 0.38], 'reading', controller);
  label('MCU', [-0.42, 0.33, 0.5], 'controller', controller, 0.3);

  const cableGroup = component('phase_cables');
  const cables = [];
  const phaseStyles = ['actual', 'bounds', 'reading'];
  ['U', 'V', 'W'].forEach((letter, j) => {
    const cable = tube('phase_cables', [[0, 0, 0], [1, 0, 0]], 0.033, phaseStyles[j], cableGroup);
    const tag = label(letter, [0, 0, 0], 'phase_cables', cableGroup, 0.2);
    cables.push({ cable, tag });
  });
  const sensorCable = tube('temp_sensor', [[0, 0, 0], [1, 0, 0]], 0.017, 'dark', component('temp_sensor'));
  function replacePath(object, points, radius) {
    object.geometry.dispose();
    object.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 28, radius, 6, false);
  }
  function updateCables(amount) {
    cables.forEach(({ cable, tag }, j) => {
      const start = [-0.64 + j * 0.23 - amount * 0.1, 1.38 + amount * 0.75, 0.02 - amount * 0.35];
      const end = [2.9 + j * 0.27 + amount * 0.42, -0.55 + amount * 0.03, -0.35 + amount * 0.52];
      const bend = [1.04 + j * 0.15 + amount * 0.16, 1.66 + j * 0.10 + amount * 0.64, 0.35 + j * 0.1];
      replacePath(cable, [start, [0.1, 1.58 + amount * 0.75, 0.06 + j * 0.1], bend, [2.47 + amount * 0.35, 0.9 + j * 0.12 + amount * 0.36, 0.28 + amount * 0.48], end], 0.033);
      tag.position.set(bend[0], bend[1] + 0.15, bend[2]);
    });
    replacePath(sensorCable, [[0.48 + amount * 0.16, 0.89 + amount * 0.69, 0.43 + amount * 0.46], [0.64, 1.08 + amount * 0.72, 0.69 + amount * 0.4], [1.76 + amount * 0.2, 0.45, 1.08 + amount * 0.55], [2.83 + amount * 0.42, -0.64 + amount * 0.03, 0.99 + amount * 0.52]], 0.017);
  }
  updateCables(0);

  // Rings are simulation overlays, not physical motor components.
  const overlays = new THREE.Group(); assembly.add(overlays);
  function overlayMaterial(options) { const result = new THREE.MeshStandardMaterial(options); materials.add(result); return result; }
  const actualMat = overlayMaterial({ color: col('actual'), emissive: col('actual'), emissiveIntensity: 0.3, roughness: 0.5, transparent: true, opacity: 0.72, depthWrite: false });
  const boundMat = overlayMaterial({ color: col('bounds'), emissive: col('bounds'), emissiveIntensity: 0.2, transparent: true, opacity: 0.46, depthWrite: false });
  const actualRing = ring('', 1.25, 0.018, actualMat, 0.64, overlays);
  const lowRing = ring('', 1.25, 0.01, boundMat, 0.47, overlays);
  const highRing = ring('', 1.25, 0.01, boundMat, 0.81, overlays);
  const selectionBox = new THREE.Box3();
  const selectionOutline = new THREE.Box3Helper(selectionBox, col('bounds'));
  selectionOutline.material.transparent = true; selectionOutline.material.opacity = 0.67;
  selectionOutline.material.depthTest = true; selectionOutline.visible = false;
  scene.add(selectionOutline); materials.add(selectionOutline.material);

  let selectedId = null, exploded = 0, heatLevel = 0, isDanger = false;
  let yaw = -0.12, pitch = 0.045, disposed = false, lastTime = null, drag = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function updateMaterials() {
    matCache.forEach(material => {
      const selected = material.userData.componentId === selectedId;
      material.color.copy(material.userData.baseColor);
      material.emissive.copy(selected ? col('bounds') : bg.clone().multiplyScalar(0));
      material.emissiveIntensity = selected ? 0.42 : 0;
      if (selected) material.color.lerp(col('bounds'), 0.22);
      if (material.userData.componentId === 'windings') {
        if (!selected) material.emissive.copy(isDanger ? col('danger') : col('actual'));
        material.emissiveIntensity = (selected ? 0.42 : 0) + Math.min(heatLevel, 1) * 0.24;
      }
    });
  }
  function render() {
    if (disposed) return;
    assembly.rotation.set(pitch, yaw, 0); assembly.updateMatrixWorld(true);
    if (selectedId) {
      selectionBox.setFromObject(selectedId === 'temp_sensor' ? sensor : components.get(selectedId)); selectionBox.expandByScalar(0.055);
      selectionOutline.visible = !selectionBox.isEmpty();
    } else selectionOutline.visible = false;
    renderer.render(scene, camera);
  }
  function resize() {
    if (disposed) return;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight || Math.round(width * 0.58));
    renderer.setSize(width, height, false); camera.aspect = width / height;
    // Keep the complete board, motor, and exploded rear encoder inside even a portrait viewport.
    const distance = Math.max(9.0, 11.5 / camera.aspect) + exploded * 0.8;
    camera.position.set(0.85 + distance * 0.32, 0.08 + distance * 0.34, 0.13 + distance * 0.887);
    camera.lookAt(0.85, 0.08, 0.13); camera.updateProjectionMatrix(); render();
  }
  function selectComponent(id) {
    if (disposed) return false;
    selectedId = components.has(id) ? id : null; updateMaterials(); render();
    return selectedId !== null;
  }
  // Test/recording anchor for a currently visible mesh; picking still uses real pointer events.
  function getComponentScreenPoint(id) {
    assembly.updateMatrixWorld(true);
    for (const object of pickables.filter(object => object.userData.componentId === id)) {
      const point = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()).project(camera);
      if (point.z < -1 || point.z > 1 || Math.abs(point.x) > 1 || Math.abs(point.y) > 1) continue;
      raycaster.setFromCamera(new THREE.Vector2(point.x, point.y), camera);
      if (raycaster.intersectObjects(pickables, false)[0]?.object.userData.componentId === id)
        return {x:(point.x+1)*container.clientWidth/2,y:(1-point.y)*container.clientHeight/2};
    }
    return null;
  }
  function setExploded(value) {
    if (disposed) return;
    exploded = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
    movers.forEach(({ object, base, delta }) => object.position.copy(base).addScaledVector(delta, exploded));
    updateCables(exploded); resize();
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  function hitAt(event) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(pickables, false)[0]?.object.userData.componentId || null;
  }
  function pointerDown(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    drag = { x: event.clientX, y: event.clientY, yaw, pitch, id: event.pointerId, moved: false };
    canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing';
  }
  function pointerMove(event) {
    if (!drag) { canvas.style.cursor = hitAt(event) ? 'pointer' : 'grab'; return; }
    if (event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 6) drag.moved = true;
    if (!drag.moved) return;
    yaw = drag.yaw + dx * 0.008;
    pitch = Math.max(-0.42, Math.min(0.62, drag.pitch + dy * 0.004)); render();
  }
  function pointerEnd(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const isClick = !drag.moved && event.type === 'pointerup';
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    drag = null; canvas.style.cursor = 'grab';
    if (isClick) {
      const id = hitAt(event); selectComponent(id);
      if (typeof options.onSelect === 'function') options.onSelect(id);
    }
  }
  function lostPointerCapture() { drag = null; canvas.style.cursor = 'grab'; }
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('lostpointercapture', lostPointerCapture);
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  canvas.setAttribute('aria-label', 'Interactive cutaway motor and conceptual drive electronics. Click a component to inspect it, drag to rotate, or use the component selector beside this view.');
  return {
    update(state) {
      if (disposed) return;
      const temp = Number.isFinite(state.temperature) ? state.temperature : 25;
      const limit = Number.isFinite(state.limit) ? state.limit : 105;
      heatLevel = THREE.MathUtils.clamp((temp - 25) / Math.max(1, limit - 25), 0, 1.2);
      const lower = Number.isFinite(state.lower) ? state.lower : temp;
      const upper = Number.isFinite(state.upper) ? state.upper : temp;
      const interval = THREE.MathUtils.clamp((upper - lower) / 24, 0, 1);
      isDanger = temp > limit;
      const heatColor = isDanger ? col('danger') : col('actual');
      actualMat.color.copy(heatColor); actualMat.emissive.copy(heatColor);
      actualMat.opacity = 0.35 + Math.min(heatLevel, 1) * 0.5;
      actualMat.emissiveIntensity = 0.2 + Math.min(heatLevel, 1) * 0.5;
      const scale = 0.9 + Math.min(heatLevel, 1) * 0.18;
      actualRing.scale.setScalar(scale);
      lowRing.scale.setScalar(Math.max(0.88, scale - interval * 0.07));
      highRing.scale.setScalar(scale + interval * 0.1);
      const time = Number.isFinite(state.time) ? state.time : 0;
      const effort = Number.isFinite(state.effort) ? Math.max(0, state.effort) : 0;
      if (lastTime !== null && time >= lastTime && state.running && effort > 0 && !reducedMotion.matches) {
        const motion = Math.min(time - lastTime, 4) * effort * 0.55;
        spinningRotor.rotation.x += motion; spinningShaft.rotation.x += motion; spinningFan.rotation.x += motion;
      }
      if (lastTime !== null && time < lastTime) {
        spinningRotor.rotation.x = 0; spinningShaft.rotation.x = 0; spinningFan.rotation.x = 0;
      }
      lastTime = time; updateMaterials();
      const reading = Number.isFinite(state.reading) ? state.reading.toFixed(1) : 'unavailable';
      canvas.setAttribute('aria-label', 'Motor and conceptual drive schematic. Actual temperature ' + temp.toFixed(1) + ' degrees Celsius; estimated range ' + lower.toFixed(1) + ' to ' + upper.toFixed(1) + '; reported reading ' + reading + '; thermal limit ' + limit.toFixed(1) + '. ' + (isDanger ? 'Limit exceeded. ' : 'Below limit. ') + 'Click to inspect components, drag to rotate, or use the component selector.');
      render();
    },
    selectComponent,
    getComponentScreenPoint,
    setExploded,
    resize,
    dispose() {
      if (disposed) return;
      disposed = true; observer.disconnect();
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerEnd);
      canvas.removeEventListener('pointercancel', pointerEnd);
      canvas.removeEventListener('lostpointercapture', lostPointerCapture);
      const geometries = new Set(); scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); });
      geometries.forEach(geometry => geometry.dispose()); textures.forEach(texture => texture.dispose());
      materials.forEach(material => material.dispose()); renderer.dispose(); canvas.remove();
    }
  };
};
