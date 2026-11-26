import * as THREE from 'three';
import { ROOM } from './room.js';

/* Controle first-person com colisao em 2D, passos, agachamento e sway. */

export class Controls {
  constructor(camera, dom, colliders) {
    this.camera = camera;
    this.dom = dom;
    this.colliders = colliders;
    this.eyeHeight = 1.62;
    this.baseEye = 1.62;
    this.radius = 0.28;
    this.yaw = 0;
    this.pitch = 0;
    this.vel = new THREE.Vector2();
    this.keys = new Set();
    this.actions = new Set();
    this.sway = { x: 0, y: 0 };
    this.touchMove = { x: 0, y: 0 };
    this.bob = 0;
    this.moving = 0;
    this.crouch = false;
    this.enabled = false;
    this.onFootstep = null;
    this._tmp = new THREE.Vector2();

    //levels: zonas andar a andar + rampas de escada
    this.zones = [];
    this.ramps = [];
    this.floorY = 0;
    this.level = 0; // 0 = porão, 1 = andar de cima

    this._onMouse = (e) => {
      if (!this.enabled) return;
      const s = 0.0021;
      this.yaw -= e.movementX * s;
      this.pitch -= e.movementY * s;
      this.pitch = Math.max(-1.42, Math.min(1.42, this.pitch));
      this.sway.x -= e.movementX * 0.0006;
      this.sway.y -= e.movementY * 0.0005;
    };
    this._onKeyDown = (e) => {
      const k = e.code;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(k)) e.preventDefault();
      this.keys.add(k);
      if (e.repeat) return;
      if (k === 'KeyF') this.actions.add('flash');
      if (k === 'KeyE') this.actions.add('interact');
      if (k === 'KeyM') this.actions.add('sound');
      if (k === 'KeyC') this.crouch = !this.crouch;
      if (k === 'Minus' || k === 'NumpadSubtract' || k === 'BracketLeft') this.actions.add('brightDown');
      if (k === 'Equal' || k === 'NumpadAdd' || k === 'BracketRight') this.actions.add('brightUp');
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    document.addEventListener('mousemove', this._onMouse);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', () => this.keys.clear());
  }

  /** Joystick na esquerda e arrastar para olhar na direita (celular). */
  bindTouch(stick, knob, lookZone) {
    let stickId = null, lookId = null, lx = 0, ly = 0;
    const setStick = (e) => {
      const t = [...e.touches].find((p) => p.identifier === stickId);
      if (!t) return;
      const b = stick.getBoundingClientRect();
      let dx = t.clientX - (b.left + b.width / 2);
      let dy = t.clientY - (b.top + b.height / 2);
      const max = b.width * 0.36, len = Math.hypot(dx, dy) || 1;
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      this.touchMove.x = dx / max;
      this.touchMove.y = dy / max;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      e.preventDefault();
    };
    stick.addEventListener('touchstart', (e) => {
      if (stickId !== null) return;
      const t = e.changedTouches[0]; stickId = t.identifier; setStick(e);
    }, { passive: false });
    stick.addEventListener('touchmove', setStick, { passive: false });
    const endStick = (e) => {
      if (![...e.touches].some((p) => p.identifier === stickId)) {
        stickId = null; this.touchMove.x = this.touchMove.y = 0;
        knob.style.transform = 'translate(0,0)';
      }
    };
    stick.addEventListener('touchend', endStick);
    stick.addEventListener('touchcancel', endStick);

    lookZone.addEventListener('touchstart', (e) => {
      if (lookId !== null || !this.enabled) return;
      const t = e.changedTouches[0]; lookId = t.identifier;
      lx = t.clientX; ly = t.clientY; e.preventDefault();
    }, { passive: false });
    lookZone.addEventListener('touchmove', (e) => {
      const t = [...e.touches].find((p) => p.identifier === lookId);
      if (!t || !this.enabled) return;
      const dx = t.clientX - lx, dy = t.clientY - ly;
      lx = t.clientX; ly = t.clientY;
      this.yaw -= dx * 0.004;
      this.pitch = Math.max(-1.42, Math.min(1.42, this.pitch - dy * 0.004));
      this.sway.x -= dx * 0.0008;
      this.sway.y -= dy * 0.0007;
      e.preventDefault();
    }, { passive: false });
    const endLook = (e) => {
      if (![...e.touches].some((p) => p.identifier === lookId)) lookId = null;
    };
    lookZone.addEventListener('touchend', endLook);
    lookZone.addEventListener('touchcancel', endLook);
  }

  reset(spawn) {
    this.floorY = spawn.y || 0;
    this.level = this.floorY > 1 ? 1 : 0;
    this.baseEye = this.floorY + this.eyeHeight;
    this.camera.position.set(spawn.x, this.baseEye, spawn.z);
    this.touchMove.x = this.touchMove.y = 0;
    this.yaw = spawn.yaw || 0;
    this.pitch = 0;
    this.vel.set(0, 0);
    this.bob = 0;
    this.crouch = false;
    this.keys.clear();
  }

  requestLock() {
    if (this.dom.requestPointerLock) this.dom.requestPointerLock();
  }

  consume(name) {
    if (this.actions.has(name)) { this.actions.delete(name); return true; }
    return false;
  }

  /** Altura do piso sob (x,z). O nível fica "grudado" até a escada terminar. */
  sampleFloor(x, z) {
    for (const r of this.ramps) {
      if (x >= r.minX && x <= r.maxX && z >= r.zMin && z <= r.zMax) {
        const t = Math.max(0, Math.min(1, (r.zMax - z) / (r.zMax - r.zMin)));
        // degraus: piso sobe de vez em quando, não como rampa lisa
        const f = r.steps ? Math.min(r.steps, Math.floor(t * r.steps)) / r.steps : t;
        // define o nível antes do último degrau: o próximo passo já sai da rampa
        this.level = f >= 0.5 ? 1 : 0;
        return r.yBottom + (r.yTop - r.yBottom) * f;
      }
    }
    if (this.level === 1) {
      for (const zone of this.zones) {
        if (zone.y > 1 && x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) {
          return zone.y;
        }
      }
      return this.floorY; // nunca cai por um buraco de zona
    }
    return 0;
  }

  blocked(x, z, feetY = this.floorY) {
    const r = this.radius;
    const headY = feetY + this.eyeHeight;
    for (const c of this.colliders) {
      if (headY <= (c.minY ?? 0) || feetY >= (c.maxY ?? 3)) continue;
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
    }
    return false;
  }

  update(dt) {
    const k = this.keys;
    let ix = 0, iz = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) iz -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) iz += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) ix += 1;
    ix += this.touchMove.x;
    iz += this.touchMove.y;

    const len = Math.hypot(ix, iz) || 1;
    const sprint = k.has('ShiftLeft') || k.has('ShiftRight');
    const speed = this.crouch ? 1.25 : sprint ? 3.5 : 2.15;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    // frente do jogador = (sin(yaw), -cos(yaw))
    const wx = (ix / len) * cos + (iz / len) * sin;
    const wz = (ix / len) * -sin + (iz / len) * cos;
    const target = this._tmp.set(wx * speed, wz * speed);
    const f = 1 - Math.exp(-11 * dt);
    this.vel.lerp(target, f);

    const p = this.camera.position;
    const nx = p.x + this.vel.x * dt;
    if (!this.blocked(nx, p.z, this.floorY)) p.x = nx; else this.vel.x *= 0.2;
    const nz = p.z + this.vel.y * dt;
    if (!this.blocked(p.x, nz, this.floorY)) p.z = nz; else this.vel.y *= 0.2;
    this.floorY = this.sampleFloor(p.x, p.z);

    const margin = ROOM.wall / 2 + this.radius + 0.02;
    p.x = Math.max(-ROOM.w / 2 + margin, Math.min(ROOM.w / 2 - margin, p.x));
    p.z = Math.max(-ROOM.d / 2 + margin, Math.min(ROOM.d / 2 - margin, p.z));

    const actual = Math.min(1, this.vel.length() / speed);
    this.moving += (actual - this.moving) * Math.min(1, dt * 6);
    const prev = this.bob;
    this.bob += actual * dt * (sprint ? 11 : 8.2);
    if (actual > 0.15 && Math.floor(this.bob / Math.PI) > Math.floor(prev / Math.PI)) {
      if (this.onFootstep) this.onFootstep(actual, sprint);
    }

    const targetEye = this.eyeHeight * (this.crouch ? 0.64 : 1);
    const targetBase = this.floorY + targetEye;
    this.baseEye += (targetBase - this.baseEye) * Math.min(1, dt * 9);
    const bobY = Math.sin(this.bob) * 0.026 * this.moving;
    p.y = this.baseEye + bobY;
    const bobX = Math.cos(this.bob * 0.5) * 0.012 * this.moving;
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = Math.sin(this.bob * 0.5) * 0.005 * this.moving;

    // sway da lanterna: volta devagar ao centro
    this.sway.x *= Math.exp(-3.2 * dt);
    this.sway.y *= Math.exp(-3.2 * dt);
    this.sway.x += Math.sin(this.bob * 0.5) * 0.004 * this.moving;
    this.sway.y += Math.cos(this.bob) * 0.006 * this.moving;

    return { bobY, bobX, speed: actual };
  }
}
