/* Áudio sintetizado com Web Audio — nenhum arquivo de som externo. */

export class HorrorAudio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.muted = false;
    this.nextEvent = 9;
    this.time = 0;
    // Áudios embutidos no build (links enviados) e camadas de fundo ativas.
    this.audioUrls = null;
    this.beds = {};
    this.bedNodes = {};
  }

  init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(1.9, 3.1);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.4;
    this.reverb.connect(this.wet);
    this.wet.connect(this.master);

    this.dry = ctx.createGain();
    this.dry.gain.value = 0.9;
    this.dry.connect(this.master);

    this.noiseBuf = this._noise(2);
    this.audioUrls = window.__PORAO_AUDIO__ || null;
    this._drone();
    this._roomTone();
    this.ready = true;
  }

  /* ---- Áudios embutidos --------------------------------------------- */
  async _loadBed(name) {
    if (!this.ready || this.beds[name]) return this.beds[name] || null;
    const url = this.audioUrls && this.audioUrls[name];
    if (!url) return null;
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(buf);
      this.beds[name] = decoded;
      return decoded;
    } catch (err) {
      console.warn('Áudio "' + name + '" indisponível:', err);
      return null;
    }
  }

  async playBed(name, volume = 0.32, fade = 2) {
    if (!this.ready) return;
    const buffer = await this._loadBed(name);
    if (!buffer) return;
    this.stopBeds(Math.max(0.3, fade * 0.4));
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + fade);
    src.connect(g); g.connect(this.master);
    src.start();
    this.bedNodes[name] = { src, g };
  }

  stopBeds(fade = 0.5) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (const node of Object.values(this.bedNodes)) {
      try {
        node.g.gain.cancelScheduledValues(t);
        node.g.gain.setValueAtTime(node.g.gain.value, t);
        node.g.gain.linearRampToValueAtTime(0, t + fade);
        node.src.stop(t + fade + 0.05);
      } catch (_) { /* já parou */ }
    }
    this.bedNodes = {};
  }

  async playOneShot(name, volume = 0.9) {
    if (!this.ready) return;
    const buffer = await this._loadBed(name);
    if (!buffer) return;
    const src = this.ctx.createBufferSource(); src.buffer = buffer;
    const g = this.ctx.createGain(); g.gain.value = volume;
    src.connect(g); g.connect(this.master);
    src.start();
  }

  /** Fundo ao iniciar a partida. */
  playStartBed() { this.playBed('start', 0.3, 2.5); }

  /** Fundo depois de ler a folha única do quarto. */
  playForestBed() { this.playBed('forest', 0.34, 2.5); }

  /** Última pilha morreu sem reservas. */
  playBatteryDead() {
    this.stopBeds(0.35);
    this.playOneShot('death', 0.95);
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.08);
  }

  _noise(seconds) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * 0.55;
      }
    }
    return b;
  }

  _env(g, t0, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  _route(node, wetAmount = 0.25) {
    node.connect(this.dry);
    if (wetAmount > 0) {
      const w = this.ctx.createGain(); w.gain.value = wetAmount;
      node.connect(w); w.connect(this.reverb);
    }
  }

  _drone() {
    const ctx = this.ctx, t = ctx.currentTime;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 170; lp.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.value = 0.055;
    lp.connect(g); this._route(g, 0.5);
    for (const [f, type, vol] of [[43, 'sine', 1], [43.6, 'sine', 0.9], [64.5, 'triangle', 0.25]]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      const og = ctx.createGain(); og.gain.value = vol;
      o.connect(og); og.connect(lp); o.start(t);
    }
    // pulsacao lenta, como uma respiracao
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    const lg = ctx.createGain(); lg.gain.value = 0.022;
    lfo.connect(lg); lg.connect(g.gain); lfo.start(t);
  }

  _roomTone() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = 0.45;
    const g = ctx.createGain(); g.gain.value = 0.012;
    src.connect(bp); bp.connect(g); this._route(g, 0.7);
    src.start();
  }

  footstep(intensity = 1, sprint = false) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.7 + Math.random() * 0.4;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = 150 + Math.random() * 90; bp.Q.value = 0.9;
    const g = ctx.createGain();
    this._env(g, t, (sprint ? 0.14 : 0.095) * intensity, 0.004, 0.14);
    src.connect(bp); bp.connect(g); this._route(g, 0.55);
    src.start(t); src.stop(t + 0.2);
    // impacto surdo
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(88, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    const og = ctx.createGain(); this._env(og, t, 0.045 * intensity, 0.003, 0.09);
    o.connect(og); this._route(og, 0.3);
    o.start(t); o.stop(t + 0.15);
  }

  click(on) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    const g = ctx.createGain(); this._env(g, t, 0.09, 0.001, 0.035);
    src.connect(hp); hp.connect(g); this._route(g, 0.2);
    src.start(t); src.stop(t + 0.06);
    const o = ctx.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(on ? 620 : 380, t);
    const og = ctx.createGain(); this._env(og, t, 0.02, 0.001, 0.035);
    o.connect(og); og.connect(this.dry);
    o.start(t); o.stop(t + 0.05);
  }

  creak() {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const base = 90 + Math.random() * 130;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * (0.55 + Math.random() * 0.2), t + 0.8);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = 500; bp.Q.value = 2.4;
    const g = ctx.createGain(); this._env(g, t, 0.035, 0.12, 0.9);
    o.connect(bp); bp.connect(g); this._route(g, 0.9);
    o.start(t); o.stop(t + 1.15);
  }

  knock() {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    const g = ctx.createGain(); this._env(g, t, 0.12, 0.002, 0.16);
    o.connect(g); this._route(g, 1.2);
    o.start(t); o.stop(t + 0.22);
  }

  drip() {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1200 + Math.random() * 600, t);
    o.frequency.exponentialRampToValueAtTime(380, t + 0.09);
    const g = ctx.createGain(); this._env(g, t, 0.055, 0.002, 0.12);
    o.connect(g); this._route(g, 1.1);
    o.start(t); o.stop(t + 0.18);
  }

  growl() {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(62, t);
    o.frequency.linearRampToValueAtTime(43, t + 1.3);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
    const g = ctx.createGain(); this._env(g, t, 0.075, 0.25, 1.4);
    o.connect(lp); lp.connect(g); this._route(g, 0.8);
    o.start(t); o.stop(t + 1.75);
  }

  whisper() {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = 900; bp.Q.value = 1.6;
    const g = ctx.createGain(); this._env(g, t, 0.012, 0.5, 1.1);
    src.connect(bp); bp.connect(g); this._route(g, 1.0);
    src.start(t); src.stop(t + 1.8);
  }

  /** Guincho curto e agudo de rato. */
  squeak() {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const o = ctx.createOscillator(); o.type = 'sine';
      const at = t + i * 0.09;
      o.frequency.setValueAtTime(1500 + Math.random() * 500, at);
      o.frequency.exponentialRampToValueAtTime(700 + Math.random() * 200, at + 0.07);
      const g = ctx.createGain(); this._env(g, at, 0.075, 0.004, 0.07);
      o.connect(g); this._route(g, 0.5);
      o.start(at); o.stop(at + 0.13);
    }
  }

  /** Estalo metálico ao pegar um objeto ou trocar a pilha. */
  pickup() {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const [f, at] of [[820, 0], [1240, 0.07]]) {
      const o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(f, t + at);
      const g = ctx.createGain(); this._env(g, t + at, 0.045, 0.003, 0.12);
      o.connect(g); this._route(g, 0.45);
      o.start(t + at); o.stop(t + at + 0.16);
    }
  }

  /** Folha de papel sendo puxada. */
  paper() {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    src.playbackRate.value = 1.6;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1100;
    const g = ctx.createGain(); this._env(g, t, 0.045, 0.02, 0.28);
    src.connect(hp); hp.connect(g); this._route(g, 0.3);
    src.start(t); src.stop(t + 0.35);
  }

  /** Cadeado abrindo. */
  unlock() {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const [f, at] of [[480, 0], [760, 0.11], [1140, 0.23]]) {
      const o = ctx.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(f, t + at);
      const g = ctx.createGain(); this._env(g, t + at, 0.035, 0.002, 0.1);
      o.connect(g); this._route(g, 0.6);
      o.start(t + at); o.stop(t + at + 0.14);
    }
  }

  update(dt) {
    if (!this.ready || this.muted) return;
    this.time += dt;
    if (this.time >= this.nextEvent) {
      this.time = 0;
      this.nextEvent = 7 + Math.random() * 16;
      const roll = Math.random();
      if (roll < 0.4) this.creak();
      else if (roll < 0.7) this.drip();
      else if (roll < 0.9) this.knock();
      else this.whisper();
    }
  }
}
