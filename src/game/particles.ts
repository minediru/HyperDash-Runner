import { GAME_CONSTANTS } from './constants';
import { Particle } from './types';

export class ParticleSystem {
  public particles: Particle[] = [];

  public clear() {
    this.particles = [];
  }

  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // 重力適用（破片・タイヤ・金属スクラップ）
      if (p.type === 'DEBRIS' || p.type === 'WHEEL_DEBRIS' || p.type === 'METAL_SCRAP') {
        p.vy += GAME_CONSTANTS.PHYSICS.GRAVITY * 0.85 * dt;

        // 地面でのバウンド反射
        const ground = GAME_CONSTANTS.GROUND_Y;
        if (p.y >= ground) {
          p.y = ground;
          p.vy = -p.vy * 0.45; // 反発
          p.vx *= 0.8; // 摩擦
        }
      }

      if (p.vRot && p.rotation !== undefined) {
        p.rotation += p.vRot * dt;
      }

      p.alpha -= p.decay * dt;
      if (p.alpha <= 0 || p.x < -200 || p.y > 800) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * 爆発エフェクト
   */
  public emitExplosion(x: number, y: number, intensity: number = 1.0) {
    const fireColors = ['#fef08a', '#facc15', '#f97316', '#ef4444', '#7f1d1d'];

    // 火炎ボール
    for (let i = 0; i < Math.floor(20 * intensity); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 320 * intensity;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 14 + Math.random() * 22 * intensity,
        color: fireColors[Math.floor(Math.random() * fireColors.length)],
        alpha: 1.0,
        decay: 1.4 + Math.random() * 1.6,
        type: 'FIRE',
      });
    }

    // 火花スパーク
    for (let i = 0; i < Math.floor(25 * intensity); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 450 * intensity;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: '#fef08a',
        alpha: 1.0,
        decay: 2.0 + Math.random() * 2.0,
        type: 'SPARK',
      });
    }
  }

  /**
   * 敵車粉砕時のリアルなスクラップ飛散演出（飛び散るタイヤ・引き裂かれた装甲パーツ）
   */
  public emitCarDestruction(x: number, y: number, wheelCount: number = 2) {
    // 1. 飛び散るタイヤ（地面をバウンドしてゴロゴロ転がる！）
    for (let i = 0; i < wheelCount; i++) {
      const angle = -Math.PI * 0.7 + (Math.random() - 0.5) * 0.8;
      const speed = 250 + Math.random() * 320;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed + 100,
        vy: Math.sin(angle) * speed - 200,
        size: 14 + Math.random() * 6,
        color: '#0f172a',
        alpha: 1.0,
        decay: 0.45, // 長めに残って転がる
        type: 'WHEEL_DEBRIS',
        rotation: 0,
        vRot: (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 15),
      });
    }

    // 2. 引き裂かれた金属装甲プレート・ドア・パイプ
    const scrapColors = ['#b45309', '#78716c', '#dc2626', '#334155'];
    for (let i = 0; i < 12; i++) {
      const angle = -Math.PI * 0.8 + Math.random() * Math.PI * 0.7;
      const speed = 200 + Math.random() * 400;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 220,
        size: 8 + Math.random() * 16,
        color: scrapColors[Math.floor(Math.random() * scrapColors.length)],
        alpha: 1.0,
        decay: 0.6,
        type: 'METAL_SCRAP',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 20,
      });
    }
  }

  /**
   * 排気管マフラーからの排気・ニトロ火炎
   */
  public emitExhaust(x: number, y: number, isNitro: boolean) {
    const rate = isNitro ? 5 : 2;
    for (let i = 0; i < rate; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * 0.4;
      const speed = isNitro ? 280 + Math.random() * 220 : 120 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 40,
        size: isNitro ? 12 + Math.random() * 14 : 6 + Math.random() * 8,
        color: isNitro ? (Math.random() > 0.4 ? '#38bdf8' : '#06b6d4') : (Math.random() > 0.5 ? '#f97316' : '#44403c'),
        alpha: isNitro ? 0.95 : 0.6,
        decay: isNitro ? 3.0 : 1.8,
        type: isNitro ? 'NITRO' : 'FIRE',
      });
    }
  }

  /**
   * 未舗装の赤土荒野を疾走するタイヤからの激しい赤砂塵・飛び散る小石
   */
  public emitDust(x: number, y: number) {
    if (Math.random() > 0.45) return;
    const dustColors = ['#9a3412', '#7c2d12', '#c2410c', '#5a1d06'];
    this.particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y - 4,
      vx: -180 - Math.random() * 220,
      vy: -25 - Math.random() * 65,
      size: 9 + Math.random() * 16,
      color: dustColors[Math.floor(Math.random() * dustColors.length)],
      alpha: 0.55,
      decay: 1.4,
      type: 'SAND',
    });

    // 跳ね飛ぶ赤土の小石
    if (Math.random() < 0.25) {
      this.particles.push({
        x: x + 4,
        y: y - 2,
        vx: -140 - Math.random() * 180,
        vy: -70 - Math.random() * 120,
        size: 3 + Math.random() * 4,
        color: '#451a03',
        alpha: 0.85,
        decay: 1.8,
        type: 'DEBRIS',
      });
    }
  }

  /**
   * 赤い砂嵐粒子の激しい横殴り放出
   */
  public emitSandstormWind(w: number, h: number) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: w + 20,
        y: Math.random() * GAME_CONSTANTS.GROUND_Y,
        vx: -1200 - Math.random() * 600,
        vy: 100 + Math.random() * 150,
        size: 3 + Math.random() * 6,
        color: Math.random() > 0.4 ? '#b91c1c' : '#78350f',
        alpha: 0.7,
        decay: 1.2,
        type: 'SAND',
      });
    }
  }

  /**
   * 【新登場】火炎放射器車からの前方火炎ジェット噴射（適正な範囲に調整）
   */
  public emitFlamethrowerFlame(x: number, y: number) {
    const fireColors = ['#fef08a', '#facc15', '#f97316', '#ef4444', '#b91c1c'];
    for (let i = 0; i < 3; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * 0.25; // 前方（左向き）
      const speed = 220 + Math.random() * 150; // 飛翔速度を半分に抑える
      this.particles.push({
        x,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 20,
        size: 10 + Math.random() * 12,
        color: fireColors[Math.floor(Math.random() * fireColors.length)],
        alpha: 0.9,
        decay: 3.6 + Math.random() * 1.6,
        type: 'FIRE',
      });
    }
  }

  /**
   * 【新登場】モヒカンバイク乗り粉砕時のライダー吹き飛び破片
   */
  public emitMohawkDebris(x: number, y: number) {
    // 赤いモヒカンヘアの破片
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI * 0.7 + (Math.random() - 0.5) * 0.8;
      const speed = 250 + Math.random() * 350;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 180,
        size: 8 + Math.random() * 12,
        color: '#ef4444', // 鮮血モヒカンレッド
        alpha: 1.0,
        decay: 0.55,
        type: 'METAL_SCRAP',
        rotation: 0,
        vRot: (Math.random() - 0.5) * 25,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);

      // A. タイヤの飛び散り描画（黒いゴムタイヤ＋シルバーハブ）
      if (p.type === 'WHEEL_DEBRIS' && p.rotation !== undefined) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        // 黒タイヤ
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        // シルバーリム
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.stroke();
        // スポーク十字
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-2, -p.size + 3, 4, (p.size - 3) * 2);
        ctx.fillRect(-p.size + 3, -2, (p.size - 3) * 2, 4);
        ctx.restore();
        continue;
      }

      // B. 引き裂かれた装甲金属板
      if (p.type === 'METAL_SCRAP' && p.rotation !== undefined) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.strokeRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
        continue;
      }

      // C. 通常のパーティクル
      ctx.fillStyle = p.color;
      if (p.type === 'DEBRIS' && p.rotation !== undefined) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
