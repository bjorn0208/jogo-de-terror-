import * as THREE from 'three';
import { buildTextures } from './textures.js';
import { createRoom, ROOM, SCALE } from './room.js';
import { createAtmosphere } from './atmosphere.js';
import { Controls } from './controls.js';
import { HorrorAudio } from './audio.js';
import { createComposer } from './postfx.js';
import { createItems, BATTERY_SECONDS, MAX_SPARES, SAFE_CODE } from './items.js';
import { createRats } from './rats.js';

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
// Alguns aparelhos recusam o contexto "high-performance". Tenta uma segunda
// configuração mais conservadora antes de considerar que não há WebGL.
function createRenderer() {
  try {
    return new THREE.WebGLRenderer({ canvas, antialias: !lowEnd, powerPreference: 'high-performance' });
  } catch (first) {
    try {
      return new THREE.WebGLRenderer({
        canvas, antialias: false, powerPreference: 'default', failIfMajorPerformanceCaveat: false,
      });
    } catch (_) {
      throw first;
    }
  }
}
const renderer = createRenderer();
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 1.6));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040604);
// Ar limpo: sem névoa e sem poeira. Só a luz do facho desenha o volume.
scene.fog = null;

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 45);
camera.rotation.order = 'YXZ';
scene.add(camera);

// Um mínimo de bounce para o preto não virar buraco; a lanterna continua mandando.
scene.add(new THREE.AmbientLight(0x273329, 0.075));
scene.add(new THREE.HemisphereLight(0x182019, 0x070906, 0.05));

// Cone mais aberto pede mais intensidade: 30 mantém o hotspot presente.
// Lanterna com o dobro da intensidade original (30 -> 60).
const FLASH_INTENSITY = 60;
const SPILL_INTENSITY = 10;
const HAND_INTENSITY = 0.5;

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

let room, atmosphere, flash, spill, flashTarget, pointLight, torch, lens, glow, items, rats;
let started = false, paused = false, flashOn = true, elapsed = 0, finished = false;
let flickerUntil = -1, lastHint = -99, hintTimer = 0;

/* ---- Partida: pilha, chave, frases ditas uma única vez ---------------- */
let batterySeconds = BATTERY_SECONDS, spares = 0, hasKey = false;
let lowWarned = false, doomed = false, doomTimer = 0, deathVideoPlaying = false;
let shake = 0, creakStep = 0, statusClock = 0;
let safeUI = false, safeInput = '', paperUI = false, activeTarget = null, actionLabel = '';
const saidPhrases = new Set();
const doorPos = new THREE.Vector3(-1.85 * SCALE, 0, 3.4 * SCALE);
const creakMarks = [1.6, 0.2, -1.2].map((z) => z * SCALE);

const fmtTime = (s) => {
  const v = Math.max(0, Math.ceil(s));
  return String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0');
};

// Brilho ajustável (20% a 180%). Guarda a preferência entre recarregamentos.
let brightness = 1;
try {
  const saved = parseFloat(localStorage.getItem('porao.brightness'));
  if (Number.isFinite(saved)) brightness = Math.min(1.8, Math.max(0.2, saved));
} catch (_) { /* localStorage pode não existir */ }

/* ---- Lanterna ------------------------------------------------------- */
function createTorch(tex) {
  const g = new THREE.Group();
  // MeshBasic: o modelo não é "queimado" pelo próprio facho da lanterna.
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0x191c18 });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x41463d });

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
    new THREE.CircleGeometry(0.05, 24),
    new THREE.MeshBasicMaterial({
      map: tex.glow, color: 0xffe6b8, transparent: true, opacity: 0.85, fog: false,
    })
  );
  lens.position.z = -0.192; g.add(lens);

  glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex.glow, color: 0xffe0a8, transparent: true, opacity: 0.38,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  glow.position.z = -0.23; glow.scale.setScalar(0.34); g.add(glow);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  // bem fora do cone: a cabeça da lanterna não aparece iluminada
  g.position.set(0.37, -0.33, -0.52);
  g.rotation.set(0.05, -0.06, 0.05);
  return g;
}

function setupFlashlight(tex) {
  // Facho principal: hotspot definido, queda física e reflector sujo.
  flash = new THREE.SpotLight(0xffe6bd, FLASH_INTENSITY, 24, 0.58, 0.6, 2);
  flash.map = tex.cookie;
  flash.position.set(0.1, -0.1, -0.08);
  flash.castShadow = true;
  flash.shadow.mapSize.set(lowEnd ? 512 : 1024, lowEnd ? 512 : 1024);
  flash.shadow.camera.near = 0.06;
  flash.shadow.camera.far = 24;
  flash.shadow.bias = -0.00025;
  flash.shadow.normalBias = 0.018;
  flash.shadow.radius = 2;
  camera.add(flash);

  flashTarget = new THREE.Object3D();
  flashTarget.position.set(0, -0.02, -8);
  camera.add(flashTarget);
  flash.target = flashTarget;

  // Spill largo e fraco: a luz que "escorre" do reflector ao redor do hotspot.
  // Sem sombra, custa quase nada e evita o efeito de buraco preto ao redor.
  spill = new THREE.SpotLight(0xffe0b4, SPILL_INTENSITY, 13, 1.0, 1, 2);
  spill.position.copy(flash.position);
  spill.target = flashTarget;
  camera.add(spill);

  // respingo quente só na própria lanterna/mão.
  pointLight = new THREE.PointLight(0xffd9a0, HAND_INTENSITY, 1.0, 2);
  pointLight.position.set(0.34, -0.3, -0.58);
  camera.add(pointLight);

  torch = createTorch(tex);
  camera.add(torch);
}

function updateFlashlight(t, bob) {
  const on = flashOn && batterySeconds > 0;
  flash.visible = on;
  spill.visible = on;
  pointLight.visible = on;
  lens.visible = on;
  glow.visible = on;
  if (!on) return;

  // contato frouxo: quedas curtas, nunca um apagão preto
  if (t > flickerUntil + 1.2 && Math.random() < 0.0008) flickerUntil = t + 0.06 + Math.random() * 0.14;
  const jitter = 1 + Math.sin(t * 17.3) * 0.005 + Math.sin(t * 31.7) * 0.003;
  let intensity = FLASH_INTENSITY * jitter;
  if (t < flickerUntil) intensity *= 0.45 + Math.random() * 0.35;
  let power = (intensity / FLASH_INTENSITY) * brightness;
  // aviso de pilha fraca: pisca cada vez mais antes de morrer
  if (batterySeconds > 0 && batterySeconds <= 10) {
    const blink = Math.sin(t * 19) > -0.2 || Math.random() < 0.03;
    if (!blink) power *= 0.035;
  }
  flash.intensity = FLASH_INTENSITY * power;
  spill.intensity = SPILL_INTENSITY * power;
  pointLight.intensity = HAND_INTENSITY * power;
  glow.material.opacity = 0.45 * power;

  // Alvo quase fixo: o sway mexe a lanterna na mão, não a direção do feixe.
  const sx = controls.sway.x, sy = controls.sway.y;
  flashTarget.position.set(sx * 0.4, sy * 0.4 - 0.02, -8);
  const jx = shake > 0 ? (Math.random() - 0.5) * shake * 0.12 : 0;
  const jy = shake > 0 ? (Math.random() - 0.5) * shake * 0.1 : 0;
  torch.position.set(0.37 + sx * 0.5 + jx, -0.33 + sy * 0.5 + bob.bobY * 0.2 + jy, -0.52);
  torch.rotation.set(0.05 + sy * 0.3 + jy, -0.06 + sx * 0.3 + jx, 0.05 + jx);

  // passos fazem o feixe tremer só um pouco
  flash.position.set(0.1 + bob.bobX * 0.15, -0.1 + bob.bobY * 0.1, -0.08);
  spill.position.copy(flash.position);
}

/* ---- Interface ------------------------------------------------------ */
function showHint(text, seconds = 5) {
  hintEl.textContent = text;
  hintEl.classList.remove('paper');
  hintEl.classList.add('show');
  hintTimer = seconds;
}

/** Frase de história: aparece no máximo uma vez por partida. */
function showPhrase(id, text, seconds = 4) {
  if (saidPhrases.has(id)) return;
  saidPhrases.add(id);
  showHint(text, seconds);
}

/** Folha aberta na frente do jogador: apenas a imagem da pista. */
function openPaperUI() {
  const img = $('paper-img');
  const src = window.__PORAO_PAPER__ || '';
  if (src) {
    img.src = src;
    img.style.display = '';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
  }
  $('paper').classList.add('visible');
  paperUI = true;
  paused = true;
  controls.enabled = false;
  if (!isTouch && document.pointerLockElement) document.exitPointerLock();
}

function closePaperUI() {
  if (!paperUI) return;
  paperUI = false;
  $('paper').classList.remove('visible');
  paused = false;
  controls.enabled = true;
  if (!isTouch) controls.requestLock();
  clock.getDelta();
}

/** Fim do vídeo da última pilha: só então toca o som da morte. */
function finishDeathVideo() {
  if (!deathVideoPlaying) return;
  deathVideoPlaying = false;
  const v = $('death-video-el');
  v.pause();
  $('death-video').classList.remove('visible');
  audio.playDeath();
  gameOver('A última pilha morreu. O escuro te encontrou.');
}

function playDeathVideo() {
  const src = window.__PORAO_DEATH_VIDEO__ || '';
  if (!src) { audio.playBatteryDead(); return; }
  deathVideoPlaying = true;
  paused = true;
  controls.enabled = false;
  if (!isTouch && document.pointerLockElement) document.exitPointerLock();
  const v = $('death-video-el');
  v.src = src;
  try { v.currentTime = 0; } catch (_) { /* vídeo ainda sem metadata */ }
  v.muted = true;
  $('death-video').classList.add('visible');
  const p = v.play();
  if (p && p.catch) p.catch(finishDeathVideo);
}

function updateStatus() {
  $('flash-state').textContent = flashOn ? 'LIGADA' : 'DESLIGADA';
  $('sound-state').textContent = audio.muted ? 'MUTADO' : 'LIGADO';
  const pct = Math.round(brightness * 100) + '%';
  $('bright-state').textContent = pct;
  $('bright-value').textContent = pct;
  $('battery-state').textContent = fmtTime(batterySeconds);
  $('battery-state').classList.toggle('low', batterySeconds <= 10 && batterySeconds > 0);
  $('spare-state').textContent = String(spares);
  $('key-state').textContent = hasKey ? 'SIM' : 'NÃO';
}

function toggleFlash() {
  flashOn = !flashOn;
  audio.click(flashOn);
  $('btn-flash')?.classList.toggle('active', flashOn);
  updateStatus();
  if (!flashOn) showPhrase('dark', 'A escuridão não tem paciência.', 3);
}

function toggleSound() {
  audio.setMuted(!audio.muted);
  updateStatus();
}

function adjustBrightness(delta) {
  brightness = Math.min(1.8, Math.max(0.2, Math.round((brightness + delta) * 10) / 10));
  try { localStorage.setItem('porao.brightness', String(brightness)); } catch (_) { /* ignora */ }
  updateStatus();
  showHint('BRILHO ' + Math.round(brightness * 100) + '%', 1.2);
}

/* ---- Regras da partida ------------------------------------------------ */
function updateBattery(dt) {
  if (!flashOn || batterySeconds <= 0) return;
  batterySeconds = Math.max(0, batterySeconds - dt);
  if (batterySeconds <= 10 && !lowWarned) {
    lowWarned = true;
    audio.click(false);
    showPhrase('low', 'A pilha está acabando. A luz falha.', 4);
  }
  if (batterySeconds > 0) return;

  if (spares > 0) {
    spares--;
    batterySeconds = BATTERY_SECONDS;
    lowWarned = false;
    flickerUntil = elapsed + 0.35;
    audio.pickup();
    showPhrase('swap', 'Troquei de pilha. Por pouco.', 3);
  } else {
    doomed = true;
    doomTimer = 4.5;
    audio.stopBeds(0.35);
    showPhrase('dead', 'A pilha morreu. Passos se aproximam.', 5);
    playDeathVideo();
  }
}

/* ---- Interação (botão PEGAR / tecla E) ------------------------------ */
function findInteractable() {
  if (!items || !started || finished || safeUI || paperUI) return null;
  const p = camera.position;
  let best = null, bestD = Infinity;
  const consider = (type, obj, label, range) => {
    const d = Math.hypot(p.x - obj.position.x, p.z - obj.position.z);
    if (d <= range && d < bestD) { bestD = d; best = { type, obj, label }; }
  };

  for (const b of items.batteries) {
    if (!b.taken) consider('battery', b, 'PEGAR PILHA', 1.2);
  }
  if (!items.key.taken && items.key.mesh.visible) consider('key', items.key, 'PEGAR CHAVE', 1.2);
  for (const note of items.papers) consider('paper', note, 'LER FOLHA', 1.5);
  if (!items.safe.open) consider('safe', items.safe, 'ABRIR COFRE', 1.6);

  const dd = Math.hypot(p.x - doorPos.x, p.z - doorPos.z);
  if (dd <= 3.5 && dd < bestD) {
    best = { type: 'door', obj: null, label: hasKey ? 'USAR CHAVE' : 'PORTA TRACADA' };
  }
  return best;
}

function updateActionUI() {
  const target = findInteractable();
  activeTarget = target;
  const label = target ? target.label : '';
  if (label === actionLabel) return;
  actionLabel = label;
  const el = $('action');
  el.innerHTML = label ? '<b>E</b>' + label : '';
  el.classList.toggle('show', !!label);
  const btn = $('btn-pick');
  if (btn) btn.textContent = label ? label.split(' ')[0] : 'PEGAR';
}

function interact() {
  if (!started || finished || safeUI || paperUI) return;
  const t = activeTarget || findInteractable();
  if (!t) return;

  if (t.type === 'battery') {
    const b = t.obj;
    b.taken = true;
    b.mesh.visible = false;
    spares = Math.min(MAX_SPARES, spares + 1);
    audio.pickup();
    showPhrase('findBattery', 'Uma pilha. Guardei para depois.', 3);
    if (doomed) {
      doomed = false;
      batterySeconds = BATTERY_SECONDS;
      lowWarned = false;
      showPhrase('saved', 'A luz voltou. Ele recuou.', 4);
    }
  } else if (t.type === 'key') {
    t.obj.taken = true;
    t.obj.mesh.visible = false;
    hasKey = true;
    audio.pickup();
    showPhrase('findKey', 'A chave do cadeado. Enfim.', 4);
  } else if (t.type === 'paper') {
    t.obj.read = true;
    audio.paper();
    openPaperUI();
    // a folha do quarto muda o fundo sonoro
    if (items.papers.indexOf(t.obj) === items.papers.length - 1) audio.playForestBed();
  } else if (t.type === 'safe') {
    openSafeUI();
  } else if (t.type === 'door') {
    tryUseKey();
  }

  activeTarget = null;
  updateStatus();
}

/* ---- Cofre ---------------------------------------------------------- */
function openSafeUI() {
  safeUI = true;
  safeInput = '';
  $('safe-code').textContent = '· · · ·';
  $('safe-msg').textContent = 'A folha na parede do quarto diz a ordem. Os números destacados são os dígitos.';
  $('safe').classList.add('visible');
  paused = true;
  controls.enabled = false;
  if (!isTouch && document.pointerLockElement) document.exitPointerLock();
}

function closeSafeUI() {
  if (!safeUI) return;
  safeUI = false;
  $('safe').classList.remove('visible');
  paused = false;
  controls.enabled = true;
  if (!isTouch) controls.requestLock();
  clock.getDelta();
}

function refreshSafeUI() {
  $('safe-code').textContent = (safeInput + '····').slice(0, 4).split('').join(' ');
}

function safeDigit(d) {
  if (!safeUI || safeInput.length >= 4) return;
  safeInput += d;
  audio.click(true);
  refreshSafeUI();
}

function safeBack() {
  if (!safeUI) return;
  safeInput = safeInput.slice(0, -1);
  refreshSafeUI();
}

function safeSubmit() {
  if (!safeUI) return;
  if (safeInput.length < 4) {
    $('safe-msg').textContent = 'Faltam números.';
    return;
  }
  if (safeInput === SAFE_CODE) {
    items.safe.open = true;
    items.safe.door.rotation.y = -1.35;
    items.key.mesh.visible = true;
    audio.unlock();
    closeSafeUI();
    showPhrase('safeOpen', 'O cofre cedeu. A chave está aqui dentro.', 5);
  } else {
    safeInput = '';
    audio.click(false);
    $('safe-msg').textContent = 'Errado. Leia a folha do quarto na ordem certa.';
    refreshSafeUI();
  }
}

function checkStairCreaks() {
  const p = camera.position;
  if (p.x < -3.85 * SCALE || p.x > -2.65 * SCALE) return;
  if (p.z > 3.0 * SCALE || controls.floorY <= 0.05) { creakStep = 0; return; }
  if (creakStep < creakMarks.length && p.z <= creakMarks[creakStep]) {
    audio.creak();
    creakStep++;
  }
}

function tryUseKey() {
  if (!started || finished || safeUI || paperUI || !items) return;
  const p = camera.position;
  const dist = Math.hypot(p.x - doorPos.x, p.z - doorPos.z);
  if (!hasKey) {
    showPhrase('needKey', 'O cadeado está fechado. Preciso da chave.', 4);
    return;
  }
  if (dist > 3.5) {
    showPhrase('exitFront', 'A porta de saída fica na parede da frente.', 4);
    return;
  }
  audio.unlock();
  audio.stopBeds(0.6);
  items.padlock.visible = false;
  finished = true;
  started = false;
  controls.enabled = false;
  $('win-detail').textContent = 'Ainda restavam ' + fmtTime(batterySeconds) + ' de pilha e ' + spares + ' reservas.';
  $('win').classList.add('visible');
  hud.classList.remove('visible');
  if (!isTouch && document.pointerLockElement) document.exitPointerLock();
}

function gameOver(detail) {
  if (finished) return;
  finished = true;
  started = false;
  paused = true;
  controls.enabled = false;
  audio.stopBeds(0.4);
  if (!doomed) audio.growl();
  $('death-detail').textContent = detail;
  $('death').classList.add('visible');
  hud.classList.remove('visible');
  if (!isTouch && document.pointerLockElement) document.exitPointerLock();
}

function onScare() {
  // susto sem flash vermelho: só um tremor curto de câmera
  shake = 0.5;
}

function maybeHint() {
  const p = camera.position;
  if (elapsed - lastHint < 8) return;
  if (controls.floorY > 2.5 * SCALE) {
    showPhrase('upper', 'O corredor cheira a mofo. O quarto está mais adiante.', 4);
    lastHint = elapsed;
    return;
  }
  if (Math.abs(p.x + 3.25 * SCALE) < 0.7 * SCALE && p.z > 2.3 * SCALE && p.z < 3.3 * SCALE) {
    showPhrase('stairs', 'Uma escada. As tábuas parecem firmes.', 4);
    lastHint = elapsed;
    return;
  }
  if (Math.abs(p.x + 1.85 * SCALE) < 1.2 * SCALE && p.z > 2.75 * SCALE) {
    showPhrase('lockedDoor', 'A porta não abre. Ainda.', 4);
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
    controls.zones = room.zones;
    controls.ramps = room.ramps;

    atmosphere = createAtmosphere(scene, camera, tex, ROOM, lowEnd);
    setupFlashlight(tex);
    items = createItems(scene);
    rats = createRats(scene, audio);
    rats.onScare = onScare;
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
  audio.playStartBed();
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

/** Começa uma partida nova sem voltar ao menu. */
function restartGame() {
  if (!room) return;
  $('death').classList.remove('visible');
  $('win').classList.remove('visible');
  deathVideoPlaying = false;
  const v = $('death-video-el');
  v.pause();
  v.removeAttribute('src');
  $('death-video').classList.remove('visible');
  batterySeconds = BATTERY_SECONDS; spares = 0; hasKey = false;
  lowWarned = false; doomed = false; doomTimer = 0;
  shake = 0; creakStep = 0; statusClock = 0;
  flickerUntil = -1;
  safeUI = false; safeInput = ''; paperUI = false; activeTarget = null; actionLabel = '';
  $('safe').classList.remove('visible');
  $('paper').classList.remove('visible');
  $('action').classList.remove('show');
  saidPhrases.clear();
  finished = false;

  if (items) {
    for (const b of items.batteries) { b.taken = false; b.mesh.visible = true; }
    items.key.taken = false; items.key.mesh.visible = false;
    for (const note of items.papers) note.read = false;
    items.safe.open = false;
    items.safe.door.rotation.y = 0;
    items.padlock.visible = true;
  }
  flashOn = true;
  $('btn-flash')?.classList.add('active');

  controls.reset(room.spawn);
  controls.enabled = true;
  started = true;
  paused = false;
  hud.classList.add('visible');
  audio.resume();
  audio.stopBeds();
  audio.playStartBed();
  updateStatus();
  showPhrase('restart', 'De novo. Dessa vez, não perca a luz.', 5);
  if (!isTouch) controls.requestLock();
  clock.getDelta();
}

startBtn.addEventListener('click', startGame);
$('retry-btn').addEventListener('click', restartGame);
$('again-btn').addEventListener('click', restartGame);
$('resume-btn').addEventListener('click', () => {
  if (isTouch) { paused = false; pauseEl.classList.remove('visible'); controls.enabled = true; }
  else controls.requestLock();
});

document.addEventListener('pointerlockchange', () => {
  if (!started || isTouch) return;
  const locked = document.pointerLockElement === canvas;
  paused = !locked;
  controls.enabled = locked && !safeUI && !paperUI;
  pauseEl.classList.toggle('visible', !locked && !safeUI && !paperUI);
  hud.classList.toggle('visible', locked && !safeUI && !paperUI);
  if (locked) audio.resume();
});

/* ---- Toque ---------------------------------------------------------- */
if (isTouch) {
  controls.bindTouch($('stick'), $('stick-knob'), $('lookzone'));
  $('btn-flash').addEventListener('click', toggleFlash);
  $('btn-pick').addEventListener('click', interact);
  $('btn-dim').addEventListener('click', (e) => { e.preventDefault(); adjustBrightness(-0.1); });
  $('btn-lumen').addEventListener('click', (e) => { e.preventDefault(); adjustBrightness(0.1); });
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

/* ---- Teclado do cofre ------------------------------------------------ */
for (const btn of document.querySelectorAll?.('#safe-keys [data-d]') || []) {
  btn.addEventListener('click', () => safeDigit(btn.dataset.d));
}
$('safe-back').addEventListener('click', safeBack);
$('safe-ok').addEventListener('click', safeSubmit);
$('safe-close').addEventListener('click', closeSafeUI);
$('paper').addEventListener('click', closePaperUI);
$('death-video-el').addEventListener('ended', finishDeathVideo);
$('death-video-el').addEventListener('error', finishDeathVideo);
$('death-video').addEventListener('click', finishDeathVideo);
document.addEventListener('keydown', (e) => {
  if (paperUI) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); closePaperUI();
    }
    return;
  }
  if (deathVideoPlaying) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); finishDeathVideo();
    }
    return;
  }
  if (!safeUI) return;
  if (/^[0-9]$/.test(e.key)) { e.preventDefault(); safeDigit(e.key); }
  else if (e.key === 'Backspace') { e.preventDefault(); safeBack(); }
  else if (e.key === 'Enter') { e.preventDefault(); safeSubmit(); }
  else if (e.key === 'Escape') { e.preventDefault(); closeSafeUI(); }
});

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
    updateBattery(dt);
    updateActionUI();
    checkStairCreaks();
    if (doomed) {
      doomTimer -= dt;
      if (doomTimer <= 0) gameOver('A última pilha morreu. O escuro te encontrou.');
    }
    rats?.update(dt, camera.position);
    maybeHint();

    statusClock += dt;
    if (statusClock >= 0.25) { statusClock = 0; updateStatus(); }
  } else if (room) {
    // leve oscilação da câmera enquanto o menu está na tela
    camera.position.y = 1.62 + Math.sin(elapsed * 0.6) * 0.012;
  }

  if ((!started || paused || safeUI || paperUI) && actionLabel) {
    actionLabel = ''; activeTarget = null; $('action').classList.remove('show');
  }
  if (hintTimer > 0) {
    hintTimer -= dt;
    if (hintTimer <= 0) hintEl.classList.remove('show');
  }
  if (shake > 0) shake = Math.max(0, shake - dt * 1.6);

  if (controls.consume('flash')) toggleFlash();
  if (controls.consume('sound')) toggleSound();
  if (controls.consume('brightDown')) adjustBrightness(-0.1);
  if (controls.consume('brightUp')) adjustBrightness(0.1);
  if (controls.consume('interact')) interact();

  if (room) {
    room.update(elapsed);
    updateFlashlight(elapsed, bob);
    atmosphere.update(elapsed, flashOn && batterySeconds > 0, brightness);
  }
  renderFrame(elapsed);
}

animate();
// Texturas pesadas são geradas depois do primeiro frame, para o menu aparecer.
setTimeout(build, 60);
