import * as THREE from 'three';
import { ROOM } from './room.js';

/* Ratos: passam correndo de repente perto do jogador, com guincho.
   São sustos curtos e esporádicos, não uma ameaça permanente. */

export function createRats(scene, audio) {
  const fur = new THREE.MeshStandardMaterial({ color: 0x2a251e, roughness: 1 });
  const eye = new THREE.MeshBasicMaterial({ color: 0x8c2a1c, fog: false });

  function build() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), fur);
    body.scale.set(0.85, 0.62, 1.5); body.position.y = 0.1; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), fur);
    head.position.set(0, 0.11, -0.16); g.add(head);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), fur);
      ear.scale.set(0.6, 1, 0.4); ear.position.set(s * 0.045, 0.19, -0.15); g.add(ear);
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 5), eye);
      e.position.set(s * 0.04, 0.13, -0.22); g.add(e);
    }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.004, 0.34, 6), fur);
    tail.rotation.x = Math.PI / 2; tail.position.set(0, 0.08, 0.24); g.add(tail);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.visible = false;
    scene.add(g);
    return { group: g, tail, active: false, t: 0, from: new THREE.Vector3(), to: new THREE.Vector3() };
  }

  const rats = [build(), build(), build()];
  const tmp = new THREE.Vector3();
  let timer = 7;
  let t = 0;

  return {
    onScare: null,
    update(dt, playerPos) {
      t += dt;
      timer -= dt;
      if (timer <= 0) {
        timer = 18 + Math.random() * 22;
        const rat = rats.find((r) => !r.active);
        if (rat) {
          const a = Math.random() * Math.PI * 2;
          const d = 3 + Math.random() * 2;
          const cx = Math.max(-ROOM.w / 2 + 1.2, Math.min(ROOM.w / 2 - 1.2, playerPos.x + Math.cos(a) * d));
          const cz = Math.max(-ROOM.d / 2 + 1.2, Math.min(ROOM.d / 2 - 1.2, playerPos.z + Math.sin(a) * d));
          const side = Math.random() < 0.5 ? 1 : -1;
          const floorY = playerPos.y - 1.62; // o rato corre no mesmo andar do jogador
          rat.from.set(cx - side * 1.6, floorY, cz - side * 0.5);
          rat.to.set(cx + side * 1.6, floorY, cz + side * 0.5);
          rat.t = 0;
          rat.active = true;
          rat.group.visible = true;
          audio?.squeak?.();
          this.onScare?.();
        }
      }
      for (const rat of rats) {
        if (!rat.active) continue;
        rat.t += dt;
        const k = rat.t / 0.95;
        if (k >= 1) {
          rat.active = false;
          rat.group.visible = false;
          continue;
        }
        tmp.lerpVectors(rat.from, rat.to, k);
        rat.group.position.set(tmp.x, tmp.y + Math.abs(Math.sin(rat.t * 28)) * 0.02, tmp.z);
        rat.group.rotation.y = Math.atan2(rat.to.x - rat.from.x, rat.to.z - rat.from.z) + Math.PI;
        rat.tail.rotation.z = Math.sin(t * 24) * 0.35;
      }
    },
  };
}
