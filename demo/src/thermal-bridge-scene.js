/* Guarded Thermal Bridge: an explanatory hardware assembly, not a fabrication drawing.
 * Geometry and actuator motion are illustrative. Temperatures are supplied by the
 * stored one-state experiment; this renderer does not run a motor or thermal model.
 * THREE is the locally vendored 0.160.1 distribution. No network assets are used.
 */
(function () {
  'use strict';
  window.createThermalBridgeScene = function (container, options) {
    options = options || {};
    var THREE = window.THREE;
    if (!THREE) throw new Error('Local 3D renderer unavailable');
    var reduced = !!options.reducedMotion, disposed = false, dirty = true, previousFlow = false, inViewport = true;
    var selected = 'pad', exploded = false, cutaway = true, autoRotate = false;
    var scene = new THREE.Scene(), assembly = new THREE.Group(); scene.add(assembly);
    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x071119, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.23;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
    var canvas = renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab;outline:none';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interactive three-dimensional motor and guarded thermal bridge. Use the component buttons for keyboard inspection.');
    container.appendChild(canvas);
    var camera = new THREE.PerspectiveCamera(35, 1, 0.08, 80);
    var target = new THREE.Vector3(0.15, 0.35, 0.1), targetGoal = target.clone();
    var yaw = 0.56, pitch = 0.47, distance = 10.8, distanceGoal = distance;
    var yawGoal = yaw, pitchGoal = pitch;
    scene.add(new THREE.HemisphereLight(0xc8eaff, 0x182128, 2.25));
    var key = new THREE.DirectionalLight(0xffeddb, 4.1); key.position.set(-3, 8, 5);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 22 });
    key.shadow.bias = -0.001; scene.add(key);
    var rim = new THREE.DirectionalLight(0x60c9ff, 2.4); rim.position.set(4, 5, -5); scene.add(rim);
    var fill = new THREE.DirectionalLight(0xffbc7d, 0.75); fill.position.set(-5, 1, 2); scene.add(fill);
    var components = new Map(), materials = new Set(), geometries = new Set(), textures = new Set();
    var pickables = [], movers = [], heatMaterials = [], cache = new Map();
    var componentIds = ['winding', 'bond', 'pad', 'shunt', 'guard', 'case', 'reference', 'adc', 'estimator', 'rotor', 'shaft', 'stator', 'guard_driver', 'guard_sensor', 'leads', 'connector', 'power', 'bypass'];
    var styles = {
      navy: { color: 0x243849, metalness: 0.66, roughness: 0.33 },
      dark: { color: 0x14232d, metalness: 0.40, roughness: 0.4 },
      steel: { color: 0xaebdc6, metalness: 0.85, roughness: 0.29 },
      copper: { color: 0xe79b56, metalness: 0.72, roughness: 0.29 },
      gold: { color: 0xeac071, metalness: 0.68, roughness: 0.29 },
      board: { color: 0x104b49, metalness: 0.15, roughness: 0.6 },
      ceramic: { color: 0xd9e5e3, metalness: 0.10, roughness: 0.56 },
      blue: { color: 0x57b4e3, metalness: 0.35, roughness: 0.38 },
      violet: { color: 0xa88ee9, metalness: 0.35, roughness: 0.35 },
      black: { color: 0x101a22, metalness: 0.14, roughness: 0.45 },
      red: { color: 0xfb7967, metalness: 0.2, roughness: 0.4 }
    };
    function component(id, base, delta) {
      var g = new THREE.Group(); g.name = id; g.userData.componentId = id;
      g.position.fromArray(base || [0, 0, 0]); assembly.add(g); components.set(id, g);
      movers.push({ object: g, base: g.position.clone(), delta: new THREE.Vector3().fromArray(delta || [0, 0, 0]) });
      return g;
    }
    function material(id, kind, extra) {
      var k = id + ':' + kind + ':' + JSON.stringify(extra || {});
      if (cache.has(k)) return cache.get(k);
      var m = new THREE.MeshStandardMaterial(Object.assign({}, styles[kind] || styles.steel, extra || {}));
      m.userData.baseColor = m.color.clone(); m.userData.id = id; m.userData.kind = kind;
      materials.add(m); cache.set(k, m); return m;
    }
    function mesh(id, geometry, kind, parent, extra) {
      var m = new THREE.Mesh(geometry, material(id, kind, extra)); geometries.add(geometry);
      m.castShadow = true; m.receiveShadow = true; m.userData.componentId = id;
      (parent || components.get(id) || assembly).add(m); if (id) pickables.push(m); return m;
    }
    function box(id, size, pos, kind, parent, extra) {
      var m = mesh(id, new THREE.BoxGeometry(size[0], size[1], size[2]), kind, parent, extra);
      m.position.fromArray(pos); return m;
    }
    function cyl(id, radius, length, pos, kind, parent, axis, open, start, arc) {
      var m = mesh(id, new THREE.CylinderGeometry(radius, radius, length, 40, 1, !!open, start || 0, arc === undefined ? Math.PI * 2 : arc), kind, parent, open ? { side: THREE.DoubleSide } : undefined);
      m.position.fromArray(pos); if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2; return m;
    }
    function ring(id, radius, tubeRadius, pos, kind, parent, arc) {
      var m = mesh(id, new THREE.TorusGeometry(radius, tubeRadius, 8, 64, arc || Math.PI * 2), kind, parent);
      m.rotation.y = Math.PI / 2; m.position.fromArray(pos); return m;
    }
    function wire(id, points, radius, kind, parent, extra) {
      var curve = new THREE.CatmullRomCurve3(points.map(function (p) { return new THREE.Vector3().fromArray(p); }));
      return mesh(id, new THREE.TubeGeometry(curve, 28, radius, 6, false), kind, parent, extra);
    }
    function screw(id, pos, parent, radius) {
      radius = radius || 0.05; var s = cyl(id, radius, 0.025, pos, 'steel', parent);
      box(id, [radius * 1.3, 0.006, 0.011], [pos[0], pos[1] + 0.015, pos[2]], 'dark', parent); return s;
    }
    function plateText(text, id, pos, width, parent, ink, background) {
      var bitmap = document.createElement('canvas'); bitmap.width = 512; bitmap.height = 128;
      var ctx = bitmap.getContext('2d'); ctx.fillStyle = background || '#152a33'; ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = ink || '#dbeae8'; ctx.font = '600 54px ui-monospace, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 66, 480);
      var tx = new THREE.CanvasTexture(bitmap); tx.colorSpace = THREE.SRGBColorSpace; textures.add(tx);
      var mat = new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide, toneMapped: false }); materials.add(mat);
      var geo = new THREE.PlaneGeometry(width, width / 4); geometries.add(geo);
      var p = new THREE.Mesh(geo, mat); p.rotation.x = -Math.PI / 2; p.position.fromArray(pos);
      p.userData.componentId = id; (parent || components.get(id)).add(p); pickables.push(p); return p;
    }
    function chip(id, parent, sx, sz, text) {
      box(id, [sx, 0.10, sz], [0, 0.13, 0], 'black', parent);
      for (var i = 0; i < 7; i++) for (var side = -1; side <= 1; side += 2) {
        box(id, [0.035, 0.035, 0.13], [-sx * 0.38 + i * sx * 0.126, 0.07, side * (sz / 2 + 0.04)], 'steel', parent);
      }
      plateText(text, id, [0, 0.185, 0], sx * 0.84, parent);
      cyl(id, 0.024, 0.004, [-sx * 0.34, 0.186, -sz * 0.27], 'gold', parent);
    }

    // A sectional motor provides context for the winding contact. It is not driven.
    var motor = [-1.9, -0.02, -0.18];
    var casing = component('case', motor, [-0.45, 0.03, -0.45]);
    var cutStart = 1.70, cutArc = 4.60;
    cyl('case', 1.05, 2.6, [0, 0, 0], 'navy', casing, 'x', true, cutStart, cutArc);
    for (var i = 0; i < 15; i++) cyl('case', 1.13, 0.04, [-1.23 + i * 0.176, 0, 0], 'navy', casing, 'x', true, cutStart, cutArc);
    var cover = new THREE.Group(); casing.add(cover);
    cyl('case', 1.05, 2.6, [0, 0, 0], 'navy', cover, 'x', true, cutStart + cutArc, Math.PI * 2 - cutArc);
    for (var i = 0; i < 15; i++) cyl('case', 1.13, 0.04, [-1.23 + i * 0.176, 0, 0], 'navy', cover, 'x', true, cutStart + cutArc, Math.PI * 2 - cutArc);
    for (var side = -1; side <= 1; side += 2) {
      var end = mesh('case', new THREE.RingGeometry(0.36, 1.075, 48), 'navy', casing, { side: THREE.DoubleSide });
      end.rotation.y = Math.PI / 2; end.position.x = side * 1.34;
      ring('case', 1.035, 0.045, [side * 1.355, 0, 0], 'steel', casing);
      ring('case', 0.29, 0.06, [side * 1.39, 0, 0], 'steel', casing);
      for (var j = 0; j < 8; j++) {
        var angle = j * Math.PI / 4;
        cyl('case', 0.043, 0.055, [side * 1.38, Math.cos(angle) * 0.92, Math.sin(angle) * 0.92], 'steel', casing, 'x');
      }
      box('case', [0.58, 0.26, 1.35], [side * 0.85, -1.09, 0], 'navy', casing);
      box('case', [0.79, 0.08, 1.58], [side * 0.85, -1.25, 0], 'dark', casing);
      for (var z of [-0.64, 0.64]) screw('case', [side * 0.85, -1.20, z], casing, 0.067);
    }
    var stator = component('stator', motor, [-0.42, 0.05, -0.2]);
    cyl('stator', 0.958, 2.3, [0, 0, 0], 'steel', stator, 'x', true, cutStart, cutArc);
    for (var i = 0; i < 18; i++) cyl('stator', 0.963, 0.012, [-1.08 + i * 0.127, 0, 0], 'dark', stator, 'x', true, cutStart, cutArc);
    for (var j = 0; j < 12; j++) {
      var a = j * Math.PI / 6;
      var tooth = box('stator', [2.18, 0.17, 0.13], [0, Math.cos(a) * 0.82, Math.sin(a) * 0.82], 'steel', stator); tooth.rotation.x = a;
    }
    var winding = component('winding', motor, [0.05, 0.22, 0.24]);
    for (var j = 0; j < 12; j++) {
      var a = j * Math.PI / 6 + 0.20;
      for (var k = 0; k < 4; k++) {
        var r = 0.737 + k * 0.027;
        wire('winding', [[-1.06, Math.cos(a) * r, Math.sin(a) * r], [0, Math.cos(a) * r, Math.sin(a) * r], [1.1, Math.cos(a) * r, Math.sin(a) * r]], 0.028, 'copper', winding);
      }
    }
    for (var side of [-1, 1]) for (var k = 0; k < 5; k++) ring('winding', 0.745 + k * 0.025, 0.026, [side * (1.01 + k * 0.045), 0, 0], 'copper', winding);
    var rotor = component('rotor', motor, [0.35, 0, 0.27]);
    cyl('rotor', 0.48, 2.31, [0, 0, 0], 'dark', rotor, 'x');
    for (var j = 0; j < 14; j++) {
      var a = j * Math.PI * 2 / 14;
      var bar = box('rotor', [2.21, 0.021, 0.042], [0, Math.cos(a) * 0.48, Math.sin(a) * 0.48], j % 2 ? 'steel' : 'gold', rotor); bar.rotation.x = a;
    }
    ring('rotor', 0.46, 0.025, [-1.15, 0, 0], 'steel', rotor); ring('rotor', 0.46, 0.025, [1.15, 0, 0], 'steel', rotor);
    var shaft = component('shaft', motor, [0.78, -0.13, 0.25]);
    cyl('shaft', 0.15, 4.0, [0.14, 0, 0], 'steel', shaft, 'x');
    cyl('shaft', 0.195, 0.2, [1.48, 0, 0], 'steel', shaft, 'x');
    box('shaft', [0.41, 0.04, 0.07], [1.9, 0.149, 0], 'dark', shaft);

    // Magnified contact stack: the pale ceramic is electrical insulation, not a
    // second thermometer. Guard and shunt are distinct independently excited paths.
    var sensor = [-0.83, 1.12, 0.68];
    var bond = component('bond', sensor, [0.10, 0.22, 0.15]);
    box('bond', [0.61, 0.10, 0.57], [0, 0, 0], 'ceramic', bond);
    box('bond', [0.56, 0.035, 0.51], [0, -0.067, 0], 'gold', bond);
    box('bond', [0.32, 0.16, 0.22], [-0.09, -0.16, -0.05], 'ceramic', bond);
    wire('bond', [[-0.09, -0.24, -0.05], [-0.15, -0.37, -0.14], [-0.23, -0.50, -0.25]], 0.043, 'copper', bond);
    for (var x of [-0.25, 0.25]) for (var z of [-0.23, 0.23]) cyl('bond', 0.018, 0.008, [x, 0.055, z], 'dark', bond);
    var pad = component('pad', [sensor[0], sensor[1] + 0.12, sensor[2]], [0.10, 0.73, 0.20]);
    box('pad', [0.46, 0.09, 0.42], [0, 0, 0], 'copper', pad);
    box('pad', [0.32, 0.016, 0.27], [0, 0.052, 0], 'ceramic', pad);
    var meander = [];
    for (var i = 0; i < 7; i++) { var x = -0.123 + i * 0.041; meander.push([x, 0.063, i % 2 ? 0.089 : -0.089]); meander.push([x, 0.063, i % 2 ? -0.089 : 0.089]); }
    wire('pad', meander, 0.005, 'dark', pad);
    for (var x of [-0.15, 0.15]) box('pad', [0.06, 0.012, 0.055], [x, 0.061, 0.155], 'gold', pad);
    var guard = component('guard', [sensor[0], sensor[1] + 0.125, sensor[2]], [0.12, 1.13, 0.18]);
    box('guard', [0.15, 0.14, 0.86], [-0.37, 0, 0], 'violet', guard);
    // The bridge passes through an insulating clearance, avoiding a drawn
    // conductive short between the independently controlled guard and shunt.
    box('guard', [0.15, 0.14, 0.23], [0.37, 0, -0.315], 'violet', guard);
    box('guard', [0.15, 0.14, 0.275], [0.37, 0, 0.2925], 'violet', guard);
    box('guard', [0.17, 0.035, 0.35], [0.37, -0.115, -0.03], 'ceramic', guard);
    for (var z of [-0.36, 0.36]) box('guard', [0.61, 0.14, 0.14], [0, 0, z], 'violet', guard);
    for (var x of [-0.35, 0.35]) for (var z of [-0.34, 0.34]) screw('guard', [x, 0.08, z], guard, 0.025);
    box('guard', [0.63, 0.065, 0.16], [0, -0.13, -0.38], 'ceramic', guard);
    for (var i = 0; i < 8; i++) box('guard', [0.034, 0.069, 0.12], [-0.265 + i * 0.076, -0.20, -0.38], i % 2 ? 'blue' : 'copper', guard);
    box('guard', [0.63, 0.04, 0.18], [0, -0.255, -0.38], 'steel', guard);
    var shunt = component('shunt', [sensor[0] + 0.52, sensor[1] + 0.04, sensor[2] - 0.08], [0.56, 0.48, -0.1]);
    box('shunt', [0.64, 0.07, 0.22], [0.12, 0, 0], 'copper', shunt);
    box('shunt', [0.19, 0.19, 0.29], [0.4, -0.085, 0], 'steel', shunt);
    var shuntArm = box('shunt', [0.37, 0.037, 0.19], [-0.17, 0.115, 0], 'gold', shunt);
    for (var i = 0; i < 3; i++) {
      box('shunt', [0.066, 0.08, 0.16], [-0.22 + i * 0.096, 0.043, 0], 'steel', shunt);
      box('shunt', [0.05, 0.015, 0.14], [-0.22 + i * 0.096, 0.09, 0], 'gold', shunt);
    }
    plateText('Gi', 'shunt', [0.14, 0.04, 0], 0.23, shunt, '#1f2426', '#dfac64');
    // Case cold-reference block is explicitly connected to the casing by a strap.
    box('case', [0.59, 0.28, 0.46], [1.86, 0.95, 0.72], 'steel', casing);
    for (var i = 0; i < 7; i++) box('case', [0.032, 0.23, 0.45], [1.62 + i * 0.08, 1.19, 0.72], 'steel', casing);
    wire('case', [[1.87, 0.81, 0.73], [1.61, 0.61, 0.56], [1.21, 0.35, 0.49]], 0.06, 'steel', casing);
    var reference = component('reference', [0.04, 1.35, 0.82], [0.57, 0.55, -0.14]);
    box('reference', [0.20, 0.055, 0.15], [0, 0, 0], 'blue', reference);
    plateText('Tc', 'reference', [0, 0.031, 0], 0.18, reference, '#e9f6fc', '#20566c');
    var guardSensor = component('guard_sensor', [sensor[0] - 0.36, sensor[1] + 0.25, sensor[2] + 0.07], [-0.28, 1.16, 0.37]);
    box('guard_sensor', [0.13, 0.058, 0.20], [0, 0, 0], 'blue', guardSensor);
    plateText('Tg', 'guard_sensor', [0, 0.033, 0], 0.16, guardSensor, '#e9f6fc', '#20566c');
    for (var x of [-0.045, 0.045]) wire('guard_sensor', [[x, -0.005, 0.11], [x, -0.04, 0.17], [x + 0.12, -0.11, 0.21]], 0.009, 'gold', guardSensor);

    // PCB: visual functional blocks, with no claim to an electrically verified netlist.
    var boardCenter = [2.25, -0.77, 0.35];
    var board = new THREE.Group(); board.position.fromArray(boardCenter); assembly.add(board);
    box(null, [2.72, 0.10, 2.12], [0, 0, 0], 'board', board);
    box(null, [2.87, 0.08, 2.27], [0, -0.20, 0], 'dark', board);
    for (var x of [-1.23, 1.23]) for (var z of [-0.93, 0.93]) {
      cyl(null, 0.048, 0.18, [x, -0.11, z], 'gold', board); screw(null, [x, 0.064, z], board, 0.057);
    }
    for (var row = 0; row < 11; row++) {
      var z = -0.8 + row * 0.15, sx = row % 2 ? -1.03 : -0.78;
      wire(null, [[sx, 0.056, z], [sx + 0.3, 0.056, z], [sx + 0.44, 0.056, z + 0.1], [0.78, 0.056, z + 0.1]], 0.009, 'gold', board);
    }
    for (var i = 0; i < 20; i++) {
      var x = -1.1 + (i % 10) * 0.225, z = i < 10 ? 0.73 : -0.84;
      box(null, [0.10, 0.032, 0.06], [x, 0.073, z], i % 3 ? 'dark' : 'ceramic', board);
      for (var side of [-1, 1]) box(null, [0.025, 0.035, 0.067], [x + side * 0.05, 0.073, z], 'steel', board);
    }
    function pcbComponent(id, dx, dz, dy, delta) {
      return component(id, [boardCenter[0] + dx, boardCenter[1] + (dy || 0), boardCenter[2] + dz], delta || [0.4, 0.27, 0.2]);
    }
    var adc = pcbComponent('adc', -0.72, 0.22, 0, [0.14, 0.51, 0.4]); chip('adc', adc, 0.48, 0.36, 'ADC');
    var estimator = pcbComponent('estimator', -0.03, -0.26, 0, [0.35, 0.64, -0.03]); chip('estimator', estimator, 0.71, 0.62, 'MCU');
    var guardDriver = pcbComponent('guard_driver', 0.63, 0.27, 0, [0.56, 0.48, 0.41]); chip('guard_driver', guardDriver, 0.5, 0.4, 'GUARD');
    for (var i = 0; i < 5; i++) box('guard_driver', [0.031, 0.19, 0.22], [-0.18 + i * 0.09, 0.26, -0.015], 'steel', guardDriver);
    var power = pcbComponent('power', 0.85, -0.53, 0, [0.71, 0.34, -0.3]);
    for (var x of [-0.14, 0.14]) {
      cyl('power', 0.115, 0.35, [x, 0.23, 0], 'navy', power);
      cyl('power', 0.106, 0.012, [x, 0.412, 0], 'steel', power);
      box('power', [0.15, 0.003, 0.015], [x, 0.42, 0], 'dark', power);
      box('power', [0.015, 0.003, 0.15], [x, 0.42, 0], 'dark', power);
    }
    box('power', [0.35, 0.20, 0.28], [0, 0.15, -0.33], 'black', power);
    plateText('PWR', 'power', [0, 0.06, 0.20], 0.32, power);
    var connector = pcbComponent('connector', -0.65, 0.93, 0.03, [0.19, 0.16, 0.69]);
    box('connector', [1.05, 0.21, 0.20], [0, 0.14, 0], 'navy', connector);
    for (var i = 0; i < 8; i++) {
      box('connector', [0.075, 0.09, 0.032], [-0.435 + i * 0.124, 0.18, 0.115], 'dark', connector);
      box('connector', [0.027, 0.03, 0.14], [-0.435 + i * 0.124, 0.082, -0.12], 'gold', connector);
    }
    plateText('SENSOR / GUARD', 'connector', [0, 0.253, 0], 0.88, connector);
    var leads = component('leads', [0, 0, 0], [0.02, 0.1, 0.38]);
    for (var i = 0; i < 4; i++) {
      var offset = i * 0.062;
      wire('leads', [[-0.95 + offset, 1.30, 0.89], [-0.93 + offset, 1.28, 1.10], [-0.71 + offset, 1.05, 1.30], [-0.17 + offset, 0.26, 1.55], [0.81 + offset, -0.13, 1.63], [1.34 + offset, -0.55, 1.35]], 0.015, i % 2 ? 'gold' : 'blue', leads);
    }
    // Paired actuator leads are thicker than RTD sensing leads.
    for (var i = 0; i < 2; i++) wire('leads', [[-1.17 + i * 0.1, 1.12, 0.30], [-0.71 + i * 0.1, 0.8, 0.1], [0.2 + i * 0.1, 0.03, 0.05], [1.0 + i * 0.1, -0.32, 0.60], [1.82 + i * 0.1, -0.55, 1.34]], 0.023, i ? 'violet' : 'dark', leads);
    var bypass = component('bypass', [0, 0, 0], [0, 0.25, 0.28]);
    wire('bypass', [[-0.67, 1.24, 0.86], [-0.34, 1.11, 1.10], [-0.22, 0.51, 1.00], [-0.79, 0.22, 0.70]], 0.036, 'red', bypass, { transparent: true, opacity: 0.92 });
    bypass.visible = false;

    // Stable annotation anchors sit on recognizable parts, in that component's
    // local coordinates. They follow exploded offsets without searching meshes or
    // raycasting every rendered frame. In particular the driver points to its PCB
    // heat sink, rather than the center of a larger assembly bounding box.
    var annotationAnchors = new Map();
    function annotationAnchor(id, point, object) {
      annotationAnchors.set(id, { object: object || components.get(id), point: new THREE.Vector3().fromArray(point) });
    }
    var windingAngle = Math.PI / 6 + 0.20;
    annotationAnchor('winding', [0, Math.cos(windingAngle) * 0.791, Math.sin(windingAngle) * 0.791]);
    annotationAnchor('bond', [0, 0.05, 0.20]);
    annotationAnchor('pad', [0, 0.063, 0]);
    annotationAnchor('guard', [0, 0.07, 0.36]);
    annotationAnchor('shunt', [0, 0.0185, 0], shuntArm);
    annotationAnchor('case', [-0.9, Math.sin(5.8) * 1.05, Math.cos(5.8) * 1.05]);
    annotationAnchor('reference', [0, 0.031, 0]);
    annotationAnchor('adc', [0, 0.185, 0]);
    annotationAnchor('estimator', [0, 0.185, 0]);
    annotationAnchor('rotor', [0, Math.cos(0.90) * 0.48, Math.sin(0.90) * 0.48]);
    annotationAnchor('shaft', [1.9, 0.169, 0]);
    annotationAnchor('stator', [0.7, Math.sin(5.8) * 0.958, Math.cos(5.8) * 0.958]);
    annotationAnchor('guard_driver', [-0.18, 0.355, 0]);
    annotationAnchor('guard_sensor', [0, 0.033, 0]);
    annotationAnchor('leads', [-0.108, 0.26, 1.55]);
    annotationAnchor('connector', [0, 0.253, 0]);
    annotationAnchor('power', [0.14, 0.418, 0]);
    annotationAnchor('bypass', [-0.34, 1.11, 1.10]);

    var floor = mesh(null, new THREE.PlaneGeometry(200, 200), 'dark', scene, { color: 0x0b1720, roughness: 0.97, metalness: 0.03 });
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.38; floor.castShadow = false;
    var grid = new THREE.GridHelper(16, 40, 0x274451, 0x1b2b36); grid.position.y = -1.373;
    grid.material.transparent = true; grid.material.opacity = 0.30; scene.add(grid); geometries.add(grid.geometry); materials.add(grid.material);
    var outline = new THREE.BoxHelper(undefined, 0xefd08a); outline.visible = false;
    outline.material.transparent = true; outline.material.opacity = 0.65; outline.material.depthTest = false;
    outline.renderOrder = 9; assembly.add(outline); materials.add(outline.material); geometries.add(outline.geometry);
    var heatDots = [], heatPaths = [
      new THREE.CatmullRomCurve3([new THREE.Vector3(-1.0, 0.80, 0.52), new THREE.Vector3(-0.87, 1.12, 0.65), new THREE.Vector3(-0.83, 1.34, 0.68)]),
      new THREE.CatmullRomCurve3([new THREE.Vector3(-0.68, 1.32, 0.64), new THREE.Vector3(-0.35, 1.32, 0.58), new THREE.Vector3(-0.03, 1.08, 0.58)])
    ];
    for (var p = 0; p < 2; p++) for (var i = 0; i < 3; i++) {
      var dot = mesh(null, new THREE.SphereGeometry(0.035, 8, 6), p ? 'blue' : 'gold', assembly, { emissive: p ? 0x2787aa : 0xffad5c, emissiveIntensity: 1.2 });
      dot.castShadow = false; heatDots.push({ mesh: dot, path: heatPaths[p], offset: i / 3 }); dot.visible = false;
    }
    var sample = null, caseId = '', lastDataTime = null, lastAdvanceAt = -10000;
    var pointerPositions = new Map(), pointerDown = null, dragDistance = 0, pinchDistance = null;
    var raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), size = { width: 0, height: 0 };
    function isVisible(obj) { for (var p = obj; p; p = p.parent) if (!p.visible) return false; return true; }
    function hitAt(clientX, clientY) {
      var r = canvas.getBoundingClientRect(); pointer.set((clientX - r.left) / r.width * 2 - 1, -(clientY - r.top) / r.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObjects(pickables, false);
      for (var h of hits) if (isVisible(h.object)) return h.object.userData.componentId;
      return null;
    }
    function highlight() {
      dirty = true;
      materials.forEach(function (m) {
        if (!m.emissive) return;
        if (m.userData.id === selected) { m.emissive.setHex(0xffc668); m.emissiveIntensity = 0.20; }
        else { m.emissive.setHex(0); m.emissiveIntensity = 0; }
      });
      bypass.visible = caseId === 'unguarded_leak' || selected === 'bypass';
      if (selected === 'bypass' && caseId !== 'unguarded_leak') {
        bypass.traverse(function (obj) { if (obj.material && obj.material.opacity !== undefined) obj.material.opacity = 0.24; });
      } else bypass.traverse(function (obj) { if (obj.material && obj.material.opacity !== undefined) obj.material.opacity = 0.92; });
    }
    function select(id) {
      if (!components.has(id)) return false; selected = id; highlight(); return true;
    }
    function pointerStart(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointerPositions.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
      if (pointerPositions.size === 1) { pointerDown = { x: e.clientX, y: e.clientY, id: e.pointerId }; dragDistance = 0; }
      if (pointerPositions.size === 2) { var pts = Array.from(pointerPositions.values()); pinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); dragDistance = 99; }
      autoRotate = false;
    }
    function pointerMove(e) {
      if (!pointerPositions.has(e.pointerId)) {
        canvas.style.cursor = hitAt(e.clientX, e.clientY) ? 'pointer' : 'grab'; return;
      }
      var old = pointerPositions.get(e.pointerId); pointerPositions.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointerPositions.size >= 2) {
        var pts = Array.from(pointerPositions.values()); var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinchDistance && d > 0) distanceGoal = Math.max(3.1, Math.min(20, distanceGoal * pinchDistance / d)); pinchDistance = d; return;
      }
      var dx = e.clientX - old.x, dy = e.clientY - old.y; dragDistance += Math.hypot(dx, dy);
      yawGoal -= dx * 0.007; pitchGoal = Math.max(0.08, Math.min(1.35, pitchGoal + dy * 0.005));
    }
    function pointerEnd(e) {
      if (!pointerPositions.has(e.pointerId)) return;
      var clicking = e.type === 'pointerup' && pointerPositions.size === 1 && pointerDown && pointerDown.id === e.pointerId && dragDistance < 6;
      pointerPositions.delete(e.pointerId); if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      if (pointerPositions.size < 2) pinchDistance = null;
      if (!pointerPositions.size) { canvas.style.cursor = 'grab'; pointerDown = null; }
      if (clicking) { var id = hitAt(e.clientX, e.clientY); if (id) { select(id); if (options.onSelect) options.onSelect(id); } }
    }
    function wheel(e) { e.preventDefault(); distanceGoal = Math.max(3.1, Math.min(20, distanceGoal * Math.exp(e.deltaY * 0.001))); }
    canvas.addEventListener('pointerdown', pointerStart); canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerEnd); canvas.addEventListener('pointercancel', pointerEnd); canvas.addEventListener('wheel', wheel, { passive: false });
    function resize() {
      if (disposed) return; var r = container.getBoundingClientRect();
      var w = Math.max(1, r.width), h = Math.max(1, r.height);
      if (size.width === w && size.height === h) return;
      size.width = w; size.height = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      dirty = true;
    }
    var observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (observer) observer.observe(container); else window.addEventListener('resize', resize);
    var visibilityObserver = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(function (entries) {
      inViewport = entries.some(function (entry) { return entry.isIntersecting; }); if (inViewport) dirty = true;
    }, { threshold: 0 }) : null;
    if (visibilityObserver) visibilityObserver.observe(container);
    function visibilityChanged() { if (!document.hidden) dirty = true; }
    document.addEventListener('visibilitychange', visibilityChanged);
    function setView(name) {
      if (name === 'sensor') { targetGoal.set(-0.55, exploded ? 1.83 : 1.08, 0.61); distanceGoal = 5.1; yawGoal = 0.43; pitchGoal = 0.60; }
      else if (name === 'electronics') { targetGoal.set(2.18, -0.38, 0.42); distanceGoal = 5.7; yawGoal = 0.15; pitchGoal = 0.82; }
      else { targetGoal.set(0.15, 0.35, 0.1); distanceGoal = exploded ? 12.4 : 10.8; yawGoal = 0.56; pitchGoal = 0.47; }
      autoRotate = false;
    }
    function update(next, parameters, nextCaseId) {
      sample = next || sample; caseId = nextCaseId || caseId;
      if (!sample) return;
      if (lastDataTime !== null && sample.time_s !== lastDataTime) lastAdvanceAt = performance.now();
      lastDataTime = sample.time_s;
      var temperatures = { winding: sample.hot_c, pad: sample.pad_c, guard: sample.guard_c, case: sample.case_c };
      materials.forEach(function (m) {
        var t = temperatures[m.userData.id];
        if (!Number.isFinite(t) || !m.userData.baseColor) return;
        var amount = Math.max(0, Math.min(1, (t - 40) / 120));
        m.color.copy(m.userData.baseColor).lerp(new THREE.Color(0xff6b36), amount * (m.userData.id === 'case' ? 0.28 : 0.60));
      });
      var armHeight = Number(sample.shunt_w_per_k) < 0.005 ? 0.22 : 0.115;
      if (shuntArm.position.y !== armHeight) renderer.shadowMap.needsUpdate = true;
      shuntArm.position.y = armHeight;
      highlight();
    }
    function render(now) {
      if (disposed) return;
      if (document.hidden || !inViewport || now - previousFrame < 32) { raf = requestAnimationFrame(render); return; }
      var dt = Math.min(0.05, (now - previousFrame) / 1000 || 0.016); previousFrame = now;
      var ease = reduced ? 1 : 1 - Math.exp(-dt * 10);
      if (autoRotate && !reduced && !pointerPositions.size) yawGoal += dt * 0.12;
      var moving = Math.abs(yawGoal - yaw) + Math.abs(pitchGoal - pitch) + Math.abs(distanceGoal - distance) + target.distanceTo(targetGoal) > 0.00005;
      yaw += (yawGoal - yaw) * ease; pitch += (pitchGoal - pitch) * ease; distance += (distanceGoal - distance) * ease;
      target.lerp(targetGoal, ease);
      var responsiveScale = camera.aspect < 0.95 ? Math.min(1.75, 0.96 / camera.aspect) : 1;
      camera.position.set(target.x + distance * responsiveScale * Math.sin(yaw) * Math.cos(pitch), target.y + distance * responsiveScale * Math.sin(pitch), target.z + distance * responsiveScale * Math.cos(yaw) * Math.cos(pitch));
      camera.lookAt(target);
      movers.forEach(function (m) { var goal = m.base.clone().addScaledVector(m.delta, exploded ? 1 : 0); if (m.object.position.distanceToSquared(goal) > 0.00000001) { moving = true; renderer.shadowMap.needsUpdate = true; } m.object.position.lerp(goal, ease); });
      cover.visible = !cutaway;
      var flowing = !reduced && !exploded && now - lastAdvanceAt < 300;
      heatDots.forEach(function (d) { d.mesh.visible = flowing; if (flowing) d.mesh.position.copy(d.path.getPoint((now * 0.00025 + d.offset) % 1)); });
      if (dirty || moving || flowing || previousFlow !== flowing) {
        var chosen = components.get(selected); outline.visible = !!chosen && chosen.visible;
        if (outline.visible) outline.setFromObject(chosen);
        renderer.render(scene, camera); dirty = false;
        // Annotation DOM can update here and remain entirely idle between draws.
        if (typeof options.onRender === 'function') options.onRender();
      }
      previousFlow = flowing; raf = requestAnimationFrame(render);
    }
    function getAnnotationPoints(ids) {
      var points = {}, requested = ids || componentIds;
      if (disposed) return points;
      camera.updateMatrixWorld(true);
      requested.forEach(function (id) {
        var anchor = annotationAnchors.get(id);
        if (!anchor) { points[id] = { x: 0, y: 0, visible: false }; return; }
        anchor.object.updateWorldMatrix(true, false);
        var ndc = anchor.point.clone().applyMatrix4(anchor.object.matrixWorld).project(camera);
        var finite = Number.isFinite(ndc.x) && Number.isFinite(ndc.y) && Number.isFinite(ndc.z);
        points[id] = {
          x: finite ? (ndc.x + 1) * size.width / 2 : 0,
          y: finite ? (1 - ndc.y) * size.height / 2 : 0,
          // Visibility means enabled and in the camera frustum. Callouts may
          // explain partly occluded components; this is not an occlusion test.
          visible: finite && isVisible(anchor.object) && ndc.z >= -1 && ndc.z <= 1 && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1
        };
      });
      return points;
    }
    function getComponentScreenPoint(id) {
      var g = components.get(id); if (!g || !isVisible(g)) return null;
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      var box3 = new THREE.Box3().setFromObject(g), candidate = box3.getCenter(new THREE.Vector3()), points = [candidate];
      g.traverse(function (obj) {
        if (!obj.isMesh || !isVisible(obj)) return;
        if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
        points.push(obj.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(obj.matrixWorld));
        var vertices = obj.geometry.getAttribute('position');
        if (vertices) {
          var stride = Math.max(1, Math.floor(vertices.count / 12));
          for (var n = 0; n < vertices.count; n += stride) points.push(new THREE.Vector3().fromBufferAttribute(vertices, n).applyMatrix4(obj.matrixWorld));
        }
      });
      var r = canvas.getBoundingClientRect();
      for (var p of points) {
        var ndc = p.clone().project(camera); if (ndc.z < -1 || ndc.z > 1 || Math.abs(ndc.x) > 0.98 || Math.abs(ndc.y) > 0.98) continue;
        var x = r.left + (ndc.x + 1) * r.width / 2, y = r.top + (1 - ndc.y) * r.height / 2;
        if (hitAt(x, y) === id) return { x: x - r.left, y: y - r.top, visible: true };
      }
      return null;
    }
    resize(); highlight(); var previousFrame = performance.now(), raf = requestAnimationFrame(render);
    return {
      update: update, select: select,
      setExploded: function (value) { exploded = !!value; },
      setCutaway: function (value) { cutaway = !!value; dirty = true; renderer.shadowMap.needsUpdate = true; },
      setAutoRotate: function (value) { autoRotate = !!value && !reduced; },
      setReducedMotion: function (value) { reduced = !!value; if (reduced) autoRotate = false; },
      resetView: function () { setView('assembly'); }, setView: setView,
      getComponentScreenPoint: getComponentScreenPoint, getAnnotationPoints: getAnnotationPoints,
      getState: function () { return { selected: selected, exploded: exploded, cutaway: cutaway, autoRotate: autoRotate, ready: !disposed, componentIds: componentIds.slice(), caseId: caseId, replayCaseId: caseId, renderedSample: sample ? Object.assign({}, sample) : null, camera: { position: camera.position.toArray(), target: target.toArray(), distance: distance, yaw: yaw, pitch: pitch }, reducedMotion: reduced, thermalSource: 'supplied synthetic plant temperatures' }; },
      dispose: function () {
        if (disposed) return; disposed = true; cancelAnimationFrame(raf);
        if (observer) observer.disconnect(); else window.removeEventListener('resize', resize);
        if (visibilityObserver) visibilityObserver.disconnect(); document.removeEventListener('visibilitychange', visibilityChanged);
        canvas.removeEventListener('pointerdown', pointerStart); canvas.removeEventListener('pointermove', pointerMove);
        canvas.removeEventListener('pointerup', pointerEnd); canvas.removeEventListener('pointercancel', pointerEnd); canvas.removeEventListener('wheel', wheel);
        geometries.forEach(function (g) { g.dispose(); }); materials.forEach(function (m) { m.dispose(); }); textures.forEach(function (t) { t.dispose(); });
        renderer.dispose(); canvas.remove();
      }
    };
  };
}());
