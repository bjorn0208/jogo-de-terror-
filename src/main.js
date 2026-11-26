import * as THREE from 'three';
import { buildTextures } from './textures.js';
import { createRoom, ROOM } from './room.js';
import { createAtmosphere } from './atmosphere.js';
import { Controls } from './controls.js';
import { HorrorAudio } from './audio.js';
import { createComposer } from './postfx.js';
import { createMonster } from './monster.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const overlay = $('overlay');
const pauseEl = $('pause');
const hud = $('hud');
const startBtn = $('start-btn');
const startLabel = $('start-label');
const hintEl = $('hint');
const touchEl = $('touch');
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const lowEnd = isTouch || (navigator.hardwareConcurrency || 8) <= 4;

/* ---- Renderer ------------------------------------------------------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowEnd, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 1.6));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040604);
scene.fog = new THREE.FogExp2(0x0a0f0c, 0.043);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 45);
camera.rotation.order = 'YXZ';
scene.add(camera);

// Quase escuro: o suficiente para não existir um "preto total" sem textura.
scene.add(new THREE.AmbientLight(0x2c3a30, 0.2));
scene.add(new THREE.HemisphereLight(0x1c261e, 0x090b08, 0.16));

const controls = new Controls(camera, canvas, []);
const audio = new HorrorAudio();
const clock = new THREE.Clock();

// Se o pós-processamento falhar no celular, o jogo continua com render direto.
let post = null;
try {
  post = createComposer(renderer, scene, camera);
} catch (err) {
  console.warn('Post-processamento indisponível; usando render direto.', err);
}
function renderFrame(time) {
  if (post) post.render(time);
  else renderer.render(scene, camera);
}

let room, atmosphere, monster, flash, flashTarget, pointLight, torch, lens, glow;
const viewDir = new THREE.Vector3();
let started = false, paused = false, flashOn = true, elapsed = 0;
let flickerUntil = -1, lastHint = -99, hintTimer = 0;

/* ---- Lanterna ------------------------------------------------------- */
function createTorch(tex) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x242822, metalness: 0.8, roughness: 0.48, emissive: 0x070806,
  });
  const ringMat = new THREE.MeshStandardMaterial({ ...tex.metal, color: 0x6a6a60, metalness: 0.8, roughness: 0.6 });

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.034, 0.25, 16), bodyMat);
  barrel.rotation.x = Math.PI / 2; barrel.position.z = 0.02; g.add(barrel);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.036, 0.12, 12), bodyMat);
  grip.rotation.x = Math.PI / 2; grip.position.z = 0.17; g.add(grip);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.041, 0.1, 18), ringMat);
  head.rotation.x = Math.PI / 2; head.position.z = -0.14; g.add(head);
  for (const z of [-0.1, -0.165, 0.09]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.005, 6, 18), ringMat);
    ring.position.z = z; g.add(ring);
  }
  lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.048, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff0c4, fog: false })
  );
  lens.position.z = -0.192; g.add(lens);

  glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex.glow, color: 0xffe8b0, transparent: true, opacity: 0.75,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  glow.position.z = -0.23; glow.scale.setScalar(0.34); g.add(glow);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  g.position.set(0.3, -0.27, -0.56);
  g.rotation.set(0.05, -0.06, 0.05);
  return g;
}

function setupFlashlight(tex) {
  flash = new THREE.SpotLight(0xffe7b4, 30, 22, 0.47, 0.55, 1.45);
  flash.position.set(0.12, -0.12, -0.06);
  flash.castShadow = true;
  flash.shadow.mapSize.set(lowEnd ? 512 : 1024, lowEnd ? 512 : 1024);
  flash.shadow.camera.near = 0.06;
  flash.shadow.camera.far = 22;
  flash.shadow.bias = -0.00035;
  flash.shadow.normalBias = 0.022;
  flash.shadow.radius = 2;
  camera.add(flash);

  flashTarget = new THREE.Object3D();
  flashTarget.position.set(0, 0, -8);
  camera.add(flashTarget);
  flash.target = flashTarget;

  pointLight = new THREE.PointLight(0xffd9a0, 0.65, 1.5, 2);
  pointLight.position.set(0.3, -0.27, -0.62);
  camera.add(pointLight);

  torch = createTorch(tex);
  camera.add(torch);
}

function updateFlashlight(t, bob) {
  const on = flashOn;
  flash.visible = on;
  pointLight.visible = on;
  lens.visible = on;
  glow.visible = on;
  if (!on) return;

  // contato frouxo: apagões curtos e involuntários
  if (t > flickerUntil + 1.2 && Math.random() < 0.0011) flickerUntil = t + 0.06 + Math.random() * 0.14;
  const jitter = 1 + Math.sin(t * 17.3) * 0.014 + Math.sin(t * 31.7) * 0.009;
  let intensity = 30 * jitter;
  if (t < flickerUntil) intensity *= 0.25 + Math.random() * 0.5;
  flash.intensity = intensity;
  pointLight.intensity = 0.65 * (intensity / 30);
  glow.material.opacity = 0.7 * (intensity / 30);

  const sx = controls.sway.x, sy = controls.sway.y;
  flashTarget.position.set(sx * 3.0, sy * 3.0 - 0.02, -8);
  torch.position.set(0.3 + sx, -0.27 + sy + bob.bobY * 0.35, -0.56);
  torch.rotation.set(0.05 + sy * 0.6, -0.06 + sx * 0.6, 0.05);

  // passos fazem o feixe tremer um pouco
  flash.position.set(0.12 + bob.bobX * 0.5, -0.12 + bob.bobY * 0.25, -0.06);
}

/* ---- Interface ------------------------------------------------------ */
function showHint(text, seconds = 5) {
  hintEl.textContent = text;
  hintEl.classList.add('show');
  hintTimer = seconds;
}

function updateStatus() {
  $('flash-state').textContent = flashOn ? 'LIGADA' : 'DESLIGADA';
  $('sound-state').textContent = audio.muted ? 'MUTADO' : 'LIGADO';
}

function toggleFlash() {
  flashOn = !flashOn;
  audio.click(flashOn);
  $('btn-flash')?.classList.toggle('active', flashOn);
  updateStatus();
  if (!flashOn) showHint('A escuridão não tem paciência.', 3);
}

function toggleSound() {
  audio.setMuted(!audio.muted);
  updateStatus();
}

function maybeHint() {
  const p = camera.position;
  if (elapsed - lastHint < 14) return;
  if (Math.abs(p.x + 1.85) < 1.2 && p.z > 2.75) {
    showHint('A porta não abre. Ainda.', 4);
    lastHint = elapsed;
  }
}

/* ---- Construção do mundo -------------------------------------------- */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

async function build() {
  try {
    startLabel.textContent = 'GERANDO TEXTURAS...';
    await nextFrame();
    const tex = buildTextures(lowEnd);

    startLabel.textContent = 'MONTANDO O PORÃO...';
    await nextFrame();
    room = createRoom(scene, tex);
    controls.colliders = room.colliders;

    atmosphere = createAtmosphere(scene, camera, tex, ROOM, lowEnd);
    setupFlashlight(tex);
    monster = createMonster(scene, audio, room.colliders);
    monster.onAttack = () => showHint('ALGO PASSOU MUITO PERTO.', 3);
    controls.reset(room.spawn);
    post?.setSize(window.innerWidth, window.innerHeight);

    startBtn.disabled = false;
    startLabel.textContent = isTouch ? 'ENTRAR' : 'ENTRAR NO PORÃO';
  } catch (err) {
    console.error(err);
    window.__showError?.('Falha ao montar: ' + (err && err.message ? err.message : err));
    startBtn.disabled = false;
    startLabel.textContent = 'TENTAR ENTRAR';
  }
}

/* ---- Início / pausa -------------------------------------------------- */
function startGame() {
  if (!room) { build(); return; }
  audio.init();
  audio.resume();
  started = true;
  paused = false;
  overlay.classList.remove('visible');
  hud.classList.add('visible');
  controls.enabled = true;
  if (isTouch) touchEl.hidden = false;
  else controls.requestLock();
  updateStatus();
  showHint('A lanterna é a única luz que sobrou.', 6);
  clock.getDelta();
}

startBtn.addEventListener('click', startGame);
$('resume-btn').addEventListener('click', () => {
  if (isTouch) { paused = false; pauseEl.classList.remove('visible'); controls.enabled = true; }
  else controls.requestLock();
});

document.addEventListener('pointerlockchange', () => {
  if (!started || isTouch) return;
  const locked = document.pointerLockElement === canvas;
  paused = !locked;
  controls.enabled = locked;
  pauseEl.classList.toggle('visible', !locked);
  hud.classList.toggle('visible', locked);
  if (locked) audio.resume();
});

/* ---- Toque ---------------------------------------------------------- */
if (isTouch) {
  controls.bindTouch($('stick'), $('stick-knob'), $('lookzone'));
  $('btn-flash').addEventListener('click', toggleFlash);
  const run = $('btn-run'), crouch = $('btn-crouch');
  const hold = (el, code) => {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); controls.keys.add(code); el.classList.add('active'); });
    const up = () => { controls.keys.delete(code); el.classList.remove('active'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  hold(run, 'ShiftLeft');
  crouch.addEventListener('pointerdown', (e) => {
    e.preventDefault(); controls.crouch = !controls.crouch; crouch.classList.toggle('active', controls.crouch);
  });
}

controls.onFootstep = (amount, sprint) => audio.footstep(amount, sprint);

/* ---- Redimensionar --------------------------------------------------- */
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setSize(w, h);
  post?.setSize(w, h);
});

/* ---- Loop ------------------------------------------------------------ */
const noBob = { bobX: 0, bobY: 0 };
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  let bob = noBob;
  if (started && !paused) {
    bob = controls.update(dt);
    audio.update(dt);
    camera.getWorldDirection(viewDir);
    monster?.update(dt, camera.position, viewDir, flashOn);
    maybeHint();
    if (hintTimer > 0) {
      hintTimer -= dt;
      if (hintTimer <= 0) hintEl.classList.remove('show');
    }
  } else if (room) {
    // leve oscilação da câmera enquanto o menu está na tela
    camera.position.y = 1.62 + Math.sin(elapsed * 0.6) * 0.012;
  }

  if (controls.consume('flash')) toggleFlash();
  if (controls.consume('sound')) toggleSound();

  if (room) {
    room.update(elapsed);
    updateFlashlight(elapsed, bob);
    atmosphere.update(elapsed, flashOn);
  }
  renderFrame(elapsed);
}

animate();
// Texturas pesadas são geradas depois do primeiro frame, para o menu aparecer.
setTimeout(build, 60);
