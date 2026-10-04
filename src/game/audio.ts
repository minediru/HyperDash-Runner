/**
 * Web Audio API による完全内蔵型プロシージャル・オーディオシステム
 * V8エンジン音、ハードEDM（Hard Cyberpunk / Darksynth EDM）、爆発音、粉砕音をリアルタイム合成
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private isEngineRunning: boolean = false;

  // ハードEDM BGM エンジン
  private isEdmRunning: boolean = false;
  private edmStep: number = 0;
  private nextNoteTime: number = 0;
  private edmTimerId: number | null = null;
  private isNitroActive: boolean = false;
  private bgmMasterGain: GainNode | null = null;

  // ノイズバッファ（スネア・ハイハット・爆発用）
  private noiseBuffer: AudioBuffer | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.bgmMasterGain = this.ctx.createGain();
      this.bgmMasterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.28, this.ctx.currentTime);
      this.bgmMasterGain.connect(this.ctx.destination);
      this.createNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.engineGain) {
        this.engineGain.gain.setValueAtTime(muted ? 0 : 0.07, now);
      }
      if (this.bgmMasterGain) {
        this.bgmMasterGain.gain.setValueAtTime(muted ? 0 : 0.28, now);
      }
    }
  }

  /**
   * V8エンジンのアイドリング〜高速唸り音
   */
  public startEngine() {
    if (this.isEngineRunning) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.07, this.ctx.currentTime);

      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

      this.engineSubOsc = this.ctx.createOscillator();
      this.engineSubOsc.type = 'triangle';
      this.engineSubOsc.frequency.setValueAtTime(27.5, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, this.ctx.currentTime);

      this.engineOsc.connect(filter);
      this.engineSubOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
      this.engineSubOsc.start();
      this.isEngineRunning = true;

      // ハードEDM BGM開始！
      this.startHardEdm();
    } catch {
      // Audio policy fallback
    }
  }

  public setNitroActive(active: boolean) {
    this.isNitroActive = active;
  }

  public updateEnginePitch(speedRatio: number, isNitro: boolean) {
    this.isNitroActive = isNitro;
    if (!this.isEngineRunning || !this.ctx || !this.engineOsc || !this.engineSubOsc) return;
    const baseFreq = 48 + speedRatio * 50 + (isNitro ? 60 : 0);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);
    this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, this.ctx.currentTime, 0.05);
  }

  public stopEngine() {
    this.stopHardEdm();
    if (!this.isEngineRunning) return;
    try {
      this.engineOsc?.stop();
      this.engineSubOsc?.stop();
      this.engineOsc?.disconnect();
      this.engineSubOsc?.disconnect();
      this.engineGain?.disconnect();
    } catch {
      // ignore
    }
    this.isEngineRunning = false;
  }

  /* ========================================================
   * ⚡ 超疾走ノリノリ・ハイパーユーロEDMエンジン (154 BPM)
   * 突き抜ける爽快感 ＆ オクターブ跳ねベース ＆ キャッチーなエモーショナルリード
   * ======================================================== */

  public startHardEdm() {
    if (this.isEdmRunning) return;
    this.initContext();
    if (!this.ctx) return;

    if (this.bgmMasterGain) {
      this.bgmMasterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.32, this.ctx.currentTime);
    }

    this.isEdmRunning = true;
    this.edmStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    // Web Audio 先読みスケジューラ
    const scheduler = () => {
      if (!this.isEdmRunning || !this.ctx) return;

      // 0.1秒先までスケジュール
      while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
        this.scheduleEdmStep(this.edmStep, this.nextNoteTime);
        // 154 BPM, 16分音符 = 60 / 154 / 4 = 約0.0974秒
        const stepTime = (60 / 154) / 4;
        this.nextNoteTime += stepTime;
        this.edmStep = (this.edmStep + 1) % 64; // 4小節（64ステップ）ループ
      }

      this.edmTimerId = window.setTimeout(scheduler, 25);
    };

    scheduler();
  }

  public stopHardEdm() {
    this.isEdmRunning = false;
    if (this.edmTimerId !== null) {
      clearTimeout(this.edmTimerId);
      this.edmTimerId = null;
    }
    // 即座にゲインをゼロにして音の残りを遮断
    if (this.bgmMasterGain && this.ctx) {
      this.bgmMasterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  private scheduleEdmStep(step: number, time: number) {
    if (!this.ctx || !this.bgmMasterGain || this.isMuted) return;

    if (this.isNitroActive) {
      // ⚡ ニトロ中専用：超カッコいい覚醒ハイパー・オーバードライブBGM！
      this.scheduleNitroStep(step, time);
    } else {
      // 🏎️ 通常時：154 BPM 超疾走ユーロEDM
      this.scheduleNormalStep(step, time);
    }
  }

  /**
   * 🏎️ 通常走行BGM（154 BPM 超疾走ユーロEDM）
   */
  private scheduleNormalStep(step: number, time: number) {
    // 1. 【パンチの効いたユーロダンス・キック】（4つ打ち: step 0, 4, 8, 12, ...）
    if (step % 4 === 0) {
      this.triggerKick(time, false);
    }

    // 2. 【爽快スネア / クラップ】（2拍目・4拍目: step 4, 12, 20, 28, ...）
    if (step % 8 === 4) {
      this.triggerSnare(time, false);
    }

    // 3. 【ノリノリ・オープンハイハット】（各拍のウラ: step 2, 6, 10, 14... ＆ 16分ロール）
    if (step % 4 === 2) {
      this.triggerHiHat(time, true, 0.22);
    } else {
      const isRoll = step % 8 === 7 || step % 16 === 14;
      this.triggerHiHat(time, false, isRoll ? 0.14 : 0.08);
    }

    // 4. 【オクターブ跳ねのノリノリ・ドライビングベース】
    let rootFreq = 55.0; // A1
    if (step >= 16 && step < 32) rootFreq = 43.65; // F1
    else if (step >= 32 && step < 48) rootFreq = 49.00; // G1
    else if (step >= 48) rootFreq = 41.20; // E1

    const isHighOctave = step % 2 === 1;
    const bassFreq = isHighOctave ? rootFreq * 2 : rootFreq;
    this.triggerBass(time, bassFreq, isHighOctave, false);

    // 5. 【キラキラ・高速アルペジオ】
    const arpNotes = [
      440, 523.25, 659.25, 880, 659.25, 523.25, 440, 523.25,
      659.25, 880, 1046.5, 880, 659.25, 523.25, 659.25, 880,
      349.23, 440, 523.25, 698.46, 523.25, 440, 349.23, 440,
      523.25, 698.46, 880, 698.46, 523.25, 440, 523.25, 698.46,
      392, 493.88, 587.33, 783.99, 587.33, 493.88, 392, 493.88,
      587.33, 783.99, 987.77, 783.99, 587.33, 493.88, 587.33, 783.99,
      329.63, 392, 493.88, 659.25, 493.88, 392, 329.63, 392,
      493.88, 659.25, 783.99, 659.25, 587.33, 493.88, 440, 493.88,
    ];
    const arpFq = arpNotes[step];
    if (arpFq) {
      this.triggerArp(time, arpFq, false);
    }

    // 6. 【超キャッチー＆ノリノリの爽快リードメロディ】
    const leadNotes = [
      880, 0, 880, 1046.5,
      1318.5, 0, 1174.66, 1046.5,
      987.77, 0, 1046.5, 0,
      1174.66, 0, 1046.5, 987.77,

      880, 0, 698.46, 880,
      1046.5, 0, 1318.5, 0,
      1174.66, 0, 1046.5, 0,
      880, 0, 1046.5, 0,

      783.99, 0, 987.77, 1174.66,
      1318.5, 0, 1567.98, 0,
      1318.5, 0, 1174.66, 0,
      987.77, 1046.5, 1174.66, 0,

      1318.5, 0, 1174.66, 1046.5,
      987.77, 0, 1046.5, 987.77,
      880, 0, 783.99, 0,
      880, 0, 987.77, 0,
    ];

    const leadFreq = leadNotes[step];
    if (leadFreq > 0) {
      this.triggerLead(time, leadFreq, false);
    }
  }

  /**
   * ⚡ ニトロ中専用BGM（HYPER NITRO OVERDRIVE - 怒涛のサイバートランス＆メタルEDM）
   * 完全に別の攻撃的キック連打 ＆ アシッドベース ＆ 鋭利な覚醒リード！
   */
  private scheduleNitroStep(step: number, time: number) {
    // 1. 【超攻撃的マシンガン・ガバキック】
    // 4つ打ち＋拍頭のダブル連打（step 0, 2, 4, 8, 10, 12, 14, 15）
    const isKickStep = step % 4 === 0 || step % 8 === 2 || step % 16 === 15;
    if (isKickStep) {
      this.triggerNitroKick(time);
    }

    // 2. 【炸裂サイバー・スネア】（2拍・4拍 ＆ フィルイン）
    if (step % 8 === 4 || step % 16 === 14) {
      this.triggerNitroSnare(time);
    }

    // 3. 【怒涛のハイハット乱れ撃ち】
    const isHiHatOpen = step % 4 === 2;
    this.triggerHiHat(time, isHiHatOpen, isHiHatOpen ? 0.28 : 0.12);

    // 4. 【凶暴アシッド・オーバードライブベース】
    // Dm (0-15) -> Bb (16-31) -> C (32-47) -> A (48-63) の激アツ進行
    let nitroRoot = 73.42; // D2
    if (step >= 16 && step < 32) nitroRoot = 58.27; // Bb1
    else if (step >= 32 && step < 48) nitroRoot = 65.41; // C2
    else if (step >= 48) nitroRoot = 55.00; // A1

    // 16分の猛烈なリバース・アシッドスライド（裏拍に高音フィルター）
    const nitroBassFreq = step % 2 === 1 ? nitroRoot * 1.5 : nitroRoot;
    this.triggerNitroBass(time, nitroBassFreq, step % 4 === 2);

    // 5. 【超高速レーザーアルペジオ】
    const laserFreqs = [
      1174.66, 1396.91, 1760.00, 2349.32, 1760.00, 1396.91, 1174.66, 1396.91,
      932.33, 1174.66, 1396.91, 1864.66, 1396.91, 1174.66, 932.33, 1174.66,
      1046.50, 1318.51, 1567.98, 2093.00, 1567.98, 1318.51, 1046.50, 1318.51,
      880.00, 1100.00, 1318.51, 1760.00, 1318.51, 1100.00, 1318.51, 1760.00,
    ];
    const laserFq = laserFreqs[step % 32];
    this.triggerLaserArp(time, laserFq);

    // 6. 【ニトロ専用覚醒リード：超クールなサイバーメタル・トランスリフ】
    // 通常BGMとは完全に異なる、アドレナリン極限突破のメロディライン！
    const nitroLeadNotes = [
      // Bar 1: Dm (急襲・超加速！)
      1174.66, 1174.66, 0, 1396.91,   // D6, D6, _, F6
      1760.00, 0, 1567.98, 1396.91,   // A6, _, G6, F6
      1174.66, 0, 1396.91, 1567.98,   // D6, _, F6, G6
      1760.00, 0, 2093.00, 1760.00,   // A6, _, C7, A6

      // Bar 2: Bb (重厚な突き抜け！)
      1864.66, 0, 1760.00, 1567.98,   // Bb6, _, A6, G6
      1760.00, 0, 1567.98, 1396.91,   // A6, _, G6, F6
      1567.98, 0, 1396.91, 1174.66,   // G6, _, F6, D6
      1396.91, 1567.98, 1760.00, 0,   // F6, G6, A6, _

      // Bar 3: C (絶頂・ハイパーチャージ！)
      2093.00, 0, 1760.00, 2093.00,   // C7, _, A6, C7
      2349.32, 0, 2093.00, 1760.00,   // D7, _, C7, A6
      1567.98, 0, 1760.00, 2093.00,   // G6, _, A6, C7
      2349.32, 0, 2637.02, 2349.32,   // D7, _, E7, D7

      // Bar 4: A (クライマックスからのキメ！)
      2200.00, 0, 1760.00, 0,         // C#7, _, A6, _
      1975.53, 0, 1760.00, 1567.98,   // B6, _, A6, G6
      1760.00, 1567.98, 1396.91, 1174.66, // A6, G6, F6, D6
      1174.66, 0, 1760.00, 0,         // D6, _, A6, _
    ];

    const nLead = nitroLeadNotes[step];
    if (nLead > 0) {
      this.triggerNitroLead(time, nLead);
    }
  }

  // --- キックサウンド合成 ---
  private triggerKick(time: number, isNitro: boolean) {
    if (!this.ctx || !this.bgmMasterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // 175Hz から 45Hz へ急速ピッチドロップ（タイトでパンチのあるダンスキック）
    osc.frequency.setValueAtTime(isNitro ? 200 : 175, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.075);

    const kickVol = isNitro ? 1.0 : 0.88;
    gain.gain.setValueAtTime(kickVol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.19);

    osc.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc.start(time);
    osc.stop(time + 0.2);

    // アタッククリック（抜けの良いキック頭のパチッとした音）
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(600, time);
    clickOsc.frequency.exponentialRampToValueAtTime(80, time + 0.02);
    clickGain.gain.setValueAtTime(0.35, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
    clickOsc.connect(clickGain);
    clickGain.connect(this.bgmMasterGain);
    clickOsc.start(time);
    clickOsc.stop(time + 0.03);
  }

  // --- スネア / クラップ合成 ---
  private triggerSnare(time: number, isNitro: boolean) {
    if (!this.ctx || !this.bgmMasterGain || !this.noiseBuffer) return;

    // クラップノイズ
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isNitro ? 2200 : 1500, time);
    filter.Q.setValueAtTime(2.0, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.48, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.bgmMasterGain);

    noise.start(time);
    noise.stop(time + 0.16);

    // スネアのボディ（トーン）
    const toneOsc = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();
    toneOsc.type = 'triangle';
    toneOsc.frequency.setValueAtTime(240, time);
    toneOsc.frequency.exponentialRampToValueAtTime(90, time + 0.07);
    toneGain.gain.setValueAtTime(0.32, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    toneOsc.connect(toneGain);
    toneGain.connect(this.bgmMasterGain);

    toneOsc.start(time);
    toneOsc.stop(time + 0.09);
  }

  // --- ハイハット合成 ---
  private triggerHiHat(time: number, isOpen: boolean, volume: number) {
    if (!this.ctx || !this.bgmMasterGain || !this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(isOpen ? 8000 : 9500, time);

    const gain = this.ctx.createGain();
    const dur = isOpen ? 0.12 : 0.035;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  // --- オクターブ跳ね・ドライビングベース合成 ---
  private triggerBass(time: number, freq: number, isHighOctave: boolean, isNitro: boolean) {
    if (!this.ctx || !this.bgmMasterGain) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    // 高音オクターブは明るく開くことで「ドゥン・タン」のリズム感を強調！
    const baseCutoff = isHighOctave ? (isNitro ? 3600 : 2200) : (isNitro ? 2000 : 950);
    filter.frequency.setValueAtTime(baseCutoff, time);
    filter.frequency.exponentialRampToValueAtTime(isNitro ? 800 : 400, time + 0.08);
    filter.Q.setValueAtTime(isNitro ? 5.5 : 3.5, time);

    const dur = 0.085;
    const vol = isHighOctave ? 0.36 : 0.44;
    gain.gain.setValueAtTime(isNitro ? vol * 1.2 : vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  // --- キラキラ高速アルペジオ合成 ---
  private triggerArp(time: number, freq: number, isNitro: boolean) {
    if (!this.ctx || !this.bgmMasterGain) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isNitro ? 4500 : 2500, time);
    filter.frequency.exponentialRampToValueAtTime(800, time + 0.07);

    const dur = 0.065;
    gain.gain.setValueAtTime(isNitro ? 0.18 : 0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  // --- キャッチー＆爽快なユーロダンス・リードシンセ合成 ---
  private triggerLead(time: number, freq: number, isNitro: boolean) {
    if (!this.ctx || !this.bgmMasterGain) return;

    // デュアル・ソー（デチューンで突き抜ける爽快感）
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // ニトロ時はさらにオクターブ上のハーモニクスを付与
    const playFreq = isNitro ? freq * 1.0 : freq;
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(playFreq, time);
    osc2.frequency.setValueAtTime(playFreq * 1.006, time); // 華やかなデチューン

    filter.type = 'lowpass';
    const cutoff = isNitro ? 8000 : 4200;
    filter.frequency.setValueAtTime(cutoff, time);
    filter.frequency.exponentialRampToValueAtTime(isNitro ? 4000 : 1800, time + 0.16);
    filter.Q.setValueAtTime(isNitro ? 4.5 : 2.5, time);

    const dur = 0.16;
    const vol = isNitro ? 0.35 : 0.26;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.02);
    osc2.stop(time + dur + 0.02);
  }

  /* ========================================================
   * ⚡ ニトロ専用ハイパーシンセ音源群 (NITRO OVERDRIVE SYNTHS)
   * ======================================================== */

  // --- ニトロ専用：マシンガン・ガバキック ---
  private triggerNitroKick(time: number) {
    if (!this.ctx || !this.bgmMasterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth'; // ノコギリ波で攻撃的な歪み！
    osc.frequency.setValueAtTime(260, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.07);

    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc.start(time);
    osc.stop(time + 0.17);
  }

  // --- ニトロ専用：炸裂サイバースネア ---
  private triggerNitroSnare(time: number) {
    if (!this.ctx || !this.bgmMasterGain || !this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, time);
    filter.Q.setValueAtTime(3.0, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.55, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.bgmMasterGain);

    noise.start(time);
    noise.stop(time + 0.15);
  }

  // --- ニトロ専用：凶暴アシッド・オーバードライブベース ---
  private triggerNitroBass(time: number, freq: number, isResonant: boolean) {
    if (!this.ctx || !this.bgmMasterGain) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    const cutoff = isResonant ? 4800 : 2800;
    filter.frequency.setValueAtTime(cutoff, time);
    filter.frequency.exponentialRampToValueAtTime(450, time + 0.08);
    filter.Q.setValueAtTime(isResonant ? 8.0 : 5.0, time); // アシッド特有の鋭いレゾナンス！

    const dur = 0.088;
    gain.gain.setValueAtTime(0.48, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  // --- ニトロ専用：高速レーザーアルペジオ ---
  private triggerLaserArp(time: number, freq: number) {
    if (!this.ctx || !this.bgmMasterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    // 急速ピッチダウンで「ピュン！」と空間を切り裂く
    osc.frequency.setValueAtTime(freq * 1.4, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.04);

    gain.gain.setValueAtTime(0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc.start(time);
    osc.stop(time + 0.07);
  }

  // --- ニトロ専用：覚醒サイバーメタル・リードシンセ ---
  private triggerNitroLead(time: number, freq: number) {
    if (!this.ctx || !this.bgmMasterGain) return;

    // トリプル・オシレーター（超重厚なスーパードライブ）
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc3.type = 'square';

    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.008, time);  // デチューン上
    osc3.frequency.setValueAtTime(freq * 0.992, time);  // デチューン下

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(9000, time);
    filter.frequency.exponentialRampToValueAtTime(3200, time + 0.16);
    filter.Q.setValueAtTime(4.0, time);

    const dur = 0.15;
    gain.gain.setValueAtTime(0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc1.start(time);
    osc2.start(time);
    osc3.start(time);
    osc1.stop(time + dur + 0.02);
    osc2.stop(time + dur + 0.02);
    osc3.stop(time + dur + 0.02);
  }

  /* ========================================================
   * 効果音 (SFX) 群
   * ======================================================== */

  /**
   * ジャンプ / ガス噴射音
   */
  public playJump() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.18);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * 大ジャンプ台カタパルト射出音（WOOOOSH!!）
   */
  public playSuperJump() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.4);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.48);
  }

  /**
   * 敵車ルーフ着地・STOMP踏み潰し撃破音（CRUSH!!）
   */
  public playStompCrush() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 低音インパクト
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(180, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.28);

    subGain.gain.setValueAtTime(0.45, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.32);

    // 金属クラッシュ
    this.playCrashMetal(now, 0.4);
  }

  /**
   * ラム突撃発動時のジェット噴射音
   */
  public playRamEngage() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.linearRampToValueAtTime(260, now + 0.12);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  /**
   * 金属粉砕・破壊音（RAM突撃ヒット時）
   */
  public playSmash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    this.playCrashMetal(now, 0.5);

    const lowOsc = this.ctx.createOscillator();
    const lowGain = this.ctx.createGain();
    lowOsc.type = 'triangle';
    lowOsc.frequency.setValueAtTime(120, now);
    lowOsc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

    lowGain.gain.setValueAtTime(0.45, now);
    lowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    lowOsc.connect(lowGain);
    lowGain.connect(this.ctx.destination);

    lowOsc.start(now);
    lowOsc.stop(now + 0.38);
  }

  /**
   * 被弾ダメージ音
   */
  public playDamage() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * スクラップ缶・燃料回収音（高音チャリン・チャリン）
   */
  public playPickup() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';

    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1320, now + 0.06);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * ニトロ点火音（「ズビビビビーーーッ！！」という超強烈な電撃加速ブースト音）
   */
  public playNitroIgnite() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    this.playCrashMetal(now, 0.45);

    // 1. 強烈な「ビビビビーーーッ！！」電撃パルス（高速トレモロ変調）
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // 220Hzから一気に1800Hzへ急上昇！
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.38);

    // 65Hzの高速LFOで「ビビビビビッ！」と激しく震わせる！
    lfo.type = 'square';
    lfo.frequency.setValueAtTime(65, now);
    lfoGain.gain.setValueAtTime(450, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3500, now);
    filter.frequency.linearRampToValueAtTime(7500, now + 0.25);
    filter.Q.setValueAtTime(6.0, now); // レゾナンスを効かせてエレクトリックに！

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.55);
    osc.stop(now + 0.55);

    // 2. 重低音ジェットブースト（ドオォォン！）
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.4);

    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.46);
  }

  /**
   * 【超明確！】ニトロ終了音（「ビビビッ！ブビビビーッ！」とハッキリ分かる冷却・減衰＆衝撃音）
   */
  public playNitroExpire() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // BGMを一瞬0.3秒間ダッキング（音量を下げて終了音を目立たせる！）
    if (this.bgmMasterGain) {
      this.bgmMasterGain.gain.cancelScheduledValues(now);
      this.bgmMasterGain.gain.setValueAtTime(0.08, now);
      this.bgmMasterGain.gain.linearRampToValueAtTime(0.32, now + 0.45);
    }

    // 1. 「ビビビッ！」とハッキリ下降する3連パルス音（音量アップ＆キレ強化）
    const pulseFreqs = [1400, 950, 520];
    pulseFreqs.forEach((freq, i) => {
      const pOsc = this.ctx!.createOscillator();
      const pGain = this.ctx!.createGain();
      const pTime = now + i * 0.06;

      pOsc.type = 'sawtooth';
      pOsc.frequency.setValueAtTime(freq, pTime);
      pOsc.frequency.exponentialRampToValueAtTime(freq * 0.5, pTime + 0.055);

      pGain.gain.setValueAtTime(0.65, pTime);
      pGain.gain.exponentialRampToValueAtTime(0.001, pTime + 0.06);

      pOsc.connect(pGain);
      pGain.connect(this.ctx!.destination);

      pOsc.start(pTime);
      pOsc.stop(pTime + 0.065);
    });

    // 2. 締めくくりの「ブビビビーッ（減速・パワーカット）」ロングトーン
    const tailOsc = this.ctx.createOscillator();
    const tailLfo = this.ctx.createOscillator();
    const tailLfoGain = this.ctx.createGain();
    const tailGain = this.ctx.createGain();
    const tailFilter = this.ctx.createBiquadFilter();

    const tailStart = now + 0.18;
    tailOsc.type = 'square';
    tailOsc.frequency.setValueAtTime(420, tailStart);
    tailOsc.frequency.exponentialRampToValueAtTime(60, tailStart + 0.4);

    // 55HzのLFOで「ビビビビッ」と震わせながら下降
    tailLfo.type = 'sawtooth';
    tailLfo.frequency.setValueAtTime(55, tailStart);
    tailLfoGain.gain.setValueAtTime(220, tailStart);
    tailLfo.connect(tailLfoGain);
    tailLfoGain.connect(tailOsc.frequency);

    tailFilter.type = 'lowpass';
    tailFilter.frequency.setValueAtTime(2200, tailStart);
    tailFilter.frequency.linearRampToValueAtTime(250, tailStart + 0.4);
    tailFilter.Q.setValueAtTime(5, tailStart);

    tailGain.gain.setValueAtTime(0.7, tailStart);
    tailGain.gain.exponentialRampToValueAtTime(0.001, tailStart + 0.42);

    tailOsc.connect(tailFilter);
    tailFilter.connect(tailGain);
    tailGain.connect(this.ctx.destination);

    tailLfo.start(tailStart);
    tailOsc.start(tailStart);
    tailLfo.stop(tailStart + 0.45);
    tailOsc.stop(tailStart + 0.45);

    // 3. 減速衝撃低音（ガクン！と落ちる重低音ドロップ）
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
    subGain.gain.setValueAtTime(0.65, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.4);

    // 4. ターボ排気エアブリード（プシューン！）
    if (this.noiseBuffer) {
      const airNoise = this.ctx.createBufferSource();
      airNoise.buffer = this.noiseBuffer;
      const airFilter = this.ctx.createBiquadFilter();
      airFilter.type = 'bandpass';
      airFilter.frequency.setValueAtTime(2600, now + 0.04);
      airFilter.frequency.exponentialRampToValueAtTime(500, now + 0.5);

      const airGain = this.ctx.createGain();
      airGain.gain.setValueAtTime(0.45, now + 0.04);
      airGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      airNoise.connect(airFilter);
      airFilter.connect(airGain);
      airGain.connect(this.ctx.destination);

      airNoise.start(now + 0.04);
      airNoise.stop(now + 0.52);
    }
  }

  /**
   * ニトロ終了カウントダウン音（3, 2, 1）
   */
  public playNitroCountdown(stage: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    // stage 3 -> 880Hz, stage 2 -> 1174Hz, stage 1 -> 1567Hz（だんだん高くなる！）
    const freq = stage === 3 ? 880 : stage === 2 ? 1174 : 1567;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * ゲームオーバー（大爆発）
   */
  public playGameOver() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    this.playCrashMetal(now, 0.65);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.8);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 1.0);
  }

  /**
   * ニトロ終了0.6秒前の予告アラート（「ビビッ！ビビッ！」）
   */
  public playNitroWarning() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [0, 0.14, 0.28].forEach((offset, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(idx === 2 ? 1480 : 1250, now + offset);

      gain.gain.setValueAtTime(0.35, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.07);
    });
  }

  /**
   * 金属衝突ノイズ合成ヘルパー
   */
  private playCrashMetal(now: number, volume: number) {
    if (!this.ctx || !this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.linearRampToValueAtTime(850, now + 0.2);
    filter.frequency.linearRampToValueAtTime(320, now + 0.45);
    filter.Q.setValueAtTime(2.2, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.5);
  }

  /**
   * 火炎放射器車の放射音（ゴーッ！！）
   */
  public playFlamethrower() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.noiseBuffer) return;

    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.linearRampToValueAtTime(1400, now + 0.15);
    filter.frequency.linearRampToValueAtTime(400, now + 0.6);
    filter.Q.setValueAtTime(3.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.7);
  }

  public playRam() {
    this.playSmash();
    this.playRamEngage();
  }

  public playExplosion() {
    this.playGameOver();
  }

  public playStompSmash() {
    this.playStompCrush();
  }

  public playWitnessShout() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  }
}

export const soundManager = new SoundManager();
