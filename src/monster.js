import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ROOM } from './room.js';

/* ------------------------------------------------------------------ *
 *  Monstro do porão.
 *
 *  Se existir `assets/monster.glb`, ele carrega esse modelo (o do
 *  Hyper3D, por exemplo) e o redimensiona para ~1,7 m de altura.
 *  Se não existir, fica um substituto simples de silhueta para o jogo
 *  já ter pressão. O comportamento: ele avança quando você NÃO está
 *  olhando, e congela quando a lanterna o pega.
 * ------------------------------------------------------------------ */

export function createMonster(scene, audio, colliders = []) {
  const group = new THREE.Group();
  group.position.set(2.85, 0, -2.05);
  scene.add(group);

  const skin = new THREE.MeshStandardMaterial({ color: 0x111410, roughness: 1, metalness: 0 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xa9c98c, transparent: true, opacity: 0.55, fog: false });

  function placeholder() {
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.72, 0.26), skin);
    torso.position.y = 1.02; torso.rotation.x = -0.18; group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), skin);
    head.scale.set(0.9, 1.25, 0.9); head.position.set(0, 1.52, 0.06); group.add(head);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.78, 8), skin);
      arm.position.set(s * 0.3, 0.92, 0.02); arm.rotation.z = s * 0.22; group.add(arm);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.72, 8), skin);
      leg.position.set(s * 0.13, 0.36, 0); group.add(leg);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), eyeMat);
      eye.position.set(s * 0.065, 1.55, 0.19); group.add(eye);
    }
    group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  placeholder();

  // Troca pelo modelo real quando o arquivo existir.
  let url = 'assets/monster.glb';
  try { url = new URL(url, document.baseURI || location.href).href; } catch (_) { /* mantém relativo */ }
  try {
    new GLTFLoader().load(
      url,
      (gltf) => {
        const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      if (size.y > 0.001) model.scale.setScalar(1.7 / size.y);
      model.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(model);
      model.position.y -= box2.min.y;
      model.traverse((o) => {
        if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });
      while (group.children.length) group.remove(group.children[0]);
      group.add(model);
    },
    undefined,
    () => { /* sem arquivo: mantém o substituto */ }
    );
  } catch (err) {
    console.warn('Modelo opcional do monstro indisponível:', err);
  }

  const toMonster = new THREE.Vector3();
  let state = 'idle';
  let seenFor = 0;
  let hiddenFor = 0;
  let attackCooldown = 0;
  let time = 0;
  let onAttack = null;

  function blocked(x, z) {
    const r = 0.3;
    for (const c of colliders) {
      // o monstro fica no porão; paredes do andar de cima não o travam
      if ((c.minY ?? 0) > 0.4 || (c.maxY ?? 3) < 0.2) continue;
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
    }
    return false;
  }

  function reset() {
    group.position.set(2.85, 0, -2.05);
    state = 'idle'; seenFor = hiddenFor = 0; attackCooldown = 6;
  }

  return {
    group,
    set onAttack(fn) { onAttack = fn; },
    update(dt, playerPos, cameraDir, flashlightOn) {
      time += dt;
      if (attackCooldown > 0) attackCooldown -= dt;

      toMonster.copy(group.position).sub(playerPos);
      toMonster.y = 0;
      const dist = toMonster.length();
      toMonster.normalize();
      // "visto" = dentro do cone da lanterna e perto o bastante
      const aim = cameraDir.dot(toMonster);
      const seen = flashlightOn && dist < 11 && aim > 0.9;

      group.lookAt(playerPos.x, group.position.y + 0.9, playerPos.z);

      if (seen) {
        seenFor += dt; hiddenFor = 0;
        if (state === 'stalk' && seenFor > 0.25) { state = 'frozen'; audio?.creak?.(); }
      } else {
        hiddenFor += dt; seenFor = 0;
        if (state === 'frozen' && hiddenFor > 1.2) state = 'stalk';
      }

      if (state === 'idle' && dist < 6.5 && attackCooldown <= 0) {
        state = 'stalk';
        audio?.growl?.();
      }

      if (state === 'stalk' && dist > 0.95) {
        const step = 0.42 * dt;
        const nx = group.position.x + toMonster.x * step;
        const nz = group.position.z + toMonster.z * step;
        const mx = ROOM.w / 2 - 0.45, mz = ROOM.d / 2 - 0.45;
        if (!blocked(nx, group.position.z) && Math.abs(nx) < mx) group.position.x = nx;
        if (!blocked(group.position.x, nz) && Math.abs(nz) < mz) group.position.z = nz;
        // oscilação ausente de passos, sem custo de áudio extra
        group.position.y = Math.abs(Math.sin(time * 5.5)) * 0.012;
      } else {
        group.position.y *= 0.9;
      }

      if (dist < 1.0 && attackCooldown <= 0) {
        audio?.knock?.();
        onAttack?.();
        reset();
      }
    },
  };
}
