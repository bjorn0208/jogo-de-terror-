import * as THREE from 'three';
import { SCALE } from './room.js';

export const BATTERY_SECONDS = 120;
export const MAX_SPARES = 3;
// Código do cofre: os quatro dígitos estão todos na folha única do quarto.
export const SAFE_CODE = '7391';

/* Objetos escondidos: pilhas, a folha única com o código pregada na parede
   do quarto, o cofre sobre o criado-mudo e o cadeado na porta de saída.
   Tudo em coordenadas da casa (BASE), escalado junto com ela. */

function paperTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 160;
  const x = c.getContext('2d');
  x.fillStyle = '#a8a085'; x.fillRect(0, 0, 128, 160);
  x.fillStyle = 'rgba(70,60,40,0.10)';
  for (let i = 0; i < 14; i++) {
    x.beginPath();
    x.ellipse(20 + Math.random() * 90, 20 + Math.random() * 120,
      3 + Math.random() * 12, 2 + Math.random() * 6, 0, 0, Math.PI * 2);
    x.fill();
  }
  x.strokeStyle = 'rgba(38,32,24,0.62)';
  x.lineWidth = 1.5;
  for (let i = 0; i < 11; i++) {
    const y = 19 + i * 11;
    x.beginPath();
    x.moveTo(13, y);
    let px = 13;
    for (let j = 0; j < 4; j++) {
      px += 12 + Math.random() * 16;
      x.lineTo(px, y + (Math.random() - 0.5) * 3);
    }
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function batteryBoxTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#15552f'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#247d43'; x.fillRect(0, 0, 256, 20);
  x.fillStyle = '#0d3a20'; x.fillRect(0, 112, 256, 16);
  x.strokeStyle = 'rgba(235,235,205,.45)'; x.lineWidth = 4;
  x.strokeRect(7, 28, 242, 78);
  x.fillStyle = '#eae6c4'; x.textAlign = 'center';
  x.font = 'bold 38px monospace'; x.fillText('PILHAS', 128, 66);
  x.font = 'bold 24px monospace'; x.fillText('AA  x2', 128, 96);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createItems(scene) {
  const group = new THREE.Group();
  group.scale.setScalar(SCALE);
  scene.add(group);

  const wrap = new THREE.MeshStandardMaterial({ color: 0x8b6f42, roughness: 0.75, metalness: 0.2 });
  const tip = new THREE.MeshStandardMaterial({ color: 0xb9b5a4, roughness: 0.35, metalness: 0.75 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24261f, roughness: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x4b4f47, roughness: 0.55, metalness: 0.75 });
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x9a947e, roughness: 0.4, metalness: 0.8 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.35, metalness: 0.85 });
  const greenBox = new THREE.MeshStandardMaterial({ color: 0x1c6b3a, roughness: 0.65 });
  const greenLabel = new THREE.MeshStandardMaterial({ map: batteryBoxTexture(), roughness: 0.8 });
  const paperMat = new THREE.MeshStandardMaterial({
    map: paperTexture(), roughness: 1, side: THREE.DoubleSide,
  });

  function battery(x, z, y = 0.05, rot = 0) {
    const g = new THREE.Group();
    // caixa verde com rótulo "PILHAS AA" na frente e atrás
    const faces = [greenBox, greenBox, greenBox, greenBox, greenLabel, greenLabel];
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.075, 0.14), faces);
    g.add(box);
    // duas pilhas AA deitadas dentro, com anel escuro e contato de cobre
    for (const zz of [-0.034, 0.034]) {
      const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.105, 14), tip);
      cell.rotation.z = Math.PI / 2; cell.position.set(0, 0.048, zz); g.add(cell);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 14), dark);
      band.rotation.z = Math.PI / 2; band.position.set(-0.02, 0.048, zz); g.add(band);
      const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.01, 10), copper);
      nub.rotation.z = Math.PI / 2; nub.position.set(0.057, 0.048, zz); g.add(nub);
    }
    g.position.set(x, y, z);
    g.rotation.y = rot;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(g);
    return { mesh: g, position: new THREE.Vector3(x * SCALE, y * SCALE, z * SCALE), taken: false };
  }

  function key(x, y, z, visible) {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.008, 0.15), keyMat);
    g.add(shaft);
    const head = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.008, 6, 14), keyMat);
    head.position.z = -0.085; head.rotation.x = Math.PI / 2; g.add(head);
    for (const zz of [0.045, 0.075]) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.009), keyMat);
      tooth.position.set(0.014, 0, zz); g.add(tooth);
    }
    g.position.set(x, y, z);
    g.rotation.y = 0.6;
    g.visible = visible;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(g);
    return { mesh: g, position: new THREE.Vector3(x * SCALE, y * SCALE, z * SCALE), taken: false };
  }

  function note(x, y, z, text, number, rotX = -Math.PI / 2, rotY = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.36), paperMat);
    m.position.set(x, y, z);
    m.rotation.set(rotX, rotY, 0.2);
    m.receiveShadow = true;
    group.add(m);
    return {
      mesh: m,
      position: new THREE.Vector3(x * SCALE, y * SCALE, z * SCALE),
      text,
      number,
      read: false,
    };
  }

  /* ---- Cofre sobre o criado-mudo (quarto, andar de cima) --------------- */
  const safe = new THREE.Group();
  // topo do criado-mudo: uy(3) + 0,62 + 0,025; meio do cofre: +0,18
  safe.position.set(3.1, 3.825, -2.9);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.34), steel);
  safe.add(shell);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.02), dark);
  rim.position.z = 0.175; safe.add(rim);
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.22, 0, 0.18); // dobradiça na esquerda
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.34, 0.025), steel);
  door.position.x = 0.22; doorPivot.add(door);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), dark);
  dial.position.set(0.3, 0.02, 0.015); doorPivot.add(dial);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), tip);
  handle.position.set(0.36, -0.07, 0.02); doorPivot.add(handle);
  safe.add(doorPivot);
  safe.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.add(safe);

  // Única pilha do jogo: em cima do guarda-roupa do segundo quarto.
  // O topo do móvel fica em y = 3 + 1,8 = 4,8; a caixa assenta logo acima.
  const batteries = [
    battery(-6.05, 0.45, 4.84, -0.35),
  ];

  // a chave fica dentro do cofre até ele ser aberto
  const keyItem = key(3.1, 3.825, -2.79, false);

  // Uma folha só, pregada na parede da divisão, do lado do quarto.
  // Os quatro dígitos vão entre as palavras, destacados um a um.
  const papers = [
    note(-0.578, 4.45, -2.75,
      'Deixei a chave no cofre do criado-mudo. Para abrir, siga a ordem: ' +
      'primeiro {{7}}, depois {{3}}, a seguir {{9}} e por último {{1}}. ' +
      'Está tudo aqui, numa folha só.', SAFE_CODE, 0, Math.PI / 2),
  ];

  // cadeado na porta de saída
  const padlock = new THREE.Group();
  const padBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.045), dark);
  padlock.add(padBody);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.01, 6, 14, Math.PI), tip);
  shackle.position.y = 0.06; padlock.add(shackle);
  padlock.position.set(-1.45, 1.02, 3.52);
  padlock.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.add(padlock);

  return {
    group,
    batteries,
    key: keyItem,
    papers,
    safe: {
      group: safe,
      door: doorPivot,
      position: new THREE.Vector3(3.1 * SCALE, 3.825 * SCALE, -2.9 * SCALE),
      open: false,
    },
    padlock,
  };
}
