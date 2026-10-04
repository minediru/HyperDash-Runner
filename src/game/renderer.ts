import { GAME_CONSTANTS } from './constants';
import { ParticleSystem } from './particles';
import { renderPlayerAvatar } from './playerSprite';
import { CameraState, FloatingText, Obstacle, Player } from './types';

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public customSpriteImg: HTMLImageElement | null = null;
  private animTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  public setCustomSprite(img: HTMLImageElement | null) {
    this.customSpriteImg = img;
  }

  /**
   * メイン描画フレーム
   */
  public render(
    player: Player,
    obstacles: Obstacle[],
    particles: ParticleSystem,
    floatingTexts: FloatingText[],
    distance: number,
    camera: CameraState,
    speed: number,
    nitroExpiredBannerTimer: number = 0
  ) {
    this.animTimer += 0.05;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();

    // 1. カメラ揺れ（Trauma Shake）とズーム
    if (camera.shake > 0) {
      ctx.translate(camera.shakeX, camera.shakeY);
    }

    if (camera.zoom !== 1.0) {
      ctx.translate(w / 2, h / 2);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(-w / 2, -h / 2);
    }

    // 天候判定：距離に応じた赤い巨大砂嵐（RED SANDSTORM）
    const isSandstorm = (distance % 1400) > 750;
    if (isSandstorm) {
      particles.emitSandstormWind(w, h);
    }

    // 2. 荒野・マッドマックス空（殺伐とした毒性スモッグ＆トキシックスカイ）
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (isSandstorm) {
      skyGrad.addColorStop(0, '#120202');
      skyGrad.addColorStop(0.45, '#5c0f0f');
      skyGrad.addColorStop(0.8, '#310606');
    } else {
      skyGrad.addColorStop(0, '#0a0502'); // 焦げた暗黒空
      skyGrad.addColorStop(0.35, '#2e1005'); // 煤煙
      skyGrad.addColorStop(0.65, '#852d0a'); // 燃え盛る荒野の夕日
      skyGrad.addColorStop(0.9, '#451a03'); // 砂塵アンバー
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-50, -50, w + 100, h + 100);

    // 世紀末の象徴：遠くで燃え盛る巨大な黒煙の柱（油田・製油所火災の煙）
    this.renderWastelandSmokePillars(ctx, distance, w, h);

    // 砂嵐時の赤い稲妻（Lightning Strike）
    if (isSandstorm && Math.random() < 0.04) {
      ctx.fillStyle = 'rgba(248, 113, 113, 0.35)';
      ctx.fillRect(-50, -50, w + 100, h + 100);
      // 稲妻のボルト線
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      let lx = w * 0.3 + Math.random() * w * 0.4;
      let ly = 0;
      ctx.moveTo(lx, ly);
      for (let i = 0; i < 5; i++) {
        lx += (Math.random() - 0.5) * 60;
        ly += 80 + Math.random() * 50;
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }

    // 3. 沈みゆく巨大な赤熱太陽（煤煙に覆われた不気味な終末の太陽）
    if (!isSandstorm) {
      ctx.save();
      const sunX = w * 0.75;
      const sunY = 220;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 170);
      sunGrad.addColorStop(0, '#fef08a');
      sunGrad.addColorStop(0.25, '#f97316');
      sunGrad.addColorStop(0.6, '#b91c1c');
      sunGrad.addColorStop(1, 'rgba(153, 27, 27, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 170, 0, Math.PI * 2);
      ctx.fill();

      // 太陽を横切る重金属スモッグの帯
      ctx.fillStyle = 'rgba(24, 10, 4, 0.45)';
      ctx.fillRect(sunX - 180, sunY - 25, 360, 16);
      ctx.fillRect(sunX - 140, sunY + 15, 280, 12);
      ctx.restore();
    }

    // 4. 多重パララックス背景（崩壊したメガシティ廃墟・火を噴く製油所・廃車タワー）
    this.renderParallaxMountains(ctx, distance, w, h);

    // 5. 激熱の荒野・赤土デスロード地面（道路・白線を完全撤廃した荒野）
    this.renderGroundAndRoad(ctx, distance, w, h, speed);

    // 砂嵐接近中の警告バナー
    if (isSandstorm) {
      ctx.save();
      ctx.fillStyle = 'rgba(185, 28, 28, 0.45)';
      ctx.fillRect(w / 2 - 200, 20, 400, 32);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(w / 2 - 200, 20, 400, 32);

      ctx.fillStyle = '#fef08a';
      ctx.font = "900 13px 'Impact', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ DANGER: RED SANDSTORM ZERO VISIBILITY ⚠️', w / 2, 41);
      ctx.restore();
    }

    // 6. 障害物・アイテムの描画
    for (const obs of obstacles) {
      this.renderObstacle(ctx, obs);
    }

    // 7. パーティクル（爆発、火花、砂塵、排気）
    particles.render(ctx);

    // 8. 主人公（世紀末バギー）
    // ニトロが切れそうになると（残り1.4秒以下）、自機を高速点滅させて警告！
    const isNitroExpiring = player.isNitroActive && player.nitroTimer <= 1.4;
    if (isNitroExpiring) {
      const isBlinkVisible = Math.floor(this.animTimer * 24) % 2 === 0;
      ctx.globalAlpha = isBlinkVisible ? 0.25 : 1.0;
    }
    renderPlayerAvatar(ctx, player, this.customSpriteImg);
    ctx.globalAlpha = 1.0;

    // 9. ニトロ発動時のみの猛烈なスピードライン（ニトロ終了で完全に綺麗に消去！）
    if (player.isNitroActive) {
      this.renderSpeedLines(ctx, w, h, 1.0);
    }

    // 10. フローティングテキスト
    this.renderFloatingTexts(ctx, floatingTexts);

    // 12. 被弾・爆発時の画面フラッシュ
    if (camera.flashAlpha > 0) {
      ctx.fillStyle = camera.flashColor;
      ctx.globalAlpha = camera.flashAlpha;
      ctx.fillRect(-50, -50, w + 100, h + 100);
      ctx.globalAlpha = 1.0;
    }

    // 13. 周辺減光（Vignette）
    this.renderVignette(ctx, w, h);

    // 14. ニトロ終了カウントダウン警告演出（残り1.5秒以下）
    if (player.isNitroActive && player.nitroTimer <= 1.5) {
      ctx.save();
      const isPulse = Math.floor(this.animTimer * 20) % 2 === 0;
      // 画面四方の赤色点滅警告枠
      ctx.strokeStyle = isPulse ? 'rgba(239, 68, 68, 0.95)' : 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, w - 12, h - 12);

      // 上部警告バナー
      ctx.fillStyle = isPulse ? 'rgba(185, 28, 28, 0.92)' : 'rgba(120, 20, 20, 0.85)';
      ctx.fillRect(w / 2 - 230, 20, 460, 36);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(w / 2 - 230, 20, 460, 36);

      ctx.fillStyle = '#fef08a';
      ctx.font = "900 16px 'Impact', sans-serif";
      ctx.textAlign = 'center';
      const secLeft = Math.max(0, player.nitroTimer).toFixed(1);
      ctx.fillText(`⚠️ NITRO CUTTING OUT IN ${secLeft}s ⚠️`, w / 2, 44);
      ctx.restore();
    }

    // 15. 【超特大！】ニトロが切れた瞬間の画面中央インパクト警告バナー
    if (nitroExpiredBannerTimer > 0) {
      ctx.save();
      const bannerAlpha = Math.min(1.0, nitroExpiredBannerTimer / 0.3);
      ctx.globalAlpha = bannerAlpha;

      // 中央の赤黒インパクトストライプ帯
      ctx.fillStyle = 'rgba(20, 5, 5, 0.92)';
      ctx.fillRect(0, h / 2 - 55, w, 110);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.45)';
      ctx.fillRect(0, h / 2 - 50, w, 100);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, h / 2 - 50, w, 100);

      // メインタイトル
      ctx.fillStyle = '#ffffff';
      ctx.font = "900 32px 'Impact', sans-serif";
      ctx.textAlign = 'center';
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 16;
      ctx.fillText('⚠️ NITRO EXPIRED - SPEED DOWN!! ⚠️', w / 2, h / 2 - 4);

      // サブタイトル
      ctx.fillStyle = '#fef08a';
      ctx.font = "700 15px 'Impact', sans-serif";
      ctx.shadowBlur = 6;
      ctx.fillText('⚡ SAFETY SHIELD ENGAGED (0.5s INVINCIBLE) ⚡', w / 2, h / 2 + 30);

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * 世紀末の象徴：遠くで燃え盛る油田・製油所の巨大な黒煙の柱
   */
  private renderWastelandSmokePillars(ctx: CanvasRenderingContext2D, dist: number, w: number, h: number) {
    const groundY = GAME_CONSTANTS.GROUND_Y;
    const smokePillars = [
      { xBase: 180, scale: 1.0, speed: 0.08 },
      { xBase: 580, scale: 1.3, speed: 0.09 },
      { xBase: 960, scale: 0.85, speed: 0.07 },
      { xBase: 1320, scale: 1.15, speed: 0.085 },
    ];

    ctx.save();
    for (const p of smokePillars) {
      // パララックススクロール
      const px = ((p.xBase - dist * p.speed) % (w + 400) + (w + 400)) % (w + 400) - 200;

      // 根元の火災赤熱グロー
      const fireGlow = ctx.createRadialGradient(px, groundY - 70, 5, px, groundY - 70, 75 * p.scale);
      fireGlow.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
      fireGlow.addColorStop(0.5, 'rgba(185, 28, 28, 0.2)');
      fireGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fireGlow;
      ctx.beginPath();
      ctx.arc(px, groundY - 70, 75 * p.scale, 0, Math.PI * 2);
      ctx.fill();

      // 立ち上る黒煙パフ（風で左に流れる）
      ctx.fillStyle = 'rgba(18, 10, 6, 0.55)';
      for (let i = 0; i < 7; i++) {
        const py = groundY - 60 - i * 45 * p.scale;
        const drift = Math.sin(this.animTimer * 1.5 + i + p.xBase) * 15 - i * 18; // 風で左へ流れる
        const radius = (25 + i * 14) * p.scale;
        ctx.beginPath();
        ctx.arc(px + drift, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /**
   * 殺伐とした世紀末パララックス背景（崩壊したメガシティ廃墟・火を噴く製油所・廃車タワー）
   */
  private renderParallaxMountains(ctx: CanvasRenderingContext2D, dist: number, w: number, h: number) {
    const groundY = GAME_CONSTANTS.GROUND_Y;

    // ----------------------------------------------------
    // レイヤー 1 (最遠景)：崩壊したメガシティの廃墟ビル群 ＆ 核の残骸
    // ----------------------------------------------------
    ctx.fillStyle = '#260e04'; // 最遠景のダークシルエット
    ctx.beginPath();
    ctx.moveTo(0, groundY);

    // 廃墟ビル群のスカイライン（四角く削れたビル、鉄骨がむき出しのタワー）
    const citySpacing = 90;
    const cityOffset = (dist * 0.08) % citySpacing;
    for (let bx = -cityOffset - 100; bx < w + 120; bx += citySpacing) {
      const seed = Math.sin(Math.floor((bx + dist * 0.08) / citySpacing) * 127.1);
      const bHeight = 90 + Math.abs(seed) * 110;
      const bWidth = 55 + Math.abs(Math.cos(seed)) * 30;

      // 廃墟ビルの輪郭（上部が壊れて斜めになっていたり窓の穴が空いている）
      ctx.rect(bx, groundY - bHeight, bWidth, bHeight);
    }
    ctx.fill();

    // ----------------------------------------------------
    // レイヤー 2 (中景)：火を噴く石油コンビナート＆崩落した高架高速道路
    // ----------------------------------------------------
    ctx.fillStyle = '#1c0903'; // 中景の赤黒いシルエット
    ctx.beginPath();
    ctx.moveTo(0, groundY);

    // 崩落した高架道路（途中でボッキリ折れた巨大コンクリートハイウェイ）
    const highwaySpacing = 420;
    const hwOffset = (dist * 0.28) % highwaySpacing;
    for (let hx = -hwOffset - 100; hx < w + highwaySpacing; hx += highwaySpacing) {
      // 橋脚
      ctx.fillRect(hx + 80, groundY - 140, 36, 140);
      ctx.fillRect(hx + 260, groundY - 140, 36, 140);
      // 途中で折れて垂れ下がった道路デッキ
      ctx.beginPath();
      ctx.moveTo(hx, groundY - 140);
      ctx.lineTo(hx + 200, groundY - 140);
      ctx.lineTo(hx + 240, groundY - 70); // 崩落して地面に突き刺さる
      ctx.lineTo(hx + 225, groundY - 60);
      ctx.lineTo(hx + 190, groundY - 128);
      ctx.lineTo(hx, groundY - 128);
      ctx.closePath();
      ctx.fill();

      // 製油所プラントの円柱タンク
      ctx.fillRect(hx + 330, groundY - 85, 70, 85);
      ctx.arc(hx + 365, groundY - 85, 35, Math.PI, 0);
      ctx.fill();

      // 火を噴く煙突（Flare Stack）
      const stackX = hx + 130;
      ctx.fillRect(stackX, groundY - 180, 12, 180);
      // 煙突の頂上からボッと噴き出すリアルタイム火炎！
      const flameScale = 1.0 + Math.sin(this.animTimer * 12 + hx) * 0.35;
      const flameGrad = ctx.createRadialGradient(stackX + 6, groundY - 188, 3, stackX + 6, groundY - 188, 26 * flameScale);
      flameGrad.addColorStop(0, '#fef08a');
      flameGrad.addColorStop(0.4, '#ea580c');
      flameGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.arc(stackX + 6, groundY - 188, 26 * flameScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c0903'; // 色を戻す
    }

    // ----------------------------------------------------
    // レイヤー 3 (近景)：荒野の廃車ピラミッド・トゲトゲ鉄骨・荒廃電柱
    // ----------------------------------------------------
    ctx.strokeStyle = '#120502';
    ctx.fillStyle = '#120502';
    const totemSpacing = 320;
    const totemOffset = (dist * 0.72) % totemSpacing;

    for (let tx = -totemOffset; tx < w + totemSpacing; tx += totemSpacing) {
      const totemType = Math.floor(Math.abs(Math.sin(tx + dist * 0.72)) * 3);

      if (totemType === 0) {
        // 【廃車タワー（Car Totem）】：潰れた車が串刺しに積み上げられた世紀末モニュメント！
        ctx.fillRect(tx + 12, groundY - 110, 8, 110); // 鉄柱
        // 車体1
        ctx.fillRect(tx - 18, groundY - 45, 52, 22);
        // 車体2（傾いた残骸）
        ctx.save();
        ctx.translate(tx + 8, groundY - 70);
        ctx.rotate(0.22);
        ctx.fillRect(-22, -10, 44, 18);
        ctx.restore();
        // 車体3（頂上の軽トラ残骸）
        ctx.fillRect(tx - 12, groundY - 105, 34, 16);

        // 頂上の赤い世紀末フラッグ
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.moveTo(tx + 20, groundY - 110);
        ctx.lineTo(tx + 48, groundY - 102 + Math.sin(this.animTimer * 10) * 4);
        ctx.lineTo(tx + 20, groundY - 94);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#120502';
      } else if (totemType === 1) {
        // 【荒野の傾いた電柱 ＆ 垂れ下がった切断電線】
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(tx + 5, groundY);
        ctx.lineTo(tx - 15, groundY - 125); // 傾いた柱
        ctx.moveTo(tx - 32, groundY - 105);
        ctx.lineTo(tx + 6, groundY - 101);
        ctx.stroke();

        // 垂れ下がる切れた電線
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(tx + 6, groundY - 101);
        ctx.quadraticCurveTo(tx + 40, groundY - 60, tx + 60, groundY - 50);
        ctx.stroke();
      } else {
        // 【巨大スパイク防御壁 ＆ 鉄条網（Barbed Wire）】
        ctx.lineWidth = 3;
        // 突き刺さる斜めの鉄骨杭
        ctx.beginPath();
        ctx.moveTo(tx - 15, groundY);
        ctx.lineTo(tx + 25, groundY - 75);
        ctx.moveTo(tx + 10, groundY);
        ctx.lineTo(tx + 40, groundY - 65);
        ctx.stroke();

        // X字のバリケード鉄骨
        ctx.beginPath();
        ctx.moveTo(tx - 5, groundY);
        ctx.lineTo(tx + 20, groundY - 55);
        ctx.moveTo(tx + 20, groundY);
        ctx.lineTo(tx - 5, groundY - 55);
        ctx.stroke();
      }
    }
  }

  /**
   * 激熱の荒野・赤土デスロード地面（道路・アスファルト・白線を完全撤廃した荒野）
   */
  private renderGroundAndRoad(
    ctx: CanvasRenderingContext2D,
    dist: number,
    w: number,
    h: number,
    speed: number
  ) {
    const groundY = GAME_CONSTANTS.GROUND_Y;

    // 1. 【赤土と乾燥した大地】の荒涼たる多層グラデーション
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
    groundGrad.addColorStop(0, '#5a1d06'); // 最上部：乾燥した赤土
    groundGrad.addColorStop(0.2, '#3b1204'); // 赤褐色
    groundGrad.addColorStop(0.55, '#220b02'); // 焦茶の岩盤
    groundGrad.addColorStop(1, '#0c0401'); // 深層の暗黒土
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, w, h - groundY);

    // 2. 【ゴツゴツと起伏する荒野の土手・岩肌エッジ】（定規のような直線ではなく荒々しい岩盤稜線！）
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= w + 30; x += 25) {
      const worldX = x + dist * 1.2;
      // 岩石の凹凸起伏（ジグザグの岩肌）
      const rockOffset = Math.sin(worldX * 0.04) * 4 + Math.sin(worldX * 0.12) * 2.5;
      ctx.lineTo(x, groundY + rockOffset);
    }
    ctx.lineTo(w, groundY + 12);
    ctx.lineTo(0, groundY + 12);
    ctx.closePath();
    ctx.fill();

    // 荒野の赤熱ハイライトライン
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= w + 30; x += 25) {
      const worldX = x + dist * 1.2;
      const rockOffset = Math.sin(worldX * 0.04) * 4 + Math.sin(worldX * 0.12) * 2.5;
      ctx.lineTo(x, groundY + rockOffset);
    }
    ctx.stroke();

    // 3. 【大地の深いひび割れ（Deep Earth Cracks）】（白線ストライプの代わりに大地を裂く亀裂！）
    ctx.strokeStyle = '#1a0601';
    ctx.lineWidth = 3;
    const crackSpacing = 220;
    const crackOffset = (dist * 1.4) % crackSpacing;

    for (let cx = -crackOffset; cx < w + crackSpacing; cx += crackSpacing) {
      ctx.beginPath();
      ctx.moveTo(cx, groundY + 6);
      ctx.lineTo(cx + 35, groundY + 28);
      ctx.lineTo(cx + 20, groundY + 55);
      ctx.lineTo(cx + 65, groundY + 85);
      ctx.stroke();

      // 亀裂の枝分かれ
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + 35, groundY + 28);
      ctx.lineTo(cx + 70, groundY + 36);
      ctx.stroke();
      ctx.lineWidth = 3;
    }

    // 4. 【高速で飛び散る荒野の小石・赤砂・尖った岩石群】
    ctx.fillStyle = '#78350f';
    const rockSpacing = 130;
    const rockOffset = (dist * 1.4) % rockSpacing;
    for (let rx = -rockOffset; rx < w + rockSpacing; rx += rockSpacing) {
      // 尖った小石1
      ctx.beginPath();
      ctx.moveTo(rx + 15, groundY + 22);
      ctx.lineTo(rx + 28, groundY + 14);
      ctx.lineTo(rx + 36, groundY + 24);
      ctx.closePath();
      ctx.fill();

      // 小石2
      ctx.fillRect(rx + 75, groundY + 48, 12, 5);
      // 小石3
      ctx.fillRect(rx + 110, groundY + 95, 18, 7);
    }

    // 5. 【土に埋もれた錆びた鉄板・スクラップ片】
    ctx.fillStyle = '#451a03';
    ctx.strokeStyle = '#9a3412';
    ctx.lineWidth = 1.5;
    const scrapPlateSpacing = 380;
    const plateOffset = (dist * 1.4) % scrapPlateSpacing;
    for (let px = -plateOffset; px < w + scrapPlateSpacing; px += scrapPlateSpacing) {
      ctx.fillRect(px + 40, groundY + 35, 45, 10);
      ctx.strokeRect(px + 40, groundY + 35, 45, 10);
      // リベット
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(px + 44, groundY + 38, 3, 3);
      ctx.fillRect(px + 78, groundY + 38, 3, 3);
      ctx.fillStyle = '#451a03';
    }

    // 6. 【地表を高速で吹き荒れる赤砂の風・砂塵ストリーム】
    ctx.strokeStyle = 'rgba(234, 88, 12, 0.18)';
    ctx.lineWidth = 2.0;
    for (let i = 0; i < 4; i++) {
      const sy = groundY + 25 + i * 28;
      const sOffset = (dist * 1.8 + i * 160) % (w + 200);
      const sx = w - sOffset;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 90, sy + (i % 2 === 0 ? 3 : -3));
      ctx.stroke();
    }
  }

  /**
   * 通常走行時の風の描写（穏やかで控えめな風切り線）
   */
  private renderAmbientSpeedLines(ctx: CanvasRenderingContext2D, w: number, h: number, speed: number) {
    ctx.save();
    // 視界を邪魔しないよう穏やかで薄い透過ホワイト
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 1.0;

    const count = 3; // わずか3本で穏やかに
    for (let i = 0; i < count; i++) {
      const y = 110 + (i * 115) % (GAME_CONSTANTS.GROUND_Y - 140);
      const len = 35 + (i * 20) % 55;
      const x = ((w + 200) - ((this.animTimer * 650 + i * 260) % (w + 400))) - 80;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * 障害物／アイテムの超明快な精密描画
   */
  private renderObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle) {
    if (obs.isDestroyed) return;

    ctx.save();
    ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);

    switch (obs.type) {
      // 0. 【大ジャンプ台（JUMP RAMP）】（大空へカタパルト射出する鉄骨スロープ！）
      case 'JUMP_RAMP': {
        const w = obs.width;
        const h = obs.height;
        const halfW = w / 2;
        const halfH = h / 2;

        // 鉄骨トラス台座（三角形）
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.moveTo(-halfW, halfH); // スロープ入り口
        ctx.lineTo(halfW, -halfH + 8); // ジャンプ台先端
        ctx.lineTo(halfW, halfH); // 右下
        ctx.closePath();
        ctx.fill();

        // 錆びた鉄骨枠
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 内部の鉄骨クロスブレース
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-halfW + 20, halfH);
        ctx.lineTo(0, halfH - 22);
        ctx.lineTo(halfW - 10, halfH);
        ctx.stroke();

        // 踏切面の黄黒警戒ストライプ
        ctx.save();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-halfW, halfH);
        ctx.lineTo(halfW, -halfH + 8);
        ctx.stroke();
        ctx.restore();

        // 先端の「AIR DIVE ▲」ネオン看板
        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#38bdf8';
        ctx.font = "900 11px 'Impact', sans-serif";
        ctx.textAlign = 'right';
        ctx.fillText('AIR DIVE ▲▲', halfW - 4, -halfH - 2);
        ctx.restore();
        break;
      }

      // 【新登場】世紀末モヒカン・バイク乗り（MOHAWK BIKER）
      case 'MOHAWK_BIKER': {
        const w = obs.width;
        const h = obs.height;
        const halfW = w / 2;
        const halfH = h / 2;

        // ウィリー前傾姿勢
        ctx.rotate(-0.14);

        // A. バイク車体・フレーム
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-halfW + 15, halfH - 8);
        ctx.lineTo(-halfW + 36, halfH - 20);
        ctx.lineTo(halfW - 14, halfH - 8);
        ctx.stroke();

        // チョッパーのロングフロントフォーク
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(halfW - 25, -halfH + 16);
        ctx.lineTo(halfW - 12, halfH - 8);
        ctx.stroke();

        // 前後タイヤ
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(-halfW + 15, halfH - 8, 14, 0, Math.PI * 2);
        ctx.arc(halfW - 12, halfH - 8, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // B. 【バイク乗り・モヒカンウォーボーイ】
        // 黒革ベストの胴体（前傾姿勢）
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.moveTo(-halfW + 26, halfH - 18);
        ctx.lineTo(-halfW + 42, -halfH + 14);
        ctx.lineTo(-halfW + 30, -halfH + 16);
        ctx.closePath();
        ctx.fill();

        // 白塗りの腕（ハンドルを握る）
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-halfW + 38, -halfH + 16);
        ctx.lineTo(halfW - 22, -halfH + 18);
        ctx.stroke();

        // 白塗りウォーボーイの頭部
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(-halfW + 34, -halfH + 6, 9, 0, Math.PI * 2);
        ctx.fill();

        // 目元の黒アイシャドウ＆ゴーグル
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-halfW + 33, -halfH + 4, 7, 4);

        // 鮮血のような赤の逆立ちモヒカンヘアー！
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(-halfW + 28, -halfH + 2);
        ctx.lineTo(-halfW + 22, -halfH - 14); // モヒカン後部
        ctx.lineTo(-halfW + 32, -halfH - 18); // モヒカン頂点
        ctx.lineTo(-halfW + 38, -halfH - 12); // モヒカン前部
        ctx.lineTo(-halfW + 40, -halfH + 4);
        ctx.closePath();
        ctx.fill();

        // トゲ肩当て（スパイクショルダー）
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(-halfW + 36, -halfH + 12);
        ctx.lineTo(-halfW + 34, -halfH + 2);
        ctx.lineTo(-halfW + 42, -halfH + 12);
        ctx.fill();
        break;
      }

      // 【新登場】火炎放射器をぶっ放す敵マシン（FLAMETHROWER CAR）
      case 'FLAMETHROWER_CAR': {
        const w = obs.width;
        const h = obs.height;
        const halfW = w / 2;
        const halfH = h / 2;

        // A. 車体ベース装甲
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(-halfW + 8, -halfH + 18, w - 16, halfH + 12);
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-halfW + 8, -halfH + 18, w - 16, halfH + 12);

        // キャビン防護スリット
        ctx.fillStyle = '#09090b';
        ctx.fillRect(-halfW + 28, -halfH + 20, 26, 12);

        // 前後タイヤ
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-halfW + 22, halfH - 2, 14, 0, Math.PI * 2);
        ctx.arc(halfW - 22, halfH - 2, 14, 0, Math.PI * 2);
        ctx.fill();

        // 後部の高圧プロパンガスタンク（危険な赤）
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-halfW + 10, -halfH + 6, 22, 14);
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 2;
        ctx.strokeRect(-halfW + 10, -halfH + 6, 22, 14);

        // B. ルーフの巨大火炎放射マズルパイプ（前方左向き）
        ctx.fillStyle = '#52525b';
        ctx.fillRect(-halfW - 8, -halfH + 10, 48, 10);
        ctx.strokeStyle = '#a1a1aa';
        ctx.lineWidth = 2;
        ctx.strokeRect(-halfW - 8, -halfH + 10, 48, 10);

        // マズル先端
        ctx.fillStyle = obs.isFiringFlame ? '#f97316' : '#27272a';
        ctx.fillRect(-halfW - 14, -halfH + 8, 6, 14);

        // C. 【火炎放射ストリーム（猛烈な前方火炎噴射!! 範囲を半分に調整）】
        if (obs.isFiringFlame) {
          ctx.save();
          const fLen = obs.flameLength || 110;
          const muzzleX = -halfW - 14;
          const muzzleY = -halfH + 15;

          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 18;

          const flameGrad = ctx.createLinearGradient(muzzleX, muzzleY, muzzleX - fLen, muzzleY);
          flameGrad.addColorStop(0, '#fef08a');
          flameGrad.addColorStop(0.3, '#f97316');
          flameGrad.addColorStop(0.8, '#ef4444');
          flameGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');

          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.moveTo(muzzleX, muzzleY - 6);
          const wave = Math.sin(this.animTimer * 28) * 6;
          ctx.quadraticCurveTo(muzzleX - fLen * 0.5, muzzleY - 16 + wave, muzzleX - fLen, muzzleY - 8);
          ctx.lineTo(muzzleX - fLen - 10, muzzleY);
          ctx.lineTo(muzzleX - fLen, muzzleY + 8);
          ctx.quadraticCurveTo(muzzleX - fLen * 0.5, muzzleY + 16 - wave, muzzleX, muzzleY + 6);
          ctx.closePath();
          ctx.fill();

          // 炎のコア
          ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
          ctx.beginPath();
          ctx.moveTo(muzzleX, muzzleY - 3);
          ctx.lineTo(muzzleX - fLen * 0.45, muzzleY);
          ctx.lineTo(muzzleX, muzzleY + 3);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }
        break;
      }

      // 1. 【地面の鉄トゲ・スパイクトラップ】（誰が見ても一目で分かる鋭利なトゲ山！）
      case 'SPIKE_TRAP': {
        const w = obs.width;
        const h = obs.height;
        const halfW = w / 2;
        const halfH = h / 2;

        // A. 重厚な鉄骨ベース台座
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(-halfW, halfH - 12, w, 12);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.strokeRect(-halfW, halfH - 12, w, 12);

        // 黄×黒の危険警戒ストライプペイント
        ctx.save();
        ctx.beginPath();
        ctx.rect(-halfW + 2, halfH - 10, w - 4, 8);
        ctx.clip();
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-halfW, halfH - 10, w, 8);
        ctx.fillStyle = '#0c0a09';
        for (let sx = -halfW; sx < halfW + 20; sx += 12) {
          ctx.beginPath();
          ctx.moveTo(sx, halfH - 2);
          ctx.lineTo(sx + 6, halfH - 10);
          ctx.lineTo(sx + 10, halfH - 10);
          ctx.lineTo(sx + 4, halfH - 2);
          ctx.fill();
        }
        ctx.restore();

        // B. 3本の鋭利な鉄スパイク（鋼鉄の刃）
        const spikeProps = [
          { xOffset: -halfW + 12, topX: -halfW + 10, topY: -halfH, baseW: 14 },
          { xOffset: 0, topX: 2, topY: -halfH - 8, baseW: 16 }, // 中央の大トゲ
          { xOffset: halfW - 12, topX: halfW - 8, topY: -halfH + 2, baseW: 14 },
        ];

        // 危険な赤光グロー
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;

        for (const sp of spikeProps) {
          // トゲの陰影（左半面：シルバー、右半面：ダークスチール）
          ctx.fillStyle = '#94a3b8'; // ハイライト側
          ctx.beginPath();
          ctx.moveTo(sp.xOffset - sp.baseW / 2, halfH - 10);
          ctx.lineTo(sp.topX, sp.topY);
          ctx.lineTo(sp.xOffset, halfH - 10);
          ctx.fill();

          ctx.fillStyle = '#475569'; // 影側
          ctx.beginPath();
          ctx.moveTo(sp.xOffset, halfH - 10);
          ctx.lineTo(sp.topX, sp.topY);
          ctx.lineTo(sp.xOffset + sp.baseW / 2, halfH - 10);
          ctx.fill();

          // 鋭利なエッジのアウトライン
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sp.xOffset - sp.baseW / 2, halfH - 10);
          ctx.lineTo(sp.topX, sp.topY);
          ctx.lineTo(sp.xOffset + sp.baseW / 2, halfH - 10);
          ctx.stroke();

          // 刃先の返り血（ブラッドペイント）
          ctx.fillStyle = '#b91c1c';
          ctx.beginPath();
          ctx.moveTo(sp.topX - 3, sp.topY + 12);
          ctx.lineTo(sp.topX, sp.topY);
          ctx.lineTo(sp.topX + 3, sp.topY + 14);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        break;
      }

      // 2. 【爆発するドラム缶】（立体的なオイルドラム・一目でドラム缶と分かる！）
      case 'OIL_DRUM': {
        const w = obs.width;
        const h = obs.height;
        const halfW = w / 2;
        const halfH = h / 2;

        // ドラム缶本体（赤色グラデーションで円筒感を表現）
        const drumGrad = ctx.createLinearGradient(-halfW, 0, halfW, 0);
        drumGrad.addColorStop(0, '#7f1d1d');
        drumGrad.addColorStop(0.3, '#dc2626');
        drumGrad.addColorStop(0.7, '#ef4444');
        drumGrad.addColorStop(1, '#991b1b');
        ctx.fillStyle = drumGrad;
        ctx.fillRect(-halfW, -halfH + 6, w, h - 8);

        // 缶の上下フチ＆補強リング（スチール製）
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2.0;
        ctx.strokeRect(-halfW, -halfH + 6, w, h - 8);

        // 横リング帯（2本）
        ctx.fillStyle = '#475569';
        ctx.fillRect(-halfW - 1, -halfH + 18, w + 2, 4);
        ctx.fillRect(-halfW - 1, halfH - 18, w + 2, 4);

        // 上部楕円フタ（立体感）
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.ellipse(0, -halfH + 6, halfW, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 給油キャップ
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-halfW + 10, -halfH + 6, 3, 0, Math.PI * 2);
        ctx.fill();

        // 正面の「OIL / TNT」太文字ステンシル（壺に見えないよう工業用ドラム缶であることを明示）
        ctx.fillStyle = '#0f172a';
        ctx.font = "900 11px 'Impact', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText('OIL', 0, 4);

        // 天面から漏れ出る火花
        if (Math.sin(this.animTimer * 10) > 0) {
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(0, -halfH + 1, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      // 3. 【回転する巨大丸鋸（ソーブレード）】
      case 'SAW_BLADE': {
        ctx.rotate(obs.rotation);
        const radius = obs.width / 2;

        // 丸鋸の刃（ギラつくスチール）
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        const teeth = 12;
        for (let i = 0; i < teeth; i++) {
          const a1 = (i / teeth) * Math.PI * 2;
          const a2 = ((i + 0.5) / teeth) * Math.PI * 2;
          ctx.lineTo(Math.cos(a1) * radius, Math.sin(a1) * radius);
          ctx.lineTo(Math.cos(a2) * (radius * 0.72), Math.sin(a2) * (radius * 0.72));
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 血染めのセンターハブ
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      // 4. 【ニトロ缶（NITRO FUEL）】（青白く輝くガソリン携行缶！）
      case 'SCRAP_CAN': {
        const w = obs.width;
        const h = obs.height;
        const halfW = w / 2;
        const halfH = h / 2;

        const floatY = Math.sin(this.animTimer * 6) * 3;
        ctx.translate(0, floatY);

        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;

        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-halfW, -halfH + 8, w, h - 8);
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2;
        ctx.strokeRect(-halfW, -halfH + 8, w, h - 8);

        ctx.fillStyle = '#0369a1';
        ctx.fillRect(-halfW + 4, -halfH, w - 8, 8);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-halfW + 6, -halfH + 2, 4, 6);
        ctx.fillRect(-halfW + 14, -halfH + 2, 4, 6);
        ctx.fillRect(-halfW + 22, -halfH + 2, 4, 6);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-halfW + 5, -halfH + 14);
        ctx.lineTo(halfW - 5, halfH - 6);
        ctx.moveTo(halfW - 5, -halfH + 14);
        ctx.lineTo(-halfW + 5, halfH - 6);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#f0f9ff';
        ctx.font = "900 9px 'Impact', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText('NITRO', 0, 3);
        break;
      }

      // 5. 【★高得点ゴールドスターコイン】（ツボに見えていたアイテムを完全に誰が見てもコインに刷新！）
      case 'BONUS_SKULL': {
        const floatY = Math.sin(this.animTimer * 5) * 4;
        ctx.translate(0, floatY);

        // 3Dコインの回転アニメーション（横幅が伸縮して回転して見える）
        const coinSpin = Math.cos(this.animTimer * 4);
        ctx.scale(coinSpin, 1);

        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 24;

        // 黄金の厚み（フチ）
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        // 眩いゴールドコイン表面
        const goldGrad = ctx.createLinearGradient(-15, -15, 15, 15);
        goldGrad.addColorStop(0, '#fef08a');
        goldGrad.addColorStop(0.5, '#facc15');
        goldGrad.addColorStop(1, '#eab308');
        ctx.fillStyle = goldGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // コイン中央の輝く「★」スターマーク
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = "900 16px 'Impact', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText('★', 0, 6);
        break;
      }

      // 6. 【修理レンチ（REPAIR WRENCH）】（HP回復アイテム）
      case 'REPAIR_WRENCH': {
        const floatY = Math.sin(this.animTimer * 5.5) * 3;
        ctx.translate(0, floatY);

        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 18;

        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3, -10, 6, 20);
        ctx.fillRect(-10, -3, 20, 6);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#34d399';
        ctx.font = "900 10px 'Impact', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText('+HP', 0, -20);
        break;
      }

      // 7. 【敵車1：突撃スパイクバギー】
      case 'SPIKE_BUGGY': {
        const w = obs.width;
        const h = obs.height;
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 2 + 10);
        ctx.lineTo(w / 2 - 10, -h / 2);
        ctx.lineTo(w / 2, h / 2 - 8);
        ctx.lineTo(-w / 2 + 10, h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#f87171';
        ctx.beginPath();
        ctx.moveTo(-w / 2, -7);
        ctx.lineTo(-w / 2 - 24, 0);
        ctx.lineTo(-w / 2, 7);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-w / 3, h / 2 - 2, 12, 0, Math.PI * 2);
        ctx.arc(w / 3, h / 2 - 2, 12, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      // 8. 【敵車2：超高速チョッパーバイク（CHOPPER BIKE）】
      case 'CHOPPER_BIKE': {
        const w = obs.width;
        const h = obs.height;
        // バイクフレーム（細身・鋭利）
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 10, h / 2 - 8); // 後輪ハブ
        ctx.lineTo(0, -h / 2 + 8); // シート・タンク
        ctx.lineTo(w / 2 - 8, -h / 2); // ハンドル
        ctx.lineTo(w / 2, h / 2 - 8); // 前輪フォーク
        ctx.stroke();

        // フロントの突き出しスパイク
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(w / 2, -h / 2 + 4);
        ctx.lineTo(w / 2 + 20, h / 2 - 8);
        ctx.lineTo(w / 2 - 4, h / 2 - 8);
        ctx.fill();

        // 跳ね上がった排気管マフラーから黒煙
        ctx.strokeStyle = '#78716c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, h / 2 - 12);
        ctx.lineTo(-w / 2 + 2, -h / 2 + 4);
        ctx.stroke();

        // バイクの前後タイヤ
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-w / 2 + 10, h / 2 - 8, 12, 0, Math.PI * 2);
        ctx.arc(w / 2, h / 2 - 8, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(-w / 2 + 10, h / 2 - 8, 5, 0, Math.PI * 2);
        ctx.arc(w / 2, h / 2 - 8, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      // 9. 【敵車3：火炎放射タンクローリー（FLAME TANKER）】
      case 'FLAME_TANKER': {
        const w = obs.width;
        const h = obs.height;
        // 運転台キャビン（前部）
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-w / 2, -h / 2 + 12, 35, h - 22);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2 + 12, 35, h - 22);

        // 円筒形ガソリンタンク（後部）
        const tankGrad = ctx.createLinearGradient(-w / 2 + 35, 0, w / 2, 0);
        tankGrad.addColorStop(0, '#64748b');
        tankGrad.addColorStop(0.5, '#cbd5e1');
        tankGrad.addColorStop(1, '#475569');
        ctx.fillStyle = tankGrad;
        ctx.fillRect(-w / 2 + 35, -h / 2, w - 40, h - 14);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(-w / 2 + 35, -h / 2, w - 40, h - 14);

        // タンク側面の危険火気マーク
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(10, -5, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(10, -5, 5, 0, Math.PI * 2);
        ctx.fill();

        // 後部バーナーから噴き出す火炎（アニメーション）
        const flameW = 20 + Math.sin(this.animTimer * 12) * 10;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(w / 2, -10);
        ctx.lineTo(w / 2 + flameW, 0);
        ctx.lineTo(w / 2, 10);
        ctx.fill();

        // 4連タイヤ
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-w / 2 + 16, h / 2 - 4, 14, 0, Math.PI * 2);
        ctx.arc(-w / 2 + 52, h / 2 - 4, 14, 0, Math.PI * 2);
        ctx.arc(w / 2 - 18, h / 2 - 4, 14, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      // 10. 【敵車4：モンスタートラック（MONSTER TRUCK）】
      case 'MONSTER_TRUCK': {
        const w = obs.width;
        const h = obs.height;
        // 高くリフトアップされた車体キャビン（宙に浮いている）
        ctx.fillStyle = '#581c87'; // パープル＆スカル
        ctx.fillRect(-w / 2 + 10, -h / 2, w - 20, 32);
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        ctx.strokeRect(-w / 2 + 10, -h / 2, w - 20, 32);

        // キャビン防護バー
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 15, -h / 2 + 8);
        ctx.lineTo(-w / 2 + 15, -h / 2 + 24);
        ctx.moveTo(-w / 2 + 30, -h / 2 + 8);
        ctx.lineTo(-w / 2 + 30, -h / 2 + 24);
        ctx.stroke();

        // 強靭なスチールサスペンション（下部のスライディング空間）
        ctx.strokeStyle = '#78716c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 25, -h / 2 + 32);
        ctx.lineTo(-w / 2 + 25, h / 2 - 10);
        ctx.moveTo(w / 2 - 25, -h / 2 + 32);
        ctx.lineTo(w / 2 - 25, h / 2 - 10);
        ctx.stroke();

        // 巨大なトゲ付き超大型タイヤ（直径44px！）
        const renderMonsterWheel = (wx: number) => {
          ctx.save();
          ctx.translate(wx, h / 2 - 6);
          ctx.rotate(obs.rotation);
          ctx.fillStyle = '#09090b';
          ctx.beginPath();
          ctx.arc(0, 0, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 3;
          ctx.stroke();
          // トゲ
          ctx.fillStyle = '#e2e8f0';
          for (let i = 0; i < 6; i++) {
            ctx.rotate(Math.PI / 3);
            ctx.fillRect(-2, -26, 4, 6);
          }
          ctx.restore();
        };

        renderMonsterWheel(-w / 2 + 25);
        renderMonsterWheel(w / 2 - 25);
        break;
      }

      // 11. 【敵車5：巨大装甲トラック（WAR TRUCK）】
      case 'WAR_TRUCK': {
        const w = obs.width;
        const h = obs.height;
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(-w / 2, -h / 2, w, h - 10);
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 3;
        ctx.strokeRect(-w / 2, -h / 2, w, h - 10);

        // トラック正面のスカルペイント
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(0, -10, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0c0a09';
        ctx.fillRect(-6, -14, 4, 4);
        ctx.fillRect(2, -14, 4, 4);

        // タイヤ
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(-w / 2 + 25, h / 2 - 4, 18, 0, Math.PI * 2);
        ctx.arc(w / 2 - 25, h / 2 - 4, 18, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  /**
   * ニトロ発動時の激しいスピードライン（集中線）
   */
  private renderSpeedLines(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.75;
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 3.5;

    for (let i = 0; i < 32; i++) {
      const y = Math.random() * h;
      const len = 150 + Math.random() * 420;
      const x = Math.random() * w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - len, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * コンボ・破壊時のフローティングテキスト
   */
  private renderFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
    ctx.save();
    for (const t of texts) {
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.fillStyle = t.color;
      ctx.font = `900 ${Math.floor(26 * t.scale)}px 'Impact', sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;
      ctx.fillText(t.text, t.x, t.y);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  /**
   * 周辺減光（Vignette）
   */
  private renderVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.75);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(12, 10, 9, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}
