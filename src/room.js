import * as THREE from 'three';
import { rng } from './textures.js';

/* ------------------------------------------------------------------ *
 *  O porão. Tudo e construido com geometria simples + as texturas
 *  procedurais, mas com atencao a escala, sujeira e quebra de linhas
 *  retas — e o que faz um cenario parecer "real".
 * ------------------------------------------------------------------ */

// A casa é montada em coordenadas BASE e escalada por SCALE.
// Tamanho normal: o jogador (1,62 m) e os móveis estão na mesma escala.
export const SCALE = 1;
const BASE = { w: 13.2, d: 7.2, h: 3.0, wall: 0.22 };
export const ROOM = {
  w: BASE.w * SCALE,
  d: BASE.d * SCALE,
  h: BASE.h * SCALE,
  wall: BASE.wall * SCALE,
};

export function createRoom(scene, tex) {
  const group = new THREE.Group();
  group.scale.setScalar(SCALE);
  scene.add(group);

  const colliders = [];
  const anim = [];
  const r = rng(9042);

  const wallMat = new THREE.MeshStandardMaterial({ ...tex.wall, color: 0xb8b8ac, roughness: 1, normalScale: new THREE.Vector2(1.1, 1.1) });
  const ceilMat = new THREE.MeshStandardMaterial({ ...tex.wall, color: 0x77776c, roughness: 1, normalScale: new THREE.Vector2(0.8, 0.8) });
  const floorMat = new THREE.MeshStandardMaterial({ ...tex.floor, color: 0xa8a49a, roughness: 1, normalScale: new THREE.Vector2(1.25, 1.25) });
  const woodMat = new THREE.MeshStandardMaterial({ ...tex.wood, color: 0xb5a99a, roughness: 1, normalScale: new THREE.Vector2(1, 1) });
  const darkWoodMat = new THREE.MeshStandardMaterial({ ...tex.wood, color: 0x6c6154, roughness: 1 });
  const metalMat = new THREE.MeshStandardMaterial({ ...tex.metal, color: 0x9a9c93, metalness: 0.55, roughness: 0.85, normalScale: new THREE.Vector2(1, 1) });
  const blackMetal = new THREE.MeshStandardMaterial({ color: 0x1d211e, metalness: 0.5, roughness: 0.65 });
  const cardboard = new THREE.MeshStandardMaterial({ color: 0x6b5f45, roughness: 1 });
  const cardboardDark = new THREE.MeshStandardMaterial({ color: 0x4d4533, roughness: 1 });
  const brick = new THREE.MeshStandardMaterial({ color: 0x60493d, roughness: 1 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x77847a, metalness: 0.15, roughness: 0.22, transparent: true, opacity: 0.38, depthWrite: false });
  const liquid = new THREE.MeshStandardMaterial({ color: 0x7a8c78, metalness: 0.15, roughness: 0.18, transparent: true, opacity: 0.55, depthWrite: false });
  const webMat = new THREE.MeshBasicMaterial({ map: tex.cobweb, color: 0x9aa08f, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const stainMat = new THREE.MeshStandardMaterial({ map: tex.stain, transparent: true, opacity: 0.85, depthWrite: false, roughness: 1, color: 0x6d725f, side: THREE.DoubleSide });
  const bloodMat = new THREE.MeshStandardMaterial({ map: tex.stain, transparent: true, opacity: 0.9, depthWrite: false, roughness: 1, color: 0x651a14, side: THREE.DoubleSide });
  const ceramic = new THREE.MeshStandardMaterial({ color: 0xb9b9ad, roughness: 0.5 });
  // Superfícies queimadas, mofo, ferrugem e o plástico dos corpos do sótão.
  const sootMat = new THREE.MeshStandardMaterial({ map: tex.stain, transparent: true, opacity: 0.82, depthWrite: false, roughness: 1, color: 0x121310, side: THREE.DoubleSide });
  const rustMat = new THREE.MeshStandardMaterial({ map: tex.stain, transparent: true, opacity: 0.72, depthWrite: false, roughness: 1, color: 0x6b321d, side: THREE.DoubleSide });
  const mildewMat = new THREE.MeshStandardMaterial({ map: tex.stain, transparent: true, opacity: 0.78, depthWrite: false, roughness: 1, color: 0x35452c, side: THREE.DoubleSide });
  const burntMat = new THREE.MeshStandardMaterial({ ...tex.metal, color: 0x191c18, roughness: 1, metalness: 0.35 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2924, roughness: 1 });
  const bagMat = new THREE.MeshStandardMaterial({
    color: 0xb8b9ad, roughness: 0.42, metalness: 0.05,
    transparent: true, opacity: 0.52, depthWrite: false, side: THREE.DoubleSide,
  });
  const flyBodyMat = new THREE.MeshStandardMaterial({ color: 0x0b0d0b, roughness: 0.75 });
  const flyWingMat = new THREE.MeshStandardMaterial({
    color: 0xb7b6a8, roughness: 0.3, transparent: true, opacity: 0.38,
    depthWrite: false, side: THREE.DoubleSide,
  });

  function register(mesh, cast = true, receive = true) {
    mesh.castShadow = cast; mesh.receiveShadow = receive;
    group.add(mesh);
    return mesh;
  }

  function addCollider(x, z, w, d, rotY = 0, minY = 0, maxY = h) {
    const ex = Math.abs(Math.cos(rotY)) * w / 2 + Math.abs(Math.sin(rotY)) * d / 2;
    const ez = Math.abs(Math.sin(rotY)) * w / 2 + Math.abs(Math.cos(rotY)) * d / 2;
    colliders.push({ minX: x - ex, maxX: x + ex, minZ: z - ez, maxZ: z + ez, minY, maxY });
  }

  function box(mat, w, h, d, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (opts.rotY) m.rotation.y = opts.rotY;
    if (opts.rotX) m.rotation.x = opts.rotX;
    if (opts.rotZ) m.rotation.z = opts.rotZ;
    register(m, opts.cast !== false, opts.receive !== false);
    if (opts.collide) addCollider(x, z, w, d, opts.rotY || 0, opts.minY ?? 0, opts.maxY ?? h);
    return m;
  }

  /** laje horizontal: up=true é piso, up=false é teto */
  function slab(mat, x0, x1, z0, z1, y, up = false) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat);
    m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
    m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    m.receiveShadow = true; group.add(m);
    return m;
  }

  /** Piso do andar de cima com espessura: nada de planos sobrepostos. */
  function upperFloor(mat, x0, x1, z0, z1, y) {
    const thick = 0.1;
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, thick, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, y - thick / 2, (z0 + z1) / 2);
    m.receiveShadow = true; group.add(m);
    return m;
  }

  function cyl(mat, radius, height, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, opts.segs || 16), mat);
    m.position.set(x, y, z);
    if (opts.axis === 'x') m.rotation.z = Math.PI / 2;
    if (opts.axis === 'z') m.rotation.x = Math.PI / 2;
    if (opts.rot) m.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
    register(m);
    return m;
  }

  /** Mancha ou fuligem colada numa parede/piso, sem virar objeto sólido. */
  function decal(mat, w, hh, x, y, z, rotX = 0, rotY = 0, rotZ = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), mat);
    m.position.set(x, y, z);
    m.rotation.set(rotX, rotY, rotZ);
    group.add(m);
    return m;
  }

  /** Escada aberta: rampa sólida e degraus finos, sem espetos na lateral. */
  function buildStair(x0, x1, z0, z1, yBottom, yTop, n) {
    const run = z1 - z0, rise = yTop - yBottom;
    const slope = Math.atan2(rise, run);
    const rampLen = Math.hypot(run, rise);
    box(darkWoodMat, x1 - x0 - 0.06, 0.12, rampLen,
      (x0 + x1) / 2, yBottom + rise / 2 - 0.06, (z0 + z1) / 2,
      { rotX: slope, cast: false });
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const zFront = z1 - t0 * run, zBack = z1 - t1 * run;
      const top = yBottom + Math.max(0.06, rise * t1);
      box(darkWoodMat, x1 - x0 - 0.06, 0.06, zFront - zBack,
        (x0 + x1) / 2, top - 0.03, (zFront + zBack) / 2, { cast: false });
    }
  }

  /* ---- Estrutura ---------------------------------------------------- */
  const { w, d, h, wall } = BASE;
  const hw = w / 2, hd = d / 2;

  // vão da escada: o teto do porão é o piso do andar de cima
  const stairX0 = -3.85, stairX1 = -2.65;
  const stairZ0 = -1.75, stairZ1 = 2.85;
  const upperY = h;

  // segunda escada: sobe do andar de cima para o sótão
  const atticX0 = 4.35, atticX1 = 5.55;
  const atticZ0 = -3.0, atticZ1 = 1.0;
  const atticY = upperY + h;
  const atticH = 2.2;
  const steps = 30;

  // Barreiras invisíveis nas laterais dos vãos, apenas nos andares altos.
  // Não são madeiras visíveis na escada: só impedem entrar de lado no buraco.
  const guardTop = atticY + atticH;
  const g1z0 = stairZ0 + 0.35, g1z1 = stairZ1 - 0.55;
  for (const gx of [stairX0, stairX1]) {
    addCollider(gx, (g1z0 + g1z1) / 2, 0.1, g1z1 - g1z0, 0, upperY, guardTop);
  }
  const g2z0 = atticZ0 + 0.35, g2z1 = atticZ1 - 0.55;
  for (const gx of [atticX0, atticX1]) {
    addCollider(gx, (g2z0 + g2z1) / 2, 0.1, g2z1 - g2z0, 0, upperY, guardTop);
  }

  slab(floorMat, -hw, hw, -hd, hd, 0, true);

  // Dois vãos: a escada do porão e a escada do sótão. As lajes são recortadas
  // para as duas rampas passarem sem atravessar o piso de cima.
  const slabs = [
    [-hw, stairX0, -hd, hd],
    [stairX0, stairX1, -hd, stairZ0],
    [stairX0, stairX1, stairZ1, hd],
    [stairX1, atticX0, -hd, hd],
    [atticX0, atticX1, -hd, atticZ0],
    [atticX0, atticX1, atticZ1, hd],
    [atticX1, hw, -hd, hd],
  ];
  for (const [x0, x1, z0, z1] of slabs) {
    // teto do porão fica logo abaixo da laje, sem planos na mesma altura
    slab(ceilMat, x0, x1, z0, z1, upperY - 0.12, false);
    // piso do andar de cima: laje sólida, sem z-fighting nem falhas
    upperFloor(floorMat, x0, x1, z0, z1, upperY);
  }
  // O teto do andar de cima é o piso do sótão, com vão para a segunda escada.
  const atticSlabs = [
    [-hw, atticX0, -hd, hd],
    [atticX1, hw, -hd, hd],
    [atticX0, atticX1, -hd, atticZ0],
    [atticX0, atticX1, atticZ1, hd],
  ];
  for (const [x0, x1, z0, z1] of atticSlabs) {
    slab(ceilMat, x0, x1, z0, z1, atticY - 0.12, false);
    upperFloor(floorMat, x0, x1, z0, z1, atticY);
  }

  // paredes laterais e da frente (a de traz e recortada pela janela)
  box(wallMat, wall, h, d, -hw, h / 2, 0, { collide: true });
  box(wallMat, wall, h, d, hw, h / 2, 0, { collide: true });
  box(wallMat, w, h, wall, 0, h / 2, hd, { collide: true });

  // parede de traz com vao da janela (x = 1.55, y = 2.12)
  const wx = 1.55, wy = 2.12, ww = 1.3, wh = 0.78;
  const wl = wx - ww / 2, wr = wx + ww / 2, wb = wy - wh / 2, wt = wy + wh / 2;
  box(wallMat, wl + hw, h, wall, (-hw + wl) / 2, h / 2, -hd, { collide: true });
  box(wallMat, hw - wr, h, wall, (wr + hw) / 2, h / 2, -hd, { collide: true });
  box(wallMat, ww, wb, wall, wx, wb / 2, -hd, { collide: true });
  box(wallMat, ww, h - wt, wall, wx, (wt + h) / 2, -hd, { collide: true });

  // o mundo la fora: quase nada, apenas um cinza morto
  const outside = new THREE.Mesh(
    new THREE.PlaneGeometry(ww, wh),
    new THREE.MeshBasicMaterial({ color: 0x0c1211, fog: false })
  );
  outside.position.set(wx, wy, -hd - 0.13); group.add(outside);
  // grade
  for (let i = 0; i <= 3; i++) {
    cyl(blackMetal, 0.018, wh, wl + (ww / 3) * i, wy, -hd + 0.03, { segs: 8 });
  }
  box(blackMetal, ww, 0.035, 0.035, wx, wy + wh * 0.05, -hd + 0.03);
  box(blackMetal, ww, 0.035, 0.035, wx, wy - wh * 0.3, -hd + 0.03);
  box(darkWoodMat, ww + 0.14, 0.07, 0.16, wx, wb - 0.02, -hd + 0.06); // peitoril
  box(darkWoodMat, ww + 0.14, 0.06, 0.12, wx, wt + 0.03, -hd + 0.06);

  // porta fechada na parede da frente
  const dx = -1.85, dw = 1.12, dh = 2.18;
  box(darkWoodMat, dw + 0.2, dh + 0.16, 0.1, dx, (dh + 0.16) / 2, hd - 0.14);
  const door = box(woodMat, dw, dh, 0.07, dx, dh / 2, hd - 0.2, { collide: true });
  for (const yy of [0.55, 1.12, 1.69]) {
    box(darkWoodMat, dw * 0.72, 0.5, 0.012, dx, yy, hd - 0.155, { cast: false });
  }
  cyl(metalMat, 0.055, 0.035, dx + dw * 0.36, 1.02, hd - 0.13, { axis: 'z', segs: 12 });
  // frestas de luz nula ao redor da porta
  box(blackMetal, dw + 0.02, dh + 0.02, 0.01, dx, dh / 2, hd - 0.16, { cast: false });
  void door;

  // rodapés de madeira podre
  box(darkWoodMat, w, 0.14, 0.05, 0, 0.07, -hd + 0.14, { cast: false });
  box(darkWoodMat, w, 0.14, 0.05, 0, 0.07, hd - 0.14, { cast: false });
  box(darkWoodMat, 0.05, 0.14, d, -hw + 0.14, 0.07, 0, { cast: false });
  box(darkWoodMat, 0.05, 0.14, d, hw - 0.14, 0.07, 0, { cast: false });

  /* ---- Cozinha no porão (ala esquerda) ------------------------------- */
  // Vão amplo na frente, junto da boca da escada. A cozinha aparece assim que
  // o jogador entra, em vez de ficar escondida atrás do topo da escada.
  const kitX = -4.2, kitDoorZ0 = 2.05, kitDoorZ1 = 3.15;
  box(wallMat, wall, h, kitDoorZ0 + hd, kitX, h / 2, (-hd + kitDoorZ0) / 2, { collide: true });
  box(wallMat, wall, h, hd - kitDoorZ1, kitX, h / 2, (kitDoorZ1 + hd) / 2, { collide: true });
  box(wallMat, wall, h - 2.0, kitDoorZ1 - kitDoorZ0, kitX, 2.0 + (h - 2.0) / 2,
    (kitDoorZ0 + kitDoorZ1) / 2, { collide: true, minY: 2.0, maxY: h });
  // Azulejos fuliginados nos dois lados do vão; não há folha de porta.
  for (const side of [-1, 1]) {
    decal(sootMat, kitDoorZ1 - kitDoorZ0, 2.05,
      kitX + side * (wall / 2 + 0.012), 1.03, (kitDoorZ0 + kitDoorZ1) / 2,
      0, side * Math.PI / 2, 0);
    decal(rustMat, 0.16, 2.0,
      kitX + side * (wall / 2 + 0.018), 1.0, kitDoorZ0 + 0.06,
      0, side * Math.PI / 2, 0);
  }
  for (const zz of [kitDoorZ0 + 0.04, kitDoorZ1 - 0.04]) {
    box(burntMat, 0.12, 2.02, 0.07, kitX + 0.09, 1.01, zz, { cast: false });
  }
  box(burntMat, 0.12, 0.1, kitDoorZ1 - kitDoorZ0, kitX + 0.09, 2.01,
    (kitDoorZ0 + kitDoorZ1) / 2, { cast: false });

  /* ---- Bancada, pia, fogão, armário e geladeira queimados ------------- */
  box(darkWoodMat, 0.6, 0.85, 2.4, -6.15, 0.43, 0.9, { collide: true, maxY: 0.9 });
  box(burntMat, 0.62, 0.05, 2.4, -6.15, 0.87, 0.9);
  decal(sootMat, 0.55, 0.62, -6.15, 0.904, 1.6, -Math.PI / 2, 0, 0.22);
  decal(rustMat, 0.45, 0.4, -6.15, 0.904, 0.35, -Math.PI / 2, 0, -0.3);
  // Pia entupida e com água escura.
  box(metalMat, 0.5, 0.025, 0.48, -6.15, 0.91, 0.2, { cast: false });
  cyl(metalMat, 0.02, 0.22, -6.15, 1.04, 0.2, { segs: 8 });
  const sinkWater = new THREE.Mesh(new THREE.CircleGeometry(0.19, 20), liquid);
  sinkWater.rotation.x = -Math.PI / 2; sinkWater.position.set(-6.15, 0.925, 0.2);
  sinkWater.receiveShadow = true; group.add(sinkWater);
  anim.push((t) => { sinkWater.material.opacity = 0.48 + Math.sin(t * 0.5) * 0.03; });

  // Fogão: tampo preto, bocas uma mais torta que a outra e forno aberto.
  box(burntMat, 0.62, 0.08, 0.76, -6.15, 0.92, 1.6);
  for (const [bx, bz, tilt] of [[-6.3, 1.4, 0], [-6.0, 1.4, 0.12], [-6.3, 1.8, -0.1], [-6.0, 1.8, 0.3]]) {
    const burner = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 6, 18), blackMetal);
    burner.position.set(bx, 0.97, bz);
    burner.rotation.set(Math.PI / 2, 0, tilt);
    register(burner);
  }
  box(blackMetal, 0.035, 0.58, 0.7, -5.83, 0.44, 1.6);
  box(burntMat, 0.04, 0.035, 0.56, -5.8, 0.6, 1.6, { cast: false });
  decal(sootMat, 1.5, 1.3, -hw + 0.125, 1.55, 1.6, 0, Math.PI / 2, 0);
  decal(rustMat, 0.8, 0.3, -hw + 0.127, 0.48, 1.6, 0, Math.PI / 2, 0);
  // Exaustor derretido e duto até o teto.
  box(burntMat, 0.52, 0.2, 0.72, -6.15, 1.72, 1.6);
  cyl(burntMat, 0.09, 1.0, -6.15, 2.32, 1.6, { segs: 12 });
  decal(sootMat, 0.6, 0.5, -hw + 0.128, 2.2, 1.6, 0, Math.PI / 2, 0);

  // Armário superior: porta queimada, pendurada de um lado só.
  box(darkWoodMat, 0.38, 0.72, 1.1, -6.36, 1.85, 0.35,
    { collide: true, minY: 1.45, maxY: 2.25 });
  box(burntMat, 0.04, 0.64, 0.5, -6.14, 1.85, 0.62, { rotY: -0.35, cast: false });
  decal(mildewMat, 0.34, 0.62, -6.15, 1.85, 0.08, 0, Math.PI / 2, 0);
  cyl(blackMetal, 0.018, 0.24, -6.02, 1.85, 0.62, { axis: 'z', segs: 8 });

  // Geladeira com ferrugem, porta empenada e puxador arrancado.
  box(metalMat, 0.7, 1.8, 0.7, -6.1, 0.9, 2.6, { collide: true, maxY: 1.8 });
  decal(rustMat, 0.46, 0.92, -5.74, 1.13, 2.6, 0, Math.PI / 2, 0.04);
  decal(mildewMat, 0.28, 0.3, -5.735, 0.5, 2.75, 0, Math.PI / 2, 0);
  decal(sootMat, 0.72, 0.72, -6.1, 1.81, 2.6, -Math.PI / 2, 0, 0.1);
  box(burntMat, 0.035, 0.42, 0.035, -5.72, 1.28, 2.38, { cast: false });
  box(blackMetal, 0.02, 0.06, 0.12, -5.72, 1.07, 2.38, { cast: false });

  // Mesa suja, com pratos e panelas largadas.
  box(darkWoodMat, 1.1, 0.08, 0.9, -5.0, 0.78, 1.4, { collide: true, maxY: 0.85 });
  for (const [mx, mz] of [[-5.45, 1.05], [-4.55, 1.05], [-5.45, 1.75], [-4.55, 1.75]]) {
    box(darkWoodMat, 0.07, 0.75, 0.07, mx, 0.38, mz);
  }
  decal(rustMat, 0.7, 0.5, -5.0, 0.825, 1.4, -Math.PI / 2, 0, 0.4);
  cyl(ceramic, 0.16, 0.018, -5.2, 0.84, 1.25, { segs: 18 });
  cyl(blackMetal, 0.12, 0.1, -4.8, 0.87, 1.6, { segs: 16 });

  /* ---- Banheiro dentro da cozinha ------------------------------------ */
  // Canto de trás da cozinha: x -6,6..-5,2 e z -3,6..-1,3. A porta fica na
  // parede lateral, para a bancada não estreitar a passagem.
  const bathX = -5.2, bathZ = -1.3, bathDoorZ0 = -2.6, bathDoorZ1 = -1.5;
  box(wallMat, bathX + hw, h, wall, (-hw + bathX) / 2, h / 2, bathZ, { collide: true });
  box(wallMat, wall, h, bathDoorZ0 + hd, bathX, h / 2, (-hd + bathDoorZ0) / 2, { collide: true });
  box(wallMat, wall, h, bathZ - bathDoorZ1, bathX, h / 2, (bathDoorZ1 + bathZ) / 2, { collide: true });
  box(wallMat, wall, h - 2.0, bathDoorZ1 - bathDoorZ0, bathX,
    2.0 + (h - 2.0) / 2, (bathDoorZ0 + bathDoorZ1) / 2,
    { collide: true, minY: 2.0, maxY: h });
  // Folha da porta, encostada na parede do banheiro (vão livre para passar).
  box(woodMat, 0.05, 1.95, 0.9, bathX + 0.12, 0.98, bathDoorZ1 - 0.12,
    { rotY: 1.15, cast: false });
  // Sanitário, lavatório e o tanque do chuveiro.
  box(metalMat, 0.42, 0.4, 0.55, -6.1, 0.2, -3.0, { collide: true, maxY: 0.45 });
  cyl(ceramic, 0.23, 0.06, -6.1, 0.43, -2.95, { segs: 18 });
  box(woodMat, 0.5, 0.12, 0.38, -5.55, 0.85, -3.2, { collide: true, maxY: 0.95 });
  cyl(metalMat, 0.022, 0.18, -5.55, 0.98, -3.2, { segs: 8 });
  for (const [fx, fz] of [[-6.25, -2.0], [-5.75, -2.0]]) {
    cyl(metalMat, 0.012, 1.6, fx, 1.6, fz, { segs: 6 });
  }
  cyl(blackMetal, 0.16, 0.02, -6.0, 0.02, -2.0, { segs: 18 });
  // Mofo, ferrugem e água parada: o banheiro está tão sujo quanto a cozinha.
  decal(mildewMat, 1.1, 1.4, -hw + 0.125, 1.35, -2.1, 0, Math.PI / 2, 0);
  decal(rustMat, 0.5, 0.9, bathX - wall / 2 - 0.013, 1.3, -2.9, 0, -Math.PI / 2, 0);
  decal(mildewMat, 0.6, 0.5, -5.9, 0.015, -2.45, -Math.PI / 2, 0, 0.2);
  const toiletWater = new THREE.Mesh(new THREE.CircleGeometry(0.16, 18), liquid);
  toiletWater.rotation.x = -Math.PI / 2; toiletWater.position.set(-6.1, 0.462, -2.95);
  toiletWater.receiveShadow = true; group.add(toiletWater);
  const showerCurtain = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.35), mildewMat);
  showerCurtain.position.set(-5.78, 1.15, -2.0);
  showerCurtain.rotation.set(0, -Math.PI / 2, 0.12);
  group.add(showerCurtain);
  cyl(rustMat, 0.035, 0.12, -6.02, 1.92, -2.0, { segs: 10 });
  box(cardboardDark, 0.42, 0.03, 0.28, -5.55, 0.98, -3.2, { cast: false });

  /* ---- Escada do porão ao andar de cima ------------------------------ */
  buildStair(stairX0, stairX1, stairZ0, stairZ1, 0, upperY, steps);
  // Sem madeiras/corrimão nas laterais: a escada fica aberta, com o último
  // degrau rente ao piso do andar de cima.

  /* ---- Andar de cima: corredor + quarto ------------------------------ */
  const uy = upperY, uh = h;

  // paredes externas do andar de cima
  box(wallMat, wall, uh, d, -hw, uy + uh / 2, 0, { collide: true, minY: uy, maxY: uy + uh });
  box(wallMat, wall, uh, d, hw, uy + uh / 2, 0, { collide: true, minY: uy, maxY: uy + uh });
  box(wallMat, w, uh, wall, 0, uy + uh / 2, hd, { collide: true, minY: uy, maxY: uy + uh });
  box(wallMat, w, uh, wall, 0, uy + uh / 2, -hd, { collide: true, minY: uy, maxY: uy + uh });

  // divisão corredor/quarto: vão livre, sem porta nem batente.
  // A única porta da casa é a de saída, lá embaixo.
  const px = -0.7, passZ0 = -1.4, passZ1 = -0.3;
  box(wallMat, wall, uh, passZ0 + hd, px, uy + uh / 2, (-hd + passZ0) / 2,
    { collide: true, minY: uy, maxY: uy + uh });
  box(wallMat, wall, uh, 1.2 - passZ1, px, uy + uh / 2, (passZ1 + 1.2) / 2,
    { collide: true, minY: uy, maxY: uy + uh });
  box(wallMat, wall, uh - 2.0, passZ1 - passZ0, px, uy + 2.0 + (uh - 2.0) / 2, (passZ0 + passZ1) / 2,
    { collide: true, minY: uy + 2.0, maxY: uy + uh });

  // frente do quarto (o corredor segue até a parede da frente)
  box(wallMat, hw - px, uh, wall, (px + hw) / 2, uy + uh / 2, 1.2,
    { collide: true, minY: uy, maxY: uy + uh });

  // janela emparedada no quarto
  const upWin = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.7),
    new THREE.MeshBasicMaterial({ color: 0x070b09, fog: false })
  );
  upWin.position.set(2.3, uy + 2.15, -hd + 0.13); group.add(upWin);
  for (let i = 0; i < 3; i++) {
    box(darkWoodMat, 1.22, 0.11, 0.06, 2.3, uy + 1.87 + i * 0.28, -hd + 0.17, { cast: false });
  }

  // cama, criado-mudo e guarda-roupa
  box(darkWoodMat, 1.5, 0.28, 2.1, 1.6, uy + 0.14, -2.2,
    { collide: true, minY: uy, maxY: uy + 1.2 });
  box(cardboard, 1.36, 0.22, 1.95, 1.6, uy + 0.39, -2.2);
  box(cardboardDark, 0.7, 0.12, 0.34, 1.6, uy + 0.56, -3.0);
  box(darkWoodMat, 1.36, 0.03, 1.15, 1.6, uy + 0.53, -1.85);
  box(darkWoodMat, 0.55, 0.6, 0.5, 3.1, uy + 0.3, -2.9,
    { collide: true, minY: uy, maxY: uy + 0.8 });
  box(woodMat, 0.6, 0.05, 0.55, 3.1, uy + 0.62, -2.9);
  box(darkWoodMat, 0.9, 1.9, 1.2, 6.0, uy + 0.95, -0.6,
    { collide: true, minY: uy, maxY: uy + 2 });
  box(woodMat, 0.035, 1.7, 0.5, 5.53, uy + 0.95, -0.6, { cast: false });

  /* ---- Segundo quarto (ala esquerda do andar de cima) ---------------- */
  // Vão largo no topo da escada, sem porta, sem batente e sem folha: o quarto
  // continua sendo um cômodo, mas não há nada que feche a passagem.
  const bed2DoorZ0 = -3.4, bed2DoorZ1 = -1.85;
  box(wallMat, wall, uh, bed2DoorZ0 + hd, kitX, uy + uh / 2, (-hd + bed2DoorZ0) / 2,
    { collide: true, minY: uy, maxY: uy + uh });
  box(wallMat, wall, uh, hd - bed2DoorZ1, kitX, uy + uh / 2, (bed2DoorZ1 + hd) / 2,
    { collide: true, minY: uy, maxY: uy + uh });
  box(wallMat, wall, uh - 2.0, bed2DoorZ1 - bed2DoorZ0, kitX, uy + 2.0 + (uh - 2.0) / 2,
    (bed2DoorZ0 + bed2DoorZ1) / 2, { collide: true, minY: uy + 2.0, maxY: uy + uh });
  for (const side of [-1, 1]) {
    decal(sootMat, bed2DoorZ1 - bed2DoorZ0, 2.0,
      kitX + side * (wall / 2 + 0.012), uy + 1.0, (bed2DoorZ0 + bed2DoorZ1) / 2,
      0, side * Math.PI / 2, 0);
  }
  decal(mildewMat, 0.6, 0.8, -hw + 0.125, uy + 1.45, -0.5, 0, Math.PI / 2, 0);
  decal(bloodMat, 0.75, 0.55, -5.1, uy + 0.014, -0.75, -Math.PI / 2, 0, 0.4);
  // frente do segundo quarto
  box(wallMat, kitX + hw, uh, wall, (kitX - hw) / 2, uy + uh / 2, 1.2,
    { collide: true, minY: uy, maxY: uy + uh });
  // cama estreita com o colchão afundado
  box(darkWoodMat, 1.2, 0.26, 1.9, -5.5, uy + 0.13, -2.4,
    { collide: true, minY: uy, maxY: uy + 1.1 });
  box(cardboard, 1.1, 0.2, 1.8, -5.5, uy + 0.36, -2.4);
  box(cardboardDark, 0.62, 0.1, 0.34, -5.5, uy + 0.5, -3.0);
  decal(sootMat, 0.8, 0.55, -5.5, uy + 0.468, -2.35, -Math.PI / 2, 0, 0.25);
  // Guarda-roupa alto: a única pilha do jogo fica em cima dele.
  box(darkWoodMat, 0.85, 1.72, 0.55, -6.05, uy + 0.86, 0.45,
    { collide: true, minY: uy, maxY: uy + 1.8 });
  box(woodMat, 0.9, 0.08, 0.6, -6.05, uy + 1.76, 0.45);
  box(woodMat, 0.04, 1.5, 0.42, -5.61, uy + 0.86, 0.58,
    { rotY: -0.42, cast: false });
  box(burntMat, 0.04, 1.5, 0.16, -5.62, uy + 0.86, 0.2, { cast: false });
  cyl(metalMat, 0.012, 0.16, -5.55, uy + 1.0, 0.63, { axis: 'z', segs: 8 });
  decal(mildewMat, 0.5, 0.7, -5.6, uy + 1.05, 0.42, 0, Math.PI / 2, 0);
  // mala e caixa virada, para o quarto não ficar vazio
  box(cardboardDark, 0.72, 0.32, 0.42, -6.2, uy + 0.16, 1.15,
    { collide: true, minY: uy, maxY: uy + 0.4, rotY: 0.2 });
  box(darkWoodMat, 0.5, 0.4, 0.42, -6.1, uy + 0.2, -1.0,
    { collide: true, minY: uy, maxY: uy + 0.45, rotY: -0.3 });

  /* ---- Escada do sótão, no canto direito do quarto -------------------- */
  // Sem porta separada: a escada fica no mesmo quarto, com a boca rente à
  // parede da frente. O guarda-roupa foi para o canto, deixando a passagem.
  buildStair(atticX0, atticX1, atticZ0, atticZ1, upperY, atticY, steps);

  /* ---- Sótão: móveis quebrados, sacos e moscas ------------------------ */
  const ay = atticY, ah = atticH;
  box(wallMat, wall, ah, d, -hw, ay + ah / 2, 0, { collide: true, minY: ay, maxY: ay + ah });
  box(wallMat, wall, ah, d, hw, ay + ah / 2, 0, { collide: true, minY: ay, maxY: ay + ah });
  box(wallMat, w, ah, wall, 0, ay + ah / 2, hd, { collide: true, minY: ay, maxY: ay + ah });
  box(wallMat, w, ah, wall, 0, ay + ah / 2, -hd, { collide: true, minY: ay, maxY: ay + ah });
  // vigas do telhado e algumas caixas velhas guardadas
  for (const z of [-2.6, -0.6, 1.4, 3.0]) {
    box(darkWoodMat, w - 0.4, 0.16, 0.14, 0, ay + ah - 0.16, z, { cast: false });
  }
  for (const [x, z] of [[-5.6, -2.6], [-4.8, -2.2], [6.0, 2.4], [-1.5, 2.2]]) {
    box(cardboard, 0.6, 0.5, 0.5, x, ay + 0.25, z,
      { collide: true, minY: ay, maxY: ay + 0.6 });
  }

  // Peças soltas: cada móvel é montado torto, com partes arrancadas.
  function piece(g, mat, pw, ph, pd, x, y, z, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    m.castShadow = true; m.receiveShadow = true; g.add(m);
    return m;
  }
  function brokenChair(x, z, yaw) {
    const g = new THREE.Group();
    piece(g, woodMat, 0.2, 0.05, 0.46, -0.12, 0.42, 0, 0, 0, -0.12);
    piece(g, woodMat, 0.2, 0.05, 0.46, 0.13, 0.39, 0.03, 0, 0, 0.18);
    piece(g, darkWoodMat, 0.46, 0.52, 0.05, 0.06, 0.66, -0.3, 0.9, 0, 0.2);
    piece(g, darkWoodMat, 0.045, 0.42, 0.045, -0.19, 0.21, -0.18, 0, 0, 0.12);
    piece(g, darkWoodMat, 0.045, 0.35, 0.045, 0.19, 0.18, -0.19, 0, 0, -0.35);
    piece(g, darkWoodMat, 0.045, 0.4, 0.045, -0.19, 0.2, 0.18, 0.5, 0, 0.2);
    g.position.set(x, ay + 0.02, z); g.rotation.y = yaw;
    group.add(g); addCollider(x, z, 0.7, 0.7, yaw, ay, ay + 0.8);
  }
  function brokenTable(x, z, yaw) {
    const g = new THREE.Group();
    piece(g, darkWoodMat, 0.52, 0.06, 0.8, -0.28, 0.7, 0, 0, 0, -0.08);
    piece(g, darkWoodMat, 0.5, 0.06, 0.8, 0.29, 0.64, 0.12, 0, 0, 0.14);
    piece(g, darkWoodMat, 0.07, 0.68, 0.07, -0.45, 0.34, -0.3, 0.16, 0, -0.1);
    piece(g, darkWoodMat, 0.07, 0.5, 0.07, 0.42, 0.25, 0.32, -0.4, 0, 0.3);
    piece(g, darkWoodMat, 0.07, 0.62, 0.07, 0.38, 0.31, -0.32, 0.2, 0, -0.2);
    g.position.set(x, ay + 0.02, z); g.rotation.y = yaw;
    group.add(g); addCollider(x, z, 1.15, 0.9, yaw, ay, ay + 0.8);
  }
  function brokenWardrobe(x, z, yaw) {
    const g = new THREE.Group();
    piece(g, darkWoodMat, 0.08, 1.5, 0.7, -0.38, 0.75, 0, 0, 0, -0.18);
    piece(g, darkWoodMat, 0.08, 1.25, 0.7, 0.38, 0.63, 0.05, 0.1, 0, 0.28);
    piece(g, woodMat, 0.78, 0.06, 0.68, 0, 1.44, 0, 0, 0, -0.22);
    piece(g, woodMat, 0.42, 1.3, 0.05, 0.62, 0.62, 0.5, 0.2, 0.5, 0.4);
    g.position.set(x, ay + 0.02, z); g.rotation.y = yaw;
    group.add(g); addCollider(x, z, 0.9, 0.8, yaw, ay, ay + 1.5);
  }
  brokenChair(-2.1, 0.2, 0.7);
  brokenChair(1.8, -1.7, -1.1);
  brokenTable(-0.4, 1.2, 0.35);
  brokenWardrobe(-3.6, 1.5, -0.45);

  // Corpos enrolados em sacos plásticos: o plástico semi-transparente deixa
  // entrever as roupas escuras e os nós nas duas pontas.
  const bodySpots = [
    [-2.7, -1.9, 0.35, 1],
    [1.7, 2.1, -0.55, 0.94],
    [-0.4, -2.7, 1.35, 0.88],
  ];
  function baggedBody(x, z, yaw, s) {
    const g = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 14), bodyMat);
    torso.rotation.x = Math.PI / 2; g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), bodyMat);
    head.position.z = -0.62; g.add(head);
    for (const [lx, lz] of [[-0.2, 0.22], [0.2, 0.22], [-0.14, -0.28], [0.14, -0.28]]) {
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.62, 10), bodyMat);
      limb.position.set(lx, -0.02, lz); limb.rotation.x = Math.PI / 2;
      limb.rotation.z = lx * 0.5; g.add(limb);
    }
    const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 1.18, 16), bagMat);
    bag.rotation.x = Math.PI / 2; g.add(bag);
    const bagHead = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 10), bagMat);
    bagHead.position.z = -0.62; g.add(bagHead);
    for (const zz of [-0.62, 0.6]) {
      const knot = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 6, 14), blackMetal);
      knot.position.z = zz; g.add(knot);
    }
    for (let i = 0; i < 4; i++) {
      const fold = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.012, 0.1), bagMat);
      fold.position.set((r() - 0.5) * 0.1, 0.16 + r() * 0.08, -0.4 + i * 0.27);
      fold.rotation.set((r() - 0.5) * 0.3, r() * 0.5, (r() - 0.5) * 0.4);
      g.add(fold);
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, ay + 0.29 * s, z); g.rotation.y = yaw; g.scale.setScalar(s);
    group.add(g);
    decal(bloodMat, 0.8, 0.5, x, ay + 0.012, z, -Math.PI / 2, 0, yaw);
    addCollider(x, z, 0.75 * s, 1.25 * s, yaw, ay, ay + 0.62);
  }
  for (const [x, z, yaw, s] of bodySpots) baggedBody(x, z, yaw, s);

  // Moscas em cima dos sacos: vibram as asas e fazem voltas curtas e irritadas.
  const flies = [];
  for (const [bx, bz] of bodySpots) {
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      const fly = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), flyBodyMat);
      fly.scale.set(1, 0.7, 1.6); g.add(fly);
      const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), flyWingMat);
      wingL.scale.set(1, 0.18, 0.55); wingL.position.set(-0.024, 0.012, 0); g.add(wingL);
      const wingR = wingL.clone(); wingR.position.x = 0.024; g.add(wingR);
      group.add(g);
      flies.push({
        g, wingL, wingR,
        base: new THREE.Vector3(bx + (r() - 0.5) * 0.5, ay + 0.55 + r() * 0.75, bz + (r() - 0.5) * 0.5),
        phase: r() * Math.PI * 2, speed: 1.4 + r() * 1.8, radius: 0.08 + r() * 0.22,
      });
    }
  }
  anim.push((t) => {
    for (const f of flies) {
      const a = t * f.speed + f.phase;
      f.g.position.set(
        f.base.x + Math.cos(a) * f.radius,
        f.base.y + Math.sin(a * 1.7) * 0.12,
        f.base.z + Math.sin(a) * f.radius
      );
      f.g.rotation.y = a * 1.3;
      const flap = 0.4 + Math.abs(Math.sin(t * 24 + f.phase)) * 0.9;
      f.wingL.rotation.z = flap; f.wingR.rotation.z = -flap;
    }
  });

  /* ---- Sangue na cama e nas paredes ---------------------------------- */
  function blood(w, h, x, y, z, rotX = 0, rotY = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bloodMat);
    m.position.set(x, y, z); m.rotation.set(rotX, rotY, 0);
    group.add(m);
    return m;
  }
  blood(0.8, 0.55, 1.85, uy + 0.506, -2.35, -Math.PI / 2, 0.3);
  blood(0.34, 0.24, 1.25, uy + 0.507, -1.75, -Math.PI / 2, -0.5);
  blood(0.22, 0.16, 2.15, uy + 0.507, -2.85, -Math.PI / 2, 0.9);
  blood(0.46, 0.62, 1.6, uy + 1.25, -hd + 0.13);
  blood(0.1, 0.42, 1.45, uy + 0.78, -hd + 0.132);
  blood(0.07, 0.3, 1.72, uy + 0.8, -hd + 0.132);
  blood(0.42, 0.5, px + wall / 2 + 0.012, uy + 1.1, -2.15, 0, Math.PI / 2);
  blood(0.08, 0.34, px + wall / 2 + 0.013, uy + 0.65, -2.35, 0, Math.PI / 2);

  // móvel baixo no corredor
  box(darkWoodMat, 0.7, 0.85, 0.45, -1.8, uy + 0.42, 2.75,
    { collide: true, minY: uy, maxY: uy + 1 });
  cyl(blackMetal, 0.005, 0.5, -1.4, uy + 2.5, -1.0, { segs: 6 });
  const upBulbMat = new THREE.MeshStandardMaterial({
    color: 0x4b5043, roughness: 0.4, emissive: 0x000000,
  });
  const upBulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), upBulbMat);
  upBulb.position.set(-1.4, uy + 2.22, -1.0); group.add(upBulb);
  // a lâmpada morta ainda tem um resto de corrente: pisca a cada 30 s
  const upLamp = new THREE.PointLight(0xbfc9a8, 0, 9, 2);
  upLamp.position.copy(upBulb.position); group.add(upLamp);
  anim.push((t) => {
    const phase = t % 30;
    const on = phase < 1.6 && Math.sin(t * 34) > -0.3 && Math.sin(t * 11) > -0.55;
    upLamp.intensity = on ? 2.4 : 0;
    upBulbMat.emissive.setHex(on ? 0x8f9c7c : 0x000000);
  });

  /* ---- Canos -------------------------------------------------------- */
  const pipeY = h - 0.23;
  cyl(metalMat, 0.065, w - 0.4, 0, pipeY, -2.45, { axis: 'x', segs: 14 });
  // nada de ferro atravessando o meio da escada
  cyl(metalMat, 0.055, d - 0.4, 3.45, pipeY, 0, { axis: 'z', segs: 12 });
  cyl(metalMat, 0.04, d - 0.4, -3.45, pipeY - 0.19, 0, { axis: 'z', segs: 12 });
  for (const [x, z, rad] of [[3.45, -2.45, 0.065], [3.45, 2.15, 0.055], [-3.45, -2.45, 0.065]]) {
    const j = new THREE.Mesh(new THREE.SphereGeometry(rad * 1.35, 12, 10), metalMat);
    j.position.set(x, pipeY, z); register(j);
  }
  // suportes e uma valvula
  for (const x of [-3, -1, 1, 3]) {
    box(blackMetal, 0.07, 0.3, 0.07, x, pipeY + 0.12, -2.45, { cast: false });
    box(blackMetal, 0.16, 0.03, 0.16, x, pipeY - 0.03, -2.45, { cast: false });
  }
  /* ---- Aquecedor / caldeira ----------------------------------------- */
  cyl(metalMat, 0.37, 1.3, 3.15, 0.68, -2.75, { segs: 24 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.37, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), metalMat);
  dome.position.set(3.15, 1.33, -2.75); register(dome);
  cyl(blackMetal, 0.06, 0.48, 3.15, 1.58, -2.75, { segs: 10 });
  cyl(metalMat, 0.05, 0.62, 2.78, 1.05, -2.75, { segs: 10 });
  cyl(metalMat, 0.05, 0.62, 3.15, 1.05, -2.38, { axis: 'z', segs: 10 });
  box(blackMetal, 0.5, 0.08, 0.5, 3.15, 0.04, -2.75, { cast: false });
  addCollider(3.15, -2.75, 0.8, 0.8);

  /* ---- Prateleira no depósito da direita ----------------------------- */
  const sx = 5.9, sz = -2.4, sw = 1.4, sd = 0.46;
  for (const zz of [sz - sw / 2, sz + sw / 2]) box(darkWoodMat, sd, 2.25, 0.05, sx, 1.13, zz);
  for (const yy of [0.12, 0.66, 1.2, 1.74, 2.23]) box(woodMat, sd, 0.045, sw, sx, yy, sz);
  box(darkWoodMat, 0.03, 2.25, sw, sx - sd / 2, 1.13, sz, { cast: false });
  // altitude baixa: não pode travar quem já está no penúltimo degrau
  addCollider(sx, sz, sd + 0.1, sw + 0.1, 0, 0, 2.25);

  // caixas, potes e garrafas nas prateleiras
  for (let shelf = 0; shelf < 4; shelf++) {
    const y = [0.12, 0.66, 1.2, 1.74][shelf] + 0.2;
    for (let i = 0; i < 3 + Math.floor(r() * 2); i++) {
      const z = sz - sw / 2 + 0.28 + i * 0.62 + r() * 0.15;
      if (z > sz + sw / 2 - 0.2) continue;
      const bh = 0.22 + r() * 0.22;
      box(i % 2 ? cardboard : cardboardDark, 0.3 + r() * 0.12, bh, 0.3 + r() * 0.1,
        sx + (r() - 0.5) * 0.08, y + bh / 2 - 0.1, z, { rotY: (r() - 0.5) * 0.3 });
      if (r() > 0.6) box(darkWoodMat, 0.32, 0.012, 0.06, sx, y + bh - 0.08, z, { cast: false });
    }
    for (let i = 0; i < 2; i++) {
      const z = sz - 0.6 + i * 1.1 + r() * 0.2;
      const jarH = 0.16 + r() * 0.2;
      cyl(glass, 0.07 + r() * 0.03, jarH, sx + 0.05, y + jarH / 2 - 0.1, z, { segs: 12 });
      cyl(metalMat, 0.075, 0.025, sx + 0.05, y + jarH - 0.08, z, { segs: 12 });
      if (r() > 0.5) cyl(glass, 0.045, jarH * 0.7, sx - 0.09, y + jarH * 0.35 - 0.1, z + 0.22, { segs: 10 });
    }
  }

  /* ---- Bancada na parede direita ------------------------------------ */
  const bx = 3.45, bz = 0.15, bw = 0.78, bl = 3.0;
  for (const z of [bz - bl / 2, bz + bl / 2]) {
    box(darkWoodMat, bw, 0.9, 0.08, bx, 0.45, z);
    box(darkWoodMat, 0.08, 0.9, 0.08, bx - bw / 2 + 0.06, 0.45, z);
  }
  for (const yy of [0.9, 0.28]) box(woodMat, bw, 0.06, bl, bx, yy, bz);
  box(darkWoodMat, 0.07, 0.22, bl - 0.2, bx + bw / 2 - 0.05, 1.01, bz);
  addCollider(bx, bz, bw + 0.1, bl + 0.1);

  // miscelanea sobre a bancada
  box(blackMetal, 0.28, 0.1, 0.44, bx - 0.05, 1.0, bz - 0.85, { rotY: 0.08 }); // vicio
  box(metalMat, 0.06, 0.16, 0.06, bx - 0.05, 1.13, bz - 1.0);
  cyl(metalMat, 0.018, 0.5, bx + 0.05, 0.99, bz - 0.2, { axis: 'z', segs: 8 }); // chave de fenda
  cyl(darkWoodMat, 0.035, 0.16, bx + 0.05, 0.99, bz + 0.08, { axis: 'z', segs: 10 });
  box(metalMat, 0.22, 0.05, 0.1, bx, 0.99, bz + 0.6, { rotY: -0.2 });
  box(cardboard, 0.3, 0.24, 0.42, bx - 0.08, 1.05, bz + 1.0, { rotY: 0.12 });
  // balde com agua suja
  cyl(blackMetal, 0.19, 0.3, bx - 0.05, 0.18, bz - 1.35, { segs: 16 });
  const bucketWater = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), liquid);
  bucketWater.rotation.x = -Math.PI / 2; bucketWater.position.set(bx - 0.05, 0.3, bz - 1.35);
  bucketWater.receiveShadow = true; group.add(bucketWater);
  anim.push((t) => { bucketWater.material.opacity = 0.5 + Math.sin(t * 0.7) * 0.03; });

  /* ---- Caixas empilhadas -------------------------------------------- */
  // Nenhuma pilha de caixas bloqueia a aproximação da porta de saída.
  const stacks = [
    [3.2, 2.8, 2], [1.6, 3.05, 1], [-2.2, -3.15, 2], [1.9, -2.9, 1],
  ];
  for (const [x, z, n] of stacks) {
    for (let i = 0; i < n; i++) {
      const s = 0.5 + r() * 0.18;
      box(i % 2 ? cardboard : cardboardDark, s, s * 0.85, s, x + (r() - 0.5) * 0.1,
        s * 0.425 + i * s * 0.86, z + (r() - 0.5) * 0.1, { rotY: (r() - 0.5) * 0.35 });
    }
    addCollider(x, z, 0.75, 0.75);
  }

  /* ---- Cadeira tombada ---------------------------------------------- */
  const chair = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.46), woodMat);
  seat.position.y = 0.45; chair.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.55, 0.05), woodMat);
  back.position.set(0, 0.74, -0.21); chair.add(back);
  for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.45, 0.045), darkWoodMat);
    leg.position.set(lx, 0.22, lz); chair.add(leg);
  }
  chair.position.set(1.45, 0, 1.55);
  chair.rotation.set(0, 0.7, 1.32);
  chair.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.add(chair);
  addCollider(1.45, 1.55, 0.7, 0.7);

  /* ---- Poças e manchas ---------------------------------------------- */
  for (const [px, pz, rad] of [[-1.2, -1.4, 0.85], [2.0, 1.9, 0.62], [-3.0, 0.9, 0.4]]) {
    const shape = new THREE.CircleGeometry(rad, 32);
    const pos = shape.attributes.position;
    for (let i = 1; i < pos.count; i++) {
      const k = 0.82 + r() * 0.32;
      pos.setXY(i, pos.getX(i) * k, pos.getY(i) * k);
    }
    shape.computeVertexNormals();
    const puddle = new THREE.Mesh(shape, new THREE.MeshStandardMaterial({
      color: 0x353d36, roughness: 0.13, metalness: 0.22, normalMap: tex.floor.normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.82,
    }));
    puddle.rotation.x = -Math.PI / 2; puddle.position.set(px, 0.012, pz);
    puddle.receiveShadow = true; group.add(puddle);
  }
  for (let i = 0; i < 12; i++) {
    const side = i % 4;
    const s = 0.3 + r() * 0.8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * (0.7 + r())), stainMat);
    if (side === 0) { m.position.set(-hw + 0.12, 0.3 + r() * 2.2, (r() - 0.5) * d); m.rotation.y = Math.PI / 2; }
    if (side === 1) { m.position.set(hw - 0.12, 0.3 + r() * 2.2, (r() - 0.5) * d); m.rotation.y = -Math.PI / 2; }
    if (side === 2) { m.position.set((r() - 0.5) * w, 0.3 + r() * 2.2, -hd + 0.12); }
    if (side === 3) { m.position.set((r() - 0.5) * w, 0.3 + r() * 2.2, hd - 0.12); m.rotation.y = Math.PI; }
    m.rotation.z = r() * Math.PI; group.add(m);
  }
  // mancha escura no chao, bem discreta
  const floorStain = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), stainMat);
  floorStain.rotation.x = -Math.PI / 2; floorStain.position.set(-1.0, 0.014, -1.4);
  group.add(floorStain);

  /* ---- Teias de aranha ---------------------------------------------- */
  for (const [x, y, z, ry, s] of [
    [-hw + 0.05, h - 0.05, -hd + 0.06, Math.PI / 4, 1.5],
    [hw - 0.05, h - 0.05, -hd + 0.06, -Math.PI / 4 + Math.PI / 2, 1.3],
    [-hw + 0.05, h - 0.05, hd - 0.06, Math.PI / 2, 1.1],
    [wx + 0.62, wt + 0.02, -hd + 0.05, 0.5, 0.8],
  ]) {
    const web = new THREE.Mesh(new THREE.PlaneGeometry(s, s), webMat);
    web.position.set(x, y, z); web.rotation.set(-Math.PI / 2 + 0.1, ry, 0);
    group.add(web);
  }

  /* ---- Lâmpada morta pendurada -------------------------------------- */
  cyl(blackMetal, 0.005, 0.5, -0.7, h - 0.26, -1.1, { segs: 6 });
  cyl(metalMat, 0.045, 0.09, -0.7, h - 0.55, -1.1, { segs: 10 });
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x4b4f43, roughness: 0.25, metalness: 0.1 })
  );
  bulb.scale.y = 1.35; bulb.position.set(-0.7, h - 0.65, -1.1); register(bulb);
  anim.push((t) => { bulb.rotation.y = t * 0.12; });

  /* ---- Entulho ------------------------------------------------------ */
  for (let i = 0; i < 55; i++) {
    const x = (r() - 0.5) * (w - 0.8), z = (r() - 0.5) * (d - 0.8);
    if (Math.abs(x) < 1.0 && z > 1.0) continue; // area de spawn
    if (x > stairX0 - 0.2 && x < stairX1 + 0.2 && z > stairZ0 - 0.2 && z < stairZ1 + 0.2) continue;
    const s = 0.05 + r() * 0.13;
    const m = box(brick, s * (0.8 + r()), s * 0.6, s, x, s * 0.3, z, {
      rotY: r() * Math.PI, rotZ: (r() - 0.5) * 0.4, cast: false,
    });
    m.rotation.x = (r() - 0.5) * 0.3;
  }
  // tubos de papel / papelada no chao
  for (let i = 0; i < 9; i++) {
    box(cardboardDark, 0.18 + r() * 0.2, 0.006, 0.26 + r() * 0.2,
      (r() - 0.5) * 7, 0.008, (r() - 0.5) * 6, { rotY: r() * Math.PI, cast: false });
  }

  const zones = [
    // corredor ( dividido para não “puxar” o jogador para o andar de cima
    // quando ele estiver embaixo, na boca da escada )
    { minX: -hw + 0.2, maxX: stairX0, minZ: -hd + 0.2, maxZ: hd - 0.2, y: upperY, level: 1 },
    { minX: stairX0, maxX: stairX1, minZ: -hd + 0.2, maxZ: stairZ0, y: upperY, level: 1 },
    { minX: stairX1, maxX: -0.7, minZ: -hd + 0.2, maxZ: hd - 0.2, y: upperY, level: 1 },
    // quarto principal
    { minX: -0.7, maxX: hw - 0.2, minZ: -hd + 0.2, maxZ: 1.2, y: upperY, level: 1 },
    // sótão, em volta do vão da segunda escada
    { minX: -hw + 0.2, maxX: atticX0, minZ: -hd + 0.2, maxZ: hd - 0.2, y: atticY, level: 2 },
    { minX: atticX0, maxX: atticX1, minZ: -hd + 0.2, maxZ: atticZ0, y: atticY, level: 2 },
    { minX: atticX1, maxX: hw - 0.2, minZ: -hd + 0.2, maxZ: hd - 0.2, y: atticY, level: 2 },
    { minX: atticX0, maxX: atticX1, minZ: atticZ1, maxZ: hd - 0.2, y: atticY, level: 2 },
    // porão
    { minX: -hw, maxX: hw, minZ: -hd, maxZ: hd, y: 0, level: 0 },
  ];
  const ramps = [
    {
      minX: stairX0, maxX: stairX1,
      zMin: stairZ0, zMax: stairZ1,
      yBottom: 0, yTop: upperY, steps, fromLevel: 0, toLevel: 1,
    },
    {
      minX: atticX0, maxX: atticX1,
      zMin: atticZ0, zMax: atticZ1,
      yBottom: upperY, yTop: atticY, steps, fromLevel: 1, toLevel: 2,
    },
  ];

  // Tudo o que a física usa passa para coordenadas de mundo.
  const keys = ['minX', 'maxX', 'minZ', 'maxZ', 'zMin', 'zMax', 'minY', 'maxY', 'y', 'yBottom', 'yTop'];
  for (const rect of [...colliders, ...zones, ...ramps]) {
    for (const k of keys) if (rect[k] !== undefined) rect[k] *= SCALE;
  }

  return {
    colliders,
    zones,
    ramps,
    update(t) { for (const fn of anim) fn(t); },
    spawn: { x: 0, z: 2.15 * SCALE, y: 0, yaw: 0 }, // olhando para a janela (parede do fundo)
  };
}
