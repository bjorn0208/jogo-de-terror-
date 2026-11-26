import * as THREE from 'three';
import { rng } from './textures.js';

/* ------------------------------------------------------------------ *
 *  O porão. Tudo e construido com geometria simples + as texturas
 *  procedurais, mas com atencao a escala, sujeira e quebra de linhas
 *  retas — e o que faz um cenario parecer "real".
 * ------------------------------------------------------------------ */

export const ROOM = { w: 8.4, d: 7.2, h: 3.0, wall: 0.22 };

export function createRoom(scene, tex) {
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

  function register(mesh, cast = true, receive = true) {
    mesh.castShadow = cast; mesh.receiveShadow = receive;
    scene.add(mesh);
    return mesh;
  }

  function addCollider(x, z, w, d, rotY = 0) {
    const ex = Math.abs(Math.cos(rotY)) * w / 2 + Math.abs(Math.sin(rotY)) * d / 2;
    const ez = Math.abs(Math.sin(rotY)) * w / 2 + Math.abs(Math.cos(rotY)) * d / 2;
    colliders.push({ minX: x - ex, maxX: x + ex, minZ: z - ez, maxZ: z + ez });
  }

  function box(mat, w, h, d, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (opts.rotY) m.rotation.y = opts.rotY;
    if (opts.rotX) m.rotation.x = opts.rotX;
    if (opts.rotZ) m.rotation.z = opts.rotZ;
    register(m, opts.cast !== false, opts.receive !== false);
    if (opts.collide) addCollider(x, z, w, d, opts.rotY || 0);
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

  /* ---- Estrutura ---------------------------------------------------- */
  const { w, d, h, wall } = ROOM;
  const hw = w / 2, hd = d / 2;

  // piso e teto
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.y = h; ceil.receiveShadow = true; scene.add(ceil);

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
  outside.position.set(wx, wy, -hd - 0.13); scene.add(outside);
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

  /* ---- Canos -------------------------------------------------------- */
  const pipeY = h - 0.23;
  cyl(metalMat, 0.065, w - 0.4, 0, pipeY, -2.45, { axis: 'x', segs: 14 });
  cyl(metalMat, 0.045, w - 0.4, 0, pipeY - 0.19, 1.85, { axis: 'x', segs: 12 });
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
  const valve = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 18), metalMat);
  valve.position.set(0.9, pipeY - 0.19, 1.85); valve.rotation.x = Math.PI / 2; register(valve);
  cyl(metalMat, 0.03, 0.25, 0.9, pipeY - 0.08, 1.85, { segs: 8 });

  /* ---- Aquecedor / caldeira ----------------------------------------- */
  cyl(metalMat, 0.37, 1.3, 3.15, 0.68, -2.75, { segs: 24 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.37, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), metalMat);
  dome.position.set(3.15, 1.33, -2.75); register(dome);
  cyl(blackMetal, 0.06, 0.48, 3.15, 1.58, -2.75, { segs: 10 });
  cyl(metalMat, 0.05, 0.62, 2.78, 1.05, -2.75, { segs: 10 });
  cyl(metalMat, 0.05, 0.62, 3.15, 1.05, -2.38, { axis: 'z', segs: 10 });
  box(blackMetal, 0.5, 0.08, 0.5, 3.15, 0.04, -2.75, { cast: false });
  addCollider(3.15, -2.75, 0.8, 0.8);

  /* ---- Prateleira na parede esquerda -------------------------------- */
  const sx = -3.75, sz = -0.85, sw = 2.6, sd = 0.46;
  for (const zz of [sz - sw / 2, sz + sw / 2]) box(darkWoodMat, sd, 2.25, 0.05, sx, 1.13, zz);
  for (const yy of [0.12, 0.66, 1.2, 1.74, 2.23]) box(woodMat, sd, 0.045, sw, sx, yy, sz);
  box(darkWoodMat, 0.03, 2.25, sw, sx - sd / 2, 1.13, sz, { cast: false });
  addCollider(sx, sz, sd + 0.1, sw + 0.1);

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
  bucketWater.receiveShadow = true; scene.add(bucketWater);
  anim.push((t) => { bucketWater.material.opacity = 0.5 + Math.sin(t * 0.7) * 0.03; });

  /* ---- Caixas empilhadas -------------------------------------------- */
  const stacks = [
    [-2.9, 2.55, 3], [-2.2, 2.7, 2], [2.65, 2.55, 2], [1.9, -2.9, 1],
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
  scene.add(chair);
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
    puddle.receiveShadow = true; scene.add(puddle);
  }
  for (let i = 0; i < 12; i++) {
    const side = i % 4;
    const s = 0.3 + r() * 0.8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * (0.7 + r())), stainMat);
    if (side === 0) { m.position.set(-hw + 0.12, 0.3 + r() * 2.2, (r() - 0.5) * d); m.rotation.y = Math.PI / 2; }
    if (side === 1) { m.position.set(hw - 0.12, 0.3 + r() * 2.2, (r() - 0.5) * d); m.rotation.y = -Math.PI / 2; }
    if (side === 2) { m.position.set((r() - 0.5) * w, 0.3 + r() * 2.2, -hd + 0.12); }
    if (side === 3) { m.position.set((r() - 0.5) * w, 0.3 + r() * 2.2, hd - 0.12); m.rotation.y = Math.PI; }
    m.rotation.z = r() * Math.PI; scene.add(m);
  }
  // mancha escura no chao, bem discreta
  const floorStain = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), stainMat);
  floorStain.rotation.x = -Math.PI / 2; floorStain.position.set(-1.0, 0.014, -1.4);
  scene.add(floorStain);

  /* ---- Teias de aranha ---------------------------------------------- */
  for (const [x, y, z, ry, s] of [
    [-hw + 0.05, h - 0.05, -hd + 0.06, Math.PI / 4, 1.5],
    [hw - 0.05, h - 0.05, -hd + 0.06, -Math.PI / 4 + Math.PI / 2, 1.3],
    [-hw + 0.05, h - 0.05, hd - 0.06, Math.PI / 2, 1.1],
    [wx + 0.62, wt + 0.02, -hd + 0.05, 0.5, 0.8],
  ]) {
    const web = new THREE.Mesh(new THREE.PlaneGeometry(s, s), webMat);
    web.position.set(x, y, z); web.rotation.set(-Math.PI / 2 + 0.1, ry, 0);
    scene.add(web);
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

  return {
    colliders,
    update(t) { for (const fn of anim) fn(t); },
    spawn: { x: 0, z: 2.15, yaw: 0 }, // olhando para a janela (parede do fundo)
  };
}
