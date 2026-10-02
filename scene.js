import * as THREE from 'three';

const canvas = document.getElementById('scene');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
} catch {
  canvas.remove(); // no WebGL: the rain alone still carries the hero
}

if (renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.z = 6;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const group = new THREE.Group();
  scene.add(group);

  /* particle shell: a noisy sphere, each point also has a scattered start position */
  const COUNT = innerWidth < 700 ? 3500 : 7000;
  const pos = new Float32Array(COUNT * 3);
  const scatter = new Float32Array(COUNT * 3);
  const seed = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    // fibonacci sphere, slight radial jitter so it reads as a cloud, not a shell
    const y = 1 - (i / (COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    const rad = 1.5 + (Math.random() - 0.5) * 0.12;
    pos.set([Math.cos(th) * r * rad, y * rad, Math.sin(th) * r * rad], i * 3);
    const sr = 6 + Math.random() * 8, sa = Math.random() * Math.PI * 2, sb = Math.acos(2 * Math.random() - 1);
    scatter.set([sr * Math.sin(sb) * Math.cos(sa), sr * Math.sin(sb) * Math.sin(sa), sr * Math.cos(sb)], i * 3);
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const uniforms = {
    uTime: { value: 0 },
    uAssemble: { value: reduced ? 1 : 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 99) },
    uPx: { value: renderer.getPixelRatio() },
  };
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec3 aScatter; attribute float aSeed;
      uniform float uTime, uAssemble, uPx; uniform vec3 uMouse;
      varying float vMix; varying float vSeed;
      void main() {
        float k = smoothstep(0.0, 1.0, clamp(uAssemble * 1.4 - aSeed * 0.4, 0.0, 1.0));
        vec3 p = mix(aScatter, position, k);
        p += normalize(position) * sin(uTime * 1.2 + position.y * 3.0 + aSeed * 6.28) * 0.05 * k;
        vec3 d = p - uMouse;
        float f = smoothstep(1.1, 0.0, length(d));
        p += normalize(d + 1e-4) * f * 0.55;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.6 + aSeed * 2.2 + f * 3.0) * uPx * (6.0 / -mv.z);
        vMix = clamp(position.y * 0.35 + 0.5 + f, 0.0, 1.0);
        vSeed = aSeed;
      }`,
    fragmentShader: /* glsl */`
      varying float vMix; varying float vSeed;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        vec3 green = vec3(0.0, 1.0, 0.61), cyan = vec3(0.0, 0.9, 1.0), pink = vec3(1.0, 0.17, 0.84);
        vec3 c = mix(green, cyan, vMix);
        c = mix(c, pink, step(0.985, vSeed) * 0.9);
        gl_FragColor = vec4(c, smoothstep(0.5, 0.0, d) * 0.9);
      }`,
  }));
  group.add(points);

  /* inner wireframe core */
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 1),
    new THREE.MeshBasicMaterial({ color: 0x00ff9c, wireframe: true, transparent: true, opacity: 0.35 }),
  );
  group.add(core);

  /* sizing: sphere sits right of the headline on desktop, centred and dimmer on small screens */
  let desktop = true;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    desktop = w > 900;
    const visW = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z * camera.aspect;
    group.position.x = desktop ? visW * 0.24 : 0;
    group.scale.setScalar(desktop ? 1 : 0.8);
    canvas.style.opacity = desktop ? '1' : '0.55';
  }
  resize();
  addEventListener('resize', resize);

  /* input */
  const ndc = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    ndc.x = (e.clientX / innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / innerHeight) * 2 + 1;
  });

  const tmp = new THREE.Vector3();
  const rot = { x: 0, y: 0 };

  /* intro: assemble once the boot sequence is done */
  let assembleStart = null;
  const begin = () => { if (assembleStart === null) assembleStart = performance.now(); };
  addEventListener('portfolio:ready', begin);
  setTimeout(begin, 6000); // fallback if main.js never signals

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const scrollP = Math.min(scrollY / innerHeight, 1.6);
    if (scrollP >= 1.6 || document.hidden) return; // hero is gone, stop paying for it

    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    if (assembleStart !== null && uniforms.uAssemble.value < 1) {
      uniforms.uAssemble.value = Math.min((performance.now() - assembleStart) / 2600, 1);
    }

    // cursor → local space of the group, on the z=0 plane
    tmp.set(ndc.x, ndc.y, 0.5).unproject(camera).sub(camera.position).normalize();
    tmp.multiplyScalar(-camera.position.z / tmp.z).add(camera.position);
    uniforms.uMouse.value.copy(group.worldToLocal(tmp));

    rot.x += ((ndc.y * 0.35 + scrollP * 0.9) - rot.x) * 0.05;
    rot.y += ((ndc.x * 0.5 + t * 0.12 + scrollP * 1.6) - rot.y) * 0.05;
    group.rotation.set(rot.x, rot.y, 0);
    core.rotation.y = -t * 0.4;
    core.rotation.x = t * 0.2;

    const s = (desktop ? 1 : 0.8) * (1 + scrollP * 0.35);
    group.scale.setScalar(s);
    canvas.style.opacity = String((desktop ? 1 : 0.55) * Math.max(0, 1 - scrollP * 0.75));

    renderer.render(scene, camera);
  }
  if (reduced) renderer.render(scene, camera); else frame();
}
