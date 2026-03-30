// ===== Audio Engine — Procedural Sound Effects via Web Audio API =====

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.3;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  // --- Helper: play a tone ---
  _playTone(freq, duration, type = 'sine', gain = this.volume, startTime = 0) {
    if (!this.enabled || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
    gainNode.gain.setValueAtTime(gain, this.ctx.currentTime + startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  // --- Helper: play noise burst ---
  _playNoise(duration, gain = 0.1, startTime = 0) {
    if (!this.enabled || !this.ctx) return;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const source = this.ctx.createBufferSource();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime + startTime);
    gainNode.gain.setValueAtTime(gain, this.ctx.currentTime + startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    source.start(this.ctx.currentTime + startTime);
    source.stop(this.ctx.currentTime + startTime + duration);
  }

  // === Public Sound Effects ===

  playCountdownBeep() {
    this.init();
    this._playTone(880, 0.15, 'sine', 0.25);
    this._playTone(880, 0.05, 'square', 0.05);
  }

  playShoot() {
    this.init();
    this._playTone(1200, 0.1, 'sine', 0.3);
    this._playTone(1600, 0.15, 'sine', 0.3, 0.05);
    this._playTone(2000, 0.2, 'sine', 0.2, 0.1);
    this._playNoise(0.1, 0.08);
  }

  playWin() {
    this.init();
    // Ascending triumphant arpeggio
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      this._playTone(freq, 0.25, 'sine', 0.2, i * 0.1);
      this._playTone(freq, 0.25, 'triangle', 0.1, i * 0.1);
    });
    this._playNoise(0.05, 0.06, 0.35);
  }

  playLose() {
    this.init();
    // Descending sad tones
    const notes = [400, 350, 300, 250];
    notes.forEach((freq, i) => {
      this._playTone(freq, 0.3, 'sawtooth', 0.08, i * 0.12);
    });
  }

  playDraw() {
    this.init();
    // Neutral double beep
    this._playTone(600, 0.15, 'sine', 0.2);
    this._playTone(600, 0.15, 'sine', 0.2, 0.2);
  }

  playStreakBonus() {
    this.init();
    // Celebration fanfare
    const notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach((freq, i) => {
      this._playTone(freq, 0.15, 'sine', 0.2, i * 0.08);
      this._playTone(freq * 1.5, 0.15, 'triangle', 0.08, i * 0.08);
    });
    this._playNoise(0.08, 0.1, 0.4);
    this._playNoise(0.06, 0.08, 0.5);
  }

  playClick() {
    this.init();
    this._playTone(1000, 0.05, 'sine', 0.1);
    this._playNoise(0.02, 0.04);
  }
}

// Export singleton
window.audioEngine = new AudioEngine();
