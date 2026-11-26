import * as THREE from 'three';
import { SCALE } from './room.js';

export const BATTERY_SECONDS = 120;
export const MAX_SPARES = 3;

/* Objetos escondidos: pilhas, a chave do cadeado, papéis com pistas
   e o próprio cadeado na porta de saída. Tudo em coordenadas da casa
   (BASE), escalado junto com ela. */

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

export function createItems(scene) {
  const group = new THREE.Group();
  group.scale.setScalar(SCALE);
  scene.add(group);

  const wrap = new THREE.MeshStandardMaterial({ color: 0x8b6f42, roughness: 0.75, metalness: 0.2 });
  const tip = new THREE.MeshStandardMaterial({ color: 0xb9b5a4, roughness: 0.35, metalness: 0.75 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24261f, roughness: 0.9 });
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x9a947e, roughness: 0.4, metalness: 0.8 });
  const paperMat = new THREE.MeshStandardMaterial({
    map: paperTexture(), roughness: 1, side: THREE.DoubleSide,
  });

  function battery(x, z, y = 0.05, rot = 0) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.11, 12), wrap);
    body.rotation.z = Math.PI / 2; g.add(body);
    const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.014, 10), tip);
    nub.rotation.z = Math.PI / 2; nub.position.x = 0.061; g.add(nub);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.022, 12), dark);
    band.rotation.z = Math.PI / 2; band.position.x = -0.028; g.add(band);
    g.position.set(x, y, z);
    g.rotation.set(Math.PI / 2, rot, 0);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(g);
    return { mesh: g, position: new THREE.Vector3(x * SCALE, y * SCALE, z * SCALE), taken: false };
  }

  function key(x, y, z) {
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
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(g);
    return { mesh: g, position: new THREE.Vector3(x * SCALE, y * SCALE, z * SCALE), taken: false };
  }

  function note(x, y, z, text, rotX = -Math.PI / 2, rotY = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.36), paperMat);
    m.position.set(x, y, z);
    m.rotation.set(rotX, rotY, 0.2);
    m.receiveShadow = true;
    group.add(m);
    return {
      mesh: m,
      position: new THREE.Vector3(x * SCALE, y * SCALE, z * SCALE),
      text,
      read: false,
    };
  }

  // três pilhas, bem escondidas
  const batteries = [
    battery(2.15, -3.15, 0.05, 0.4),       // atrás da caldeira
    battery(2.72, 1.95, 0.05, -0.8),       // na ponta da bancada
    battery(2.1, -2.6, 3.06, 1.2),         // debaixo da cama, no quarto
  ];

  // a chave do cadeado, ao lado da cama
  const keyItem = key(0.62, 3.06, -3.12);

  // papéis com pistas
  const papers = [
    note(0.95, 0.02, 2.6, '“Três pilhas. Escondi onde a luz não chega.”'),
    note(-2.15, 0.02, 3.05, '“O cadeado não cede. A chave subiu com ele.”'),
    note(2.15, 2.12, -3.46, '“A lâmpada pisca de 30 em 30. Eu contava com ela.”', 0, 0),
    note(-2.0, 3.02, -2.9, '“Quando a luz acaba, ele deixa de ter medo de você.”'),
    note(1.05, 3.02, -1.35, '“O sangue na cama não era meu. Ainda bem.”'),
  ];

  // cadeado na porta de saída
  const padlock = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.045), dark);
  padlock.add(body);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.01, 6, 14, Math.PI), tip);
  shackle.position.y = 0.06; padlock.add(shackle);
  padlock.position.set(-1.45, 1.02, 3.52);
  padlock.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.add(padlock);

  return { group, batteries, key: keyItem, papers, padlock };
}
