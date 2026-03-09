/**
 * app.js — Angwenyiryzer by Ryzer LTD
 * Pioneer-style scroll-triggered 3D CGI experience
 * Three.js r165 · GSAP ScrollTrigger · Lenis
 */

// ─── Wait for GSAP + Lenis to load ────────────────────────────────────────────
await new Promise(resolve => {
  const check = () => (window.gsap && window.ScrollTrigger && window.Lenis) ? resolve() : setTimeout(check, 50);
  check();
});

import * as THREE from 'three';
import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── Chapter Config ────────────────────────────────────────────────────────────
const CHAPTERS = [
  { // 0 Hero
    bg:            new THREE.Color(0x020408),
    fogColor:      new THREE.Color(0x020408),
    ambientColor:  0x080820,
    light1Color:   0x00F5FF,
    light2Color:   0x8B5CF6,
    bloomStrength: 1.4,
    meshOpa:       0.65,
    wireOpa:       0.18,
    torusOpa:      0.0,
    camPos:        { x: 0,  y: 0,  z: 8.5 },
    rot:           { x: 0.10, y: 0.15 },
    particleColor1:new THREE.Color(0x00F5FF),
    particleColor2:new THREE.Color(0x8B5CF6),
    particleSpeed: 0.25,
  },
  { // 1 Design
    bg:            new THREE.Color(0x04020E),
    fogColor:      new THREE.Color(0x04020E),
    ambientColor:  0x100820,
    light1Color:   0xFF6B9D,
    light2Color:   0x9D6EFF,
    bloomStrength: 1.2,
    meshOpa:       0.1,
    wireOpa:       0.12,
    torusOpa:      0.75,
    camPos:        { x: -3.5, y: 1.2, z: 7 },
    rot:           { x: 0.06, y: 0.14 },
    particleColor1:new THREE.Color(0xFF6B9D),
    particleColor2:new THREE.Color(0x9D6EFF),
    particleSpeed: 0.5,
  },
  { // 2 Code
    bg:            new THREE.Color(0x010C04),
    fogColor:      new THREE.Color(0x010C04),
    ambientColor:  0x041208,
    light1Color:   0x39FF14,
    light2Color:   0x00FF88,
    bloomStrength: 2.0,
    meshOpa:       0.7,
    wireOpa:       0.35,
    torusOpa:      0.0,
    camPos:        { x: 3,  y: -1,  z: 7.5 },
    rot:           { x: 0.16, y: 0.20 },
    particleColor1:new THREE.Color(0x39FF14),
    particleColor2:new THREE.Color(0x00FF88),
    particleSpeed: 1.1,
  },
  { // 3 Software / POS
    bg:            new THREE.Color(0x080602),
    fogColor:      new THREE.Color(0x080602),
    ambientColor:  0x181004,
    light1Color:   0xFFD700,
    light2Color:   0xFF6B35,
    bloomStrength: 1.0,
    meshOpa:       0.1,
    wireOpa:       0.1,
    torusOpa:      0.8,
    camPos:        { x: -2.5, y: 2.5, z: 6 },
    rot:           { x: 0.08, y: 0.10 },
    particleColor1:new THREE.Color(0xFFD700),
    particleColor2:new THREE.Color(0xFF6B35),
    particleSpeed: 0.4,
  },
  { // 4 Marketing
    bg:            new THREE.Color(0x07020C),
    fogColor:      new THREE.Color(0x07020C),
    ambientColor:  0x100818,
    light1Color:   0xFF3CAC,
    light2Color:   0x784BA0,
    bloomStrength: 1.8,
    meshOpa:       0.6,
    wireOpa:       0.2,
    torusOpa:      0.0,
    camPos:        { x: 2.5, y: -2.2, z: 8 },
    rot:           { x: 0.12, y: 0.18 },
    particleColor1:new THREE.Color(0xFF3CAC),
    particleColor2:new THREE.Color(0x784BA0),
    particleSpeed: 0.75,
  },
  { // 5 Contact
    bg:            new THREE.Color(0x020408),
    fogColor:      new THREE.Color(0x020408),
    ambientColor:  0x080820,
    light1Color:   0x00F5FF,
    light2Color:   0x8B5CF6,
    bloomStrength: 2.2,
    meshOpa:       0.5,
    wireOpa:       0.25,
    torusOpa:      0.0,
    camPos:        { x: 0, y: 0, z: 5.5 },
    rot:           { x: 0.05, y: 0.08 },
    particleColor1:new THREE.Color(0x00F5FF),
    particleColor2:new THREE.Color(0x8B5CF6),
    particleSpeed: 0.2,
  },
];

// ─── Globals ──────────────────────────────────────────────────────────────────
let renderer, scene, camera, composer, bloomPass;
let mainMesh, wireMesh, torusMesh;
let ringedSphere;
let particles, particleGeo;
let ambientLight, dirLight1, dirLight2, pointLight1, pointLight2;
let clock = new THREE.Clock();
let currentChapter = 0;
let lenis;

// ─── DOM ──────────────────────────────────────────────────────────────────────
const loaderEl   = document.getElementById('loader');
const loaderFill = document.getElementById('loader-fill');
const loaderText = document.getElementById('loader-text');
const canvasEl   = document.getElementById('three-canvas');

function setLoaderProgress(pct, text) {
  loaderFill.style.width = pct + '%';
  if (text) loaderText.textContent = text;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  setLoaderProgress(10, 'Setting up renderer…');

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(CHAPTERS[0].bg, 1);

  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(CHAPTERS[0].fogColor, 0.055);

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(...Object.values(CHAPTERS[0].camPos));

  setLoaderProgress(30, 'Building lights…');
  setupLights();

  setLoaderProgress(50, 'Sculpting 3D scene…');
  setupGeometry();

  setLoaderProgress(68, 'Spawning particles…');
  setupParticles();

  setLoaderProgress(82, 'Initialising post-processing…');
  setupPostProcessing();

  setLoaderProgress(92, 'Wiring scroll engine…');
  setupLenis();
  setupScrollTrigger();

  setLoaderProgress(100, 'Ready!');

  // Hide loader
  await new Promise(r => setTimeout(r, 600));
  gsap.to(loaderEl, {
    opacity: 0, duration: 0.9, ease: 'power2.inOut',
    onComplete: () => { loaderEl.style.display = 'none'; }
  });

  // Reveal hero
  revealChapterContent(0);

  // Start render
  window.addEventListener('resize', onResize);
  renderLoop();
}

// ─── LIGHTS ───────────────────────────────────────────────────────────────────
function setupLights() {
  ambientLight = new THREE.AmbientLight(CHAPTERS[0].ambientColor, 3);
  scene.add(ambientLight);

  dirLight1 = new THREE.DirectionalLight(CHAPTERS[0].light1Color, 4);
  dirLight1.position.set(6, 6, 6);
  scene.add(dirLight1);

  dirLight2 = new THREE.DirectionalLight(CHAPTERS[0].light2Color, 3);
  dirLight2.position.set(-6, -4, 3);
  scene.add(dirLight2);

  pointLight1 = new THREE.PointLight(0x00F5FF, 8, 25);
  pointLight1.position.set(3, 4, 4);
  scene.add(pointLight1);

  pointLight2 = new THREE.PointLight(0x8B5CF6, 6, 20);
  pointLight2.position.set(-4, -3, 2);
  scene.add(pointLight2);
}

// ─── GEOMETRY ─────────────────────────────────────────────────────────────────
function setupGeometry() {
  // Main icosahedron
  const icoGeo = new THREE.IcosahedronGeometry(1.7, 5);
  const icoMat = new THREE.MeshPhongMaterial({
    color: 0x001830,
    emissive: 0x001040,
    specular: 0x00F5FF,
    shininess: 120,
    transparent: true,
    opacity: CHAPTERS[0].meshOpa,
  });
  mainMesh = new THREE.Mesh(icoGeo, icoMat);
  scene.add(mainMesh);

  // Wireframe
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x00F5FF,
    wireframe: true,
    transparent: true,
    opacity: CHAPTERS[0].wireOpa,
  });
  wireMesh = new THREE.Mesh(icoGeo.clone(), wireMat);
  wireMesh.scale.setScalar(1.015);
  scene.add(wireMesh);

  // Torus knot (design / systems chapters)
  const torGeo = new THREE.TorusKnotGeometry(1.85, 0.5, 220, 36);
  const torMat = new THREE.MeshPhongMaterial({
    color: 0x180030,
    emissive: 0x280060,
    specular: 0x9D6EFF,
    shininess: 90,
    transparent: true,
    opacity: 0,
  });
  torusMesh = new THREE.Mesh(torGeo, torMat);
  scene.add(torusMesh);

  // Outer ring (ringed sphere silhouette — adds to every chapter)
  const ringGeo = new THREE.TorusGeometry(3.2, 0.04, 6, 160);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00F5FF,
    transparent: true,
    opacity: 0.12,
  });
  ringedSphere = new THREE.Mesh(ringGeo, ringMat);
  ringedSphere.rotation.x = Math.PI * 0.3;
  scene.add(ringedSphere);
}

// ─── PARTICLES ────────────────────────────────────────────────────────────────
const PARTICLE_COUNT = 7000;

function setupParticles() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors    = new Float32Array(PARTICLE_COUNT * 3);
  const sizes     = new Float32Array(PARTICLE_COUNT);

  const c1 = CHAPTERS[0].particleColor1;
  const c2 = CHAPTERS[0].particleColor2;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const r     = 6 + Math.random() * 18;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.random() * Math.PI;
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const t = Math.random();
    colors[i * 3]     = t * c1.r + (1 - t) * c2.r;
    colors[i * 3 + 1] = t * c1.g + (1 - t) * c2.g;
    colors[i * 3 + 2] = t * c1.b + (1 - t) * c2.b;

    sizes[i] = 0.5 + Math.random() * 2;
  }

  particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
  particleGeo.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

  const particleMat = new THREE.PointsMaterial({
    size: 0.09,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);
}

function shiftParticleColors(c1, c2) {
  const colors = particleGeo.attributes.color.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const t = Math.random();
    colors[i * 3]     = t * c1.r + (1 - t) * c2.r;
    colors[i * 3 + 1] = t * c1.g + (1 - t) * c2.g;
    colors[i * 3 + 2] = t * c1.b + (1 - t) * c2.b;
  }
  particleGeo.attributes.color.needsUpdate = true;
}

// ─── POST-PROCESSING ──────────────────────────────────────────────────────────
function setupPostProcessing() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    CHAPTERS[0].bloomStrength,
    0.55,
    0.22
  );
  composer.addPass(bloomPass);
}

// ─── LENIS + GSAP SCROLL ──────────────────────────────────────────────────────
function setupLenis() {
  gsap.registerPlugin(ScrollTrigger);

  lenis = new Lenis({ lerp: 0.065, smoothWheel: true });

  lenis.on('scroll', () => ScrollTrigger.update());

  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// ─── SCROLL TRIGGERS ──────────────────────────────────────────────────────────
function setupScrollTrigger() {
  const chapters = document.querySelectorAll('.chapter');
  const dots     = document.querySelectorAll('.dot');

  chapters.forEach((section, i) => {
    ScrollTrigger.create({
      trigger:   section,
      scroller:  window,
      start:     'top 75%',
      end:       'bottom 25%',
      onEnter:     () => activateChapter(i, dots),
      onEnterBack: () => activateChapter(i, dots),
    });
  });

  // ── Infinite loop: when last section leaves bottom, scroll back to top ──
  ScrollTrigger.create({
    trigger:  '#ch-contact',
    scroller: window,
    start:    'bottom bottom-=60',
    onLeave: () => {
      setTimeout(() => {
        lenis.scrollTo(0, { duration: 1.8, easing: t => 1 - Math.pow(1 - t, 4) });
      }, 700);
    },
  });

  // ── Nav dot clicks ──
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      lenis.scrollTo(chapters[i], { duration: 1.3, offset: -60 });
    });
  });
}

// ─── ACTIVATE CHAPTER ─────────────────────────────────────────────────────────
function activateChapter(idx, dots) {
  if (idx === currentChapter) return;
  currentChapter = idx;
  const ch = CHAPTERS[idx];

  // Update dots
  dots.forEach((d, i) => d.classList.toggle('active', i === idx));

  // 3D scene transition
  const dur = 1.8;

  // Fog / background
  gsap.to(scene.fog.color, { r: ch.fogColor.r, g: ch.fogColor.g, b: ch.fogColor.b, duration: dur, ease: 'power2.inOut' });

  // Lights
  gsap.to(bloomPass, { strength: ch.bloomStrength, duration: dur, ease: 'power2.inOut' });
  animLightColor(dirLight1, ch.light1Color, dur);
  animLightColor(dirLight2, ch.light2Color, dur);

  // Camera
  gsap.to(camera.position, { x: ch.camPos.x, y: ch.camPos.y, z: ch.camPos.z, duration: dur + 0.4, ease: 'power3.inOut' });

  // Mesh swap
  gsap.to(mainMesh.material,  { opacity: ch.meshOpa,  duration: dur, ease: 'power2.inOut' });
  gsap.to(wireMesh.material,  { opacity: ch.wireOpa,  duration: dur, ease: 'power2.inOut' });
  gsap.to(torusMesh.material, { opacity: ch.torusOpa, duration: dur, ease: 'power2.inOut' });

  // Wire colour
  wireMesh.material.color.setHex(ch.light1Color);

  // Particles
  shiftParticleColors(ch.particleColor1, ch.particleColor2);

  // Reveal text
  revealChapterContent(idx);
}

function animLightColor(light, hexColor, duration) {
  const target = new THREE.Color(hexColor);
  gsap.to(light.color, { r: target.r, g: target.g, b: target.b, duration, ease: 'power2.inOut' });
}

// ─── TEXT REVEAL ──────────────────────────────────────────────────────────────
function revealChapterContent(idx) {
  const chapters = document.querySelectorAll('.chapter');
  const panel = chapters[idx]?.querySelector('.chapter-content');
  if (!panel) return;

  // Fade in panel
  gsap.to(panel, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: 0.1 });

  // Stagger inner items
  const items = panel.querySelectorAll('.reveal-item');
  gsap.fromTo(items,
    { opacity: 0, y: 28 },
    { opacity: 1, y: 0, stagger: 0.12, duration: 0.85, ease: 'power3.out', delay: 0.2 }
  );
}

// ─── RENDER LOOP ──────────────────────────────────────────────────────────────
function renderLoop() {
  requestAnimationFrame(renderLoop);

  const t  = clock.getElapsedTime();
  const ch = CHAPTERS[currentChapter];

  // Mesh rotations
  if (mainMesh) {
    mainMesh.rotation.x = t * ch.rot.x;
    mainMesh.rotation.y = t * ch.rot.y;
  }
  if (wireMesh) {
    wireMesh.rotation.x =  t * ch.rot.x * 0.85;
    wireMesh.rotation.y = -t * ch.rot.y * 0.9;
  }
  if (torusMesh) {
    torusMesh.rotation.x = t * 0.07;
    torusMesh.rotation.y = t * 0.12;
  }
  if (ringedSphere) {
    ringedSphere.rotation.z = t * 0.06;
  }

  // Particles
  if (particles) {
    particles.rotation.y = t * 0.04  * ch.particleSpeed;
    particles.rotation.x = Math.sin(t * 0.018) * 0.12;
  }

  // Breathing point lights
  if (pointLight1) {
    pointLight1.position.x = Math.sin(t * 0.5) * 4;
    pointLight1.position.y = Math.cos(t * 0.4) * 3;
  }
  if (pointLight2) {
    pointLight2.position.x = Math.cos(t * 0.45) * -4;
    pointLight2.position.y = Math.sin(t * 0.35) * -3;
  }

  renderer.setClearColor(CHAPTERS[currentChapter].bg, 1);
  composer.render();
}

// ─── RESIZE ───────────────────────────────────────────────────────────────────
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloomPass.setSize(w, h);
  ScrollTrigger.refresh();
}

// ─── KICK OFF ─────────────────────────────────────────────────────────────────
init().catch(err => {
  console.error('Ryzer init error:', err);
  // Fallback: hide loader if 3D fails
  loaderEl.style.display = 'none';
});
