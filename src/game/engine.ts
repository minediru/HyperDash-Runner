import { soundManager } from './audio';
import { GAME_CONSTANTS } from './constants';
import { ParticleSystem } from './particles';
import { CameraState, FloatingText, GameState, Obstacle, ObstacleType, Player } from './types';

export interface GameEngineState {
  gameState: GameState;
  score: number;
  highScore: number;
  distance: number;
  speed: number;
  scrapCount: number;
  nitro: number;
  isNitroActive: boolean;
  health: number;
  combo: number;
  multiplier: number;
}

export class GameEngine {
  public player: Player;
  public obstacles: Obstacle[] = [];
  public particles: ParticleSystem;
  public floatingTexts: FloatingText[] = [];
  public camera: CameraState;

  public gameState: GameState = 'MENU';
  public score: number = 0;
  public highScore: number = 0;
  public distance: number = 0;
  public speed: number = GAME_CONSTANTS.PHYSICS.BASE_SPEED;
  public scrapCount: number = 0;
  public multiplier: number = 1;

  private nextObstacleSpawnX: number = 1400;
  private obstacleIdCounter: number = 0;
  private textIdCounter: number = 0;
  private ramCooldownTimer: number = 0;
  private jumpsRemaining: number = 2;
  public nitroExpiredBannerTimer: number = 0;
  private nitroWarningStep: number = 0; // 0: 未, 1: 1.5s, 2: 1.0s, 3: 0.5s

  private onStateUpdate?: (state: GameEngineState) => void;

  constructor(onStateUpdate?: (state: GameEngineState) => void) {
    this.onStateUpdate = onStateUpdate;
    this.particles = new ParticleSystem();
    this.player = this.createDefaultPlayer();
    this.camera = {
      shake: 0,
      shakeX: 0,
      shakeY: 0,
      zoom: 1.0,
      flashAlpha: 0,
      flashColor: '#ffffff',
      slowMoTimer: 0,
      hitStopTimer: 0,
    };

    const savedHighScore = localStorage.getItem('WASTELAND_RUNNER_HIGHSCORE');
    if (savedHighScore) {
      this.highScore = parseInt(savedHighScore, 10) || 0;
    }
  }

  private createDefaultPlayer(): Player {
    return {
      x: GAME_CONSTANTS.PLAYER.DEFAULT_X,
      y: GAME_CONSTANTS.GROUND_Y - GAME_CONSTANTS.PLAYER.HEIGHT,
      width: GAME_CONSTANTS.PLAYER.WIDTH,
      height: GAME_CONSTANTS.PLAYER.HEIGHT,
      vy: 0,
      isGrounded: true,
      isSliding: false,
      isRamming: false,
      nitro: 35, // 初期ニトロボーナス
      isNitroActive: false,
      nitroTimer: 0,
      health: GAME_CONSTANTS.PLAYER.MAX_HEALTH,
      combo: 0,
      comboTimer: 0,
      invincibleTimer: 0,
      tilt: 0,
      wheelRotation: 0,
    };
  }

  public startGame() {
    this.player = this.createDefaultPlayer();
    this.obstacles = [];
    this.particles.clear();
    this.floatingTexts = [];
    this.score = 0;
    this.distance = 0;
    this.speed = GAME_CONSTANTS.PHYSICS.BASE_SPEED;
    this.scrapCount = 0;
    this.multiplier = 1;
    this.gameState = 'PLAYING';
    this.nextObstacleSpawnX = 1400;
    this.jumpsRemaining = 2;

    soundManager.startEngine();
    this.addFloatingText('V8 HYPER IGNITION!!', 640, 260, '#facc15', 1.4);
    this.addCameraTrauma(10);
    this.syncState();
  }

  /**
   * ジャンプ操作（高速・2段ジャンプ対応）
   */
  public jump() {
    if (this.gameState !== 'PLAYING') return;

    if (this.player.isGrounded) {
      this.player.vy = GAME_CONSTANTS.PHYSICS.JUMP_FORCE;
      this.player.isGrounded = false;
      this.jumpsRemaining = 1;
      this.player.tilt = -0.18;
      soundManager.playJump();
      this.particles.emitDust(this.player.x, GAME_CONSTANTS.GROUND_Y);
    } else if (this.jumpsRemaining > 0) {
      // 2段目（ロケット噴射ブースト）
      this.player.vy = GAME_CONSTANTS.PHYSICS.DOUBLE_JUMP_FORCE;
      this.jumpsRemaining = 0;
      this.player.tilt = -0.28;
      soundManager.playJump();
      // 下向きのブースト排気
      for (let i = 0; i < 18; i++) {
        this.particles.particles.push({
          x: this.player.x + 35,
          y: this.player.y + this.player.height,
          vx: (Math.random() - 0.5) * 120,
          vy: 240 + Math.random() * 240,
          size: 8 + Math.random() * 12,
          color: '#f97316',
          alpha: 1.0,
          decay: 2.2,
          type: 'FIRE',
        });
      }
    }
  }

  /**
   * スライディング・低姿勢操作
   */
  public setSliding(sliding: boolean) {
    if (this.gameState !== 'PLAYING') return;
    this.player.isSliding = sliding;
    if (sliding) {
      this.player.height = GAME_CONSTANTS.PLAYER.SLIDE_HEIGHT;
      if (this.player.isGrounded) {
        this.player.y = GAME_CONSTANTS.GROUND_Y - this.player.height;
        this.particles.emitDust(this.player.x + 20, GAME_CONSTANTS.GROUND_Y);
      }
    } else {
      this.player.height = GAME_CONSTANTS.PLAYER.HEIGHT;
      if (this.player.isGrounded) {
        this.player.y = GAME_CONSTANTS.GROUND_Y - this.player.height;
      }
    }
  }

  /**
   * ラム突撃・金属粉砕アタック（前方の障害物を粉砕）
   */
  public activateRam() {
    if (this.gameState !== 'PLAYING') return;
    if (this.ramCooldownTimer > 0 || this.player.isRamming) return;

    this.player.isRamming = true;
    this.ramCooldownTimer = GAME_CONSTANTS.PLAYER.RAM_COOLDOWN;
    soundManager.playRam();
    this.addCameraTrauma(14);

    // 前方に突撃エフェクト
    for (let i = 0; i < 22; i++) {
      this.particles.particles.push({
        x: this.player.x + this.player.width,
        y: this.player.y + this.player.height / 2 + (Math.random() - 0.5) * 30,
        vx: 380 + Math.random() * 300,
        vy: (Math.random() - 0.5) * 120,
        size: 3 + Math.random() * 5,
        color: '#fef08a',
        alpha: 1.0,
        decay: 2.5,
        type: 'SPARK',
      });
    }

    setTimeout(() => {
      this.player.isRamming = false;
    }, GAME_CONSTANTS.PLAYER.RAM_DURATION * 1000);
  }

  /**
   * ニトロ・ハイパーフューリー発動！
   */
  public activateNitro() {
    if (this.gameState !== 'PLAYING') return;
    if (this.player.nitro < 30 || this.player.isNitroActive) return;

    this.player.isNitroActive = true;
    this.player.nitroTimer = GAME_CONSTANTS.PHYSICS.NITRO_DURATION;
    this.nitroWarningStep = 0;
    this.nitroExpiredBannerTimer = 0;
    soundManager.setNitroActive(true);
    soundManager.playNitroIgnite();
    this.addCameraTrauma(24);
    this.camera.flashAlpha = 0.55;
    this.camera.flashColor = '#38bdf8';
    this.addFloatingText('⚡ BIBIBI NITRO ENGAGED!! ⚡', 640, 200, '#38bdf8', 1.9);
  }

  /**
   * カメラの揺れ（Trauma追加）
   */
  public addCameraTrauma(amount: number) {
    this.camera.shake = Math.min(GAME_CONSTANTS.FX.MAX_SHAKE_INTENSITY, this.camera.shake + amount);
  }

  /**
   * メイン更新ループ（固定タイムステップ delta）
   */
  public update(dt: number) {
    // ライフが0以下になったら確実に即時ゲームオーバーを実行！
    if (this.player.health <= 0 && this.gameState === 'PLAYING') {
      this.gameOver();
      return;
    }

    if (this.gameState !== 'PLAYING') {
      this.speed = 0; // 車とコースの移動を完全停止！
      this.particles.update(dt);
      this.updateCamera(dt);
      return;
    }

    // ヒットストップ中なら物理進行を一時停止
    if (this.camera.hitStopTimer > 0) {
      this.camera.hitStopTimer -= dt;
      this.updateCamera(dt);
      return;
    }

    // バナータイマー減算
    if (this.nitroExpiredBannerTimer > 0) {
      this.nitroExpiredBannerTimer -= dt;
    }

    // 1. ニトロタイマーと燃料消費
    if (this.player.isNitroActive) {
      // 終了カウントダウン（1.5秒、1.0秒、0.5秒の3段階）
      if (this.player.nitroTimer <= 1.5 && this.nitroWarningStep === 0) {
        this.nitroWarningStep = 1;
        soundManager.playNitroCountdown(3);
        this.addFloatingText('⚠️ NITRO CUT IN: 3...', this.player.x, this.player.y - 45, '#f59e0b', 0.9);
      } else if (this.player.nitroTimer <= 1.0 && this.nitroWarningStep === 1) {
        this.nitroWarningStep = 2;
        soundManager.playNitroCountdown(2);
        this.addFloatingText('⚠️ 2...', this.player.x, this.player.y - 45, '#f97316', 0.9);
      } else if (this.player.nitroTimer <= 0.5 && this.nitroWarningStep === 2) {
        this.nitroWarningStep = 3;
        soundManager.playNitroCountdown(1);
        this.addFloatingText('⚠️ 1!! CUTTING OUT!!', this.player.x, this.player.y - 45, '#ef4444', 0.9);
      }

      this.player.nitroTimer -= dt;
      this.player.nitro = Math.max(0, this.player.nitro - (100 / GAME_CONSTANTS.PHYSICS.NITRO_DURATION) * dt);
      if (this.player.nitroTimer <= 0 || this.player.nitro <= 0) {
        this.player.isNitroActive = false;
        soundManager.setNitroActive(false);

        // 【強烈な減速ショック＆ビビビー終了音！】
        soundManager.playNitroExpire();

        // 1. 減速衝撃カメラフラッシュ（赤白）
        this.camera.flashAlpha = 0.85;
        this.camera.flashColor = '#ef4444';

        // 2. 一瞬のヒットストップ（0.06秒でガクン！と減速を感じさせる）
        this.camera.hitStopTimer = 0.06;

        // 3. 強烈なカメラスパイク
        this.addCameraTrauma(24);

        // 4. 画面中央の特大インパクトバナータイマー（1.2秒間表示）
        this.nitroExpiredBannerTimer = 1.2;

        // 5. 車両後方から大量の白煙・黒煙スチームを噴出！
        for (let i = 0; i < 28; i++) {
          this.particles.particles.push({
            x: this.player.x - 10 + Math.random() * 20,
            y: this.player.y + 15 + Math.random() * 25,
            vx: -220 - Math.random() * 260,
            vy: -40 - Math.random() * 140,
            size: 8 + Math.random() * 16,
            color: Math.random() > 0.4 ? '#f1f5f9' : '#475569',
            alpha: 0.95,
            decay: 1.8,
            type: 'SMOKE',
          });
        }

        // 6. ニトロが切れた瞬間に0.5秒間だけ無敵時間を付与（安全に着地・回避できる仕様）
        this.player.invincibleTimer = Math.max(this.player.invincibleTimer, 0.5);
      }
    }

    // 2. ラムクールダウン
    if (this.ramCooldownTimer > 0) {
      this.ramCooldownTimer -= dt;
    }

    // 3. 無敵タイマー
    if (this.player.invincibleTimer > 0) {
      this.player.invincibleTimer -= dt;
    }

    // 4. コンボタイマー
    if (this.player.comboTimer > 0) {
      this.player.comboTimer -= dt;
      if (this.player.comboTimer <= 0) {
        this.player.combo = 0;
        this.multiplier = 1;
      }
    }

    // 5. 走行速度の計算と加速（高速化された基本スピード）
    let targetSpeed = GAME_CONSTANTS.PHYSICS.BASE_SPEED + Math.min(600, this.distance * 0.08);
    if (this.player.isNitroActive) {
      targetSpeed *= GAME_CONSTANTS.PHYSICS.NITRO_SPEED_MULTIPLIER;
    }
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 6);

    // 6. 距離＆スコア加算
    const frameDistance = this.speed * dt;
    this.distance += frameDistance * 0.1;
    this.score += Math.floor(frameDistance * 0.08 * this.multiplier);

    // エンジン音のピッチ追従
    soundManager.updateEnginePitch(this.speed / GAME_CONSTANTS.PHYSICS.MAX_SPEED, this.player.isNitroActive);

    // 7. プレイヤー物理演算（重力・ジャンプ・姿勢傾き）
    this.player.vy += GAME_CONSTANTS.PHYSICS.GRAVITY * dt;
    this.player.y += this.player.vy * dt;

    const groundFloor = GAME_CONSTANTS.GROUND_Y - this.player.height;
    if (this.player.y >= groundFloor) {
      this.player.y = groundFloor;
      this.player.vy = 0;
      this.player.isGrounded = true;
      this.jumpsRemaining = 2;
      this.player.tilt = 0;
    } else {
      this.player.isGrounded = false;
      this.player.tilt = Math.min(0.35, Math.max(-0.35, this.player.vy * 0.0006));
    }

    // ホイールの高速回転
    this.player.wheelRotation += (this.speed * dt * 0.1);

    // 排気管マフラーからの煙・ニトロ火炎
    this.particles.emitExhaust(this.player.x - 8, this.player.y + 18, this.player.isNitroActive);
    if (this.player.isGrounded) {
      this.particles.emitDust(this.player.x - 4, GAME_CONSTANTS.GROUND_Y);
    }

    // 8. 障害物のスポーン・進行
    this.updateObstacles(dt, frameDistance);

    // 9. 当たり判定・インタラクション
    this.handleCollisions();

    // 10. パーティクル・フローティングテキスト・カメラ更新
    this.particles.update(dt);
    this.updateFloatingTexts(dt);
    this.updateCamera(dt);

    this.syncState();
  }

  /**
   * 障害物生成と移動
   */
  private updateObstacles(dt: number, frameDistance: number) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= (frameDistance + obs.speed * dt);
      obs.rotation += obs.rotationSpeed * dt;

      // 【新登場】火炎放射器車の放射サイクル＆火炎ストリーム更新
      if (obs.type === 'FLAMETHROWER_CAR' && !obs.isDestroyed) {
        obs.flameTimer = (obs.flameTimer || 0) + dt;
        const cycle = obs.flameTimer % 2.5; // 2.5秒周期
        const wasFiring = obs.isFiringFlame;
        obs.isFiringFlame = cycle > 0.85; // 0.85秒準備、1.65秒間火炎噴射！
        obs.flameLength = 110; // 範囲を従来の半分（110px）に調整

        if (obs.isFiringFlame) {
          // 前方へ火炎ジェット粒子を連続放出
          this.particles.emitFlamethrowerFlame(obs.x - 12, obs.y + 14);
          if (!wasFiring && Math.abs(obs.x - this.player.x) < 850) {
            soundManager.playFlamethrower();
          }
        }
      }

      if (obs.x < -200) {
        this.obstacles.splice(i, 1);
      }
    }

    // 新規生成
    this.nextObstacleSpawnX -= frameDistance;
    if (this.nextObstacleSpawnX <= 1280) {
      this.spawnObstacleBatch();
      // 高速化に合わせた快適なギャップ間隔
      const baseGap = Math.max(520, 850 - (this.speed - 780) * 0.35);
      this.nextObstacleSpawnX = 1280 + baseGap + Math.random() * 320;
    }
  }

  /**
   * 荒野の障害物・アイテムの配置パターン
   */
  private spawnObstacleBatch() {
    const roll = Math.random();
    const spawnX = 1320;
    const groundY = GAME_CONSTANTS.GROUND_Y;

    if (roll < 0.14) {
      // 0. 【大ジャンプ台（JUMP RAMP）】（大空へダイブ＆コイン連取！）
      this.obstacles.push({
        id: ++this.obstacleIdCounter,
        type: 'JUMP_RAMP',
        x: spawnX,
        y: groundY - 50,
        width: 85,
        height: 50,
        speed: 0,
        health: 1,
        maxHealth: 1,
        isDestroyed: false,
        rotation: 0,
        rotationSpeed: 0,
        points: 500,
        canDestroy: false,
      });

      // ジャンプ台の上空に連なる★ゴールドコインの7連ダイブアーチ！
      const totalCoins = 7;
      const jumpDistance = 950;
      for (let i = 0; i < totalCoins; i++) {
        const u = (i + 0.6) / (totalCoins + 0.2);
        const coinX = spawnX + 85 + u * jumpDistance;
        const coinY = groundY - 60 - Math.sin(u * Math.PI) * 340;

        this.obstacles.push({
          id: ++this.obstacleIdCounter,
          type: 'BONUS_SKULL',
          x: coinX,
          y: coinY,
          width: 38,
          height: 42,
          speed: 0,
          health: 1,
          maxHealth: 1,
          isDestroyed: false,
          rotation: 0,
          rotationSpeed: 0,
          points: 1000,
          canDestroy: false,
        });
      }

      // 着地点の敵車
      this.obstacles.push({
        id: ++this.obstacleIdCounter,
        type: Math.random() > 0.5 ? 'SPIKE_BUGGY' : 'OIL_DRUM',
        x: spawnX + 1020,
        y: groundY - 55,
        width: 85,
        height: 55,
        speed: 0,
        health: 1,
        maxHealth: 1,
        isDestroyed: false,
        rotation: 0,
        rotationSpeed: 0,
        points: 450,
        canDestroy: true,
      });
      return;
    } else if (roll < 0.28) {
      // 1. 【新登場】世紀末モヒカン・バイク乗り（MOHAWK BIKER）
      this.obstacles.push({
        id: ++this.obstacleIdCounter,
        type: 'MOHAWK_BIKER',
        x: spawnX,
        y: groundY - 48,
        width: 80,
        height: 48,
        speed: 320 + Math.random() * 140, // ウィリーで超高速突進！
        health: 1,
        maxHealth: 1,
        isDestroyed: false,
        rotation: 0,
        rotationSpeed: 0,
        points: 500,
        canDestroy: true,
      });
    } else if (roll < 0.42) {
      // 2. 【新登場】火炎放射器をぶっ放す敵マシン（FLAMETHROWER CAR）
      this.obstacles.push({
        id: ++this.obstacleIdCounter,
        type: 'FLAMETHROWER_CAR',
        x: spawnX,
        y: groundY - 62,
        width: 105,
        height: 62,
        speed: 130 + Math.random() * 70,
        health: 2,
        maxHealth: 2,
        isDestroyed: false,
        rotation: 0,
        rotationSpeed: 0,
        points: 750,
        canDestroy: true,
        flameTimer: Math.random() * 2,
        isFiringFlame: false,
        flameLength: 110, // 範囲を半分に調整
      });
    } else if (roll < 0.54) {
      // 3. 【突撃スパイクバギー】
      this.obstacles.push({
        id: ++this.obstacleIdCounter,
        type: 'SPIKE_BUGGY',
        x: spawnX,
        y: groundY - 55,
        width: 85,
        height: 55,
        speed: 180 + Math.random() * 100,
        health: 1,
        maxHealth: 1,
        isDestroyed: false,
        rotation: 0,
        rotationSpeed: 0,
        points: 400,
        canDestroy: true,
      });
    } else if (roll < 0.66) {
      // 4. 【爆発するドラム缶】
      const count = Math.random() > 0.6 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        this.obstacles.push({
          id: ++this.obstacleIdCounter,
          type: 'OIL_DRUM',
          x: spawnX + i * 50,
          y: groundY - 54,
          width: 44,
          height: 54,
          speed: 0,
          health: 1,
          maxHealth: 1,
          isDestroyed: false,
          rotation: 0,
          rotationSpeed: 0,
          points: 300,
          canDestroy: true,
        });
      }
    } else if (roll < 0.78) {
      // 5. 【地面の鉄トゲ・スパイクトラップ】
      this.obstacles.push({
        id: ++this.obstacleIdCounter,
        type: 'SPIKE_TRAP',
        x: spawnX,
        y: groundY - 48,
        width: 65,
        height: 48,
        speed: 0,
        health: 1,
        maxHealth: 1,
        isDestroyed: false,
        rotation: 0,
        rotationSpeed: 0,
        points: 350,
        canDestroy: true,
      });
    } else if (roll < 0.88) {
      // 6. 【火炎放射タンクローリー】
      this.obstacles.push({
        id: ++this.obstacleIdCounter,
        type: 'FLAME_TANKER',
        x: spawnX,
        y: groundY - 68,
        width: 110,
        height: 68,
        speed: 100,
        health: 2,
        maxHealth: 2,
        isDestroyed: false,
        rotation: 0,
        rotationSpeed: 0,
        points: 600,
        canDestroy: true,
      });
    } else {
      // 7. 【巨大ボス装甲トラック（WAR TRUCK）】
      this.obstacles.push({
        id: ++this.obstacleIdCounter,
        type: 'WAR_TRUCK',
        x: spawnX,
        y: groundY - 82,
        width: 145,
        height: 82,
        speed: 80,
        health: 2,
        maxHealth: 2,
        isDestroyed: false,
        rotation: 0,
        rotationSpeed: 0,
        points: 800,
        canDestroy: true,
      });
    }

    // アイテムの配置（ニトロ缶、HP修理レンチ、★ゴールドコイン）
    if (Math.random() > 0.3) {
      const itemRoll = Math.random();
      const itemY = Math.random() > 0.5 ? groundY - 145 : groundY - 65;

      let itemType: ObstacleType = 'SCRAP_CAN';
      let pts = 150;
      if (itemRoll < 0.45) {
        itemType = 'SCRAP_CAN';
        pts = 200;
      } else if (itemRoll < 0.75) {
        itemType = 'REPAIR_WRENCH';
        pts = 250;
      } else {
        itemType = 'BONUS_SKULL';
        pts = 1000;
      }

      this.obstacles.push({
        id: ++this.obstacleIdCounter,
        type: itemType,
        x: spawnX + 200 + Math.random() * 90,
        y: itemY,
        width: 36,
        height: 40,
        speed: 0,
        health: 1,
        maxHealth: 1,
        isDestroyed: false,
        rotation: 0,
        rotationSpeed: 0,
        points: pts,
        canDestroy: false,
      });
    }
  }

  /**
   * 当たり判定とクラッシュ処理
   */
  private handleCollisions() {
    const p = this.player;
    const attackReach = p.isRamming ? GAME_CONSTANTS.PLAYER.RAM_REACH : 0;

    for (const obs of this.obstacles) {
      if (obs.isDestroyed) continue;

      // 0. 【大ジャンプ台（JUMP RAMP）】との接触（大空へ射出カタパルトダイブ！）
      if (obs.type === 'JUMP_RAMP') {
        const rampHit =
          p.x + 10 < obs.x + obs.width &&
          p.x + p.width > obs.x &&
          p.y + p.height >= obs.y + 10;

        if (rampHit) {
          obs.isDestroyed = true;
          p.vy = GAME_CONSTANTS.PHYSICS.SUPER_JUMP_FORCE;
          p.isGrounded = false;
          p.tilt = -0.4;
          this.jumpsRemaining = 1; // 空中2段ジャンプを可能に！
          soundManager.playSuperJump();
          this.addCameraTrauma(14);
          this.addFloatingText('🚀 AIR DIVE LAUNCH!!', p.x, p.y - 35, '#38bdf8', 1.6);
          continue;
        }
      }

      // 【新登場】火炎放射器車の火炎ストリーム判定（前方の火炎に触れると炎上ダメージ！）
      // ※ニトロやRAM突撃なら火炎を突き破って粉砕可能！
      if (obs.type === 'FLAMETHROWER_CAR' && obs.isFiringFlame && !obs.isDestroyed) {
        const fReach = obs.flameLength || 110;
        const inFlame =
          p.x < obs.x &&
          p.x + p.width > obs.x - fReach &&
          p.y < obs.y + obs.height - 6 &&
          p.y + p.height > obs.y + 6; // 上下もコンパクトにしてジャンプで気持ちよく飛び越えられる！

        if (inFlame && !p.isNitroActive && !p.isRamming && p.invincibleTimer <= 0) {
          p.health = Math.max(0, p.health - 24);
          p.invincibleTimer = 1.2;
          p.combo = 0;
          this.multiplier = 1;
          this.addCameraTrauma(24);
          this.camera.flashAlpha = 0.55;
          this.camera.flashColor = '#ea580c';
          soundManager.playExplosion();
          this.particles.emitExplosion(p.x + p.width / 2, p.y + p.height / 2, 1.3);
          this.addFloatingText('🔥 FLAMETHROWER BURN!! -24 HP', p.x, p.y - 32, '#ea580c', 1.5);
          if (p.health <= 0) {
            this.gameOver();
            return;
          }
        }
      }

      // 1. 【空中スタント踏み潰し（STOMP SMASH!!）】
      // プレイヤーが落下降下中で、敵車の頭上に着地した場合 -> 敵車をペシャンコ粉砕！
      const isVehicle =
        obs.type === 'MOHAWK_BIKER' ||
        obs.type === 'FLAMETHROWER_CAR' ||
        obs.type === 'SPIKE_BUGGY' ||
        obs.type === 'CHOPPER_BIKE' ||
        obs.type === 'FLAME_TANKER' ||
        obs.type === 'MONSTER_TRUCK' ||
        obs.type === 'WAR_TRUCK' ||
        obs.type === 'OIL_DRUM';

      const isFallingOnTop =
        p.vy > 80 &&
        p.x + 15 < obs.x + obs.width &&
        p.x + p.width - 15 > obs.x &&
        p.y + p.height >= obs.y &&
        p.y + p.height <= obs.y + 35;

      if (isVehicle && isFallingOnTop) {
        obs.isDestroyed = true;
        p.vy = -620; // 踏み潰して空へバウンド！
        p.tilt = -0.3;
        this.camera.hitStopTimer = GAME_CONSTANTS.FX.HIT_STOP_DURATION;
        this.addCameraTrauma(20);
        soundManager.playStompSmash();
        this.particles.emitExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, 1.8);
        this.particles.emitCarDestruction(obs.x + obs.width / 2, obs.y + obs.height / 2, 3);
        if (obs.type === 'MOHAWK_BIKER') {
          this.particles.emitMohawkDebris(obs.x + obs.width / 2, obs.y + obs.height / 2);
        }

        p.combo += 1;
        p.comboTimer = 4.0;
        this.multiplier = Math.min(8, 1 + p.combo * 0.5);
        const earnedScore = Math.floor((obs.points + 500) * this.multiplier);
        this.score += earnedScore;

        this.addFloatingText(`⚡ STOMP CRUSH!! +${earnedScore}`, obs.x, obs.y - 30, '#facc15', 1.6);
        if (p.combo % 3 === 0) {
          soundManager.playWitnessShout();
          this.addFloatingText('🔥 WITNESS ME!! 🔥', p.x, p.y - 60, '#ef4444', 1.8);
        }
        continue;
      }

      // 2. RAM突撃またはニトロ発動時の前方先制粉砕判定
      if (p.isRamming || p.isNitroActive) {
        const attackHit =
          p.x < obs.x + obs.width &&
          p.x + p.width + attackReach > obs.x &&
          p.y - 12 < obs.y + obs.height &&
          p.y + p.height + 12 > obs.y;

        if (attackHit) {
          if (obs.type === 'SCRAP_CAN' || obs.type === 'BONUS_SKULL' || obs.type === 'REPAIR_WRENCH') {
            this.handleItemPickup(obs);
            continue;
          }

          obs.isDestroyed = true;
          this.camera.hitStopTimer = GAME_CONSTANTS.FX.HIT_STOP_DURATION;
          this.addCameraTrauma(18);
          soundManager.playExplosion();
          this.particles.emitExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, 1.5);
          if (isVehicle) {
            this.particles.emitCarDestruction(obs.x + obs.width / 2, obs.y + obs.height / 2, 2);
          }
          if (obs.type === 'MOHAWK_BIKER') {
            this.particles.emitMohawkDebris(obs.x + obs.width / 2, obs.y + obs.height / 2);
          }

          p.combo += 1;
          p.comboTimer = 3.5;
          this.multiplier = Math.min(8, 1 + p.combo * 0.5);
          const earnedScore = Math.floor(obs.points * this.multiplier);
          this.score += earnedScore;

          const label = p.isNitroActive ? 'NITRO OBLITERATION!!' : 'RAM SMASH!!';
          this.addFloatingText(`${label} +${earnedScore}`, obs.x, obs.y - 20, '#ef4444', 1.4);

          if (p.combo % 3 === 0) {
            soundManager.playWitnessShout();
            this.addFloatingText('🔥 WITNESS ME!! 🔥', p.x, p.y - 50, '#facc15', 1.7);
          }
          continue;
        }
      }

      // 3. アイテム回収判定（大ジャンプ空中ダイブ時でも気持ちよく全回収できるよう、判定マージンを拡大！）
      const isItem = obs.type === 'SCRAP_CAN' || obs.type === 'BONUS_SKULL' || obs.type === 'REPAIR_WRENCH';
      if (isItem) {
        const itemHit =
          p.x - 20 < obs.x + obs.width &&
          p.x + p.width + 20 > obs.x &&
          p.y - 28 < obs.y + obs.height &&
          p.y + p.height + 28 > obs.y;

        if (itemHit) {
          this.handleItemPickup(obs);
          continue;
        }
      }

      // 4. 通常の車体接触判定（敵車・障害物）
      const bodyHit =
        p.x + 8 < obs.x + obs.width &&
        p.x + p.width - 8 > obs.x &&
        p.y + 4 < obs.y + obs.height &&
        p.y + p.height > obs.y + 4;

      if (!bodyHit) continue;

      // 通常被弾・クラッシュ
      if (p.invincibleTimer <= 0) {
        obs.isDestroyed = true;
        let damage = 22;
        if (obs.type === 'WAR_TRUCK') damage = 35;
        if (obs.type === 'FLAME_TANKER') damage = 32;
        if (obs.type === 'FLAMETHROWER_CAR') damage = 30;
        if (obs.type === 'MONSTER_TRUCK') damage = 30;
        if (obs.type === 'SPIKE_TRAP') damage = 25;
        if (obs.type === 'OIL_DRUM') damage = 28;
        if (obs.type === 'MOHAWK_BIKER') damage = 22;

        p.health = Math.max(0, p.health - damage);
        p.invincibleTimer = 1.2;
        p.combo = 0;
        this.multiplier = 1;

        this.addCameraTrauma(22);
        this.camera.flashAlpha = 0.6;
        this.camera.flashColor = '#ef4444';
        soundManager.playExplosion();
        this.particles.emitExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, 1.2);
        if (isVehicle) {
          this.particles.emitCarDestruction(obs.x + obs.width / 2, obs.y + obs.height / 2, 2);
        }
        if (obs.type === 'MOHAWK_BIKER') {
          this.particles.emitMohawkDebris(obs.x + obs.width / 2, obs.y + obs.height / 2);
        }
        this.addFloatingText(`CRASH!! -${damage} HP`, p.x, p.y - 30, '#f87171', 1.3);

        if (p.health <= 0) {
          this.gameOver();
          return;
        }
      }
    }
  }

  private handleItemPickup(obs: Obstacle) {
    obs.isDestroyed = true;
    soundManager.playPickup();

    if (obs.type === 'SCRAP_CAN') {
      this.scrapCount += 1;
      this.player.nitro = Math.min(100, this.player.nitro + 30);
      this.addFloatingText('+NITRO FUEL!', obs.x, obs.y - 15, '#38bdf8', 1.2);
    } else if (obs.type === 'REPAIR_WRENCH') {
      this.player.health = Math.min(100, this.player.health + 25);
      this.addFloatingText('+25 HP REPAIRED!', obs.x, obs.y - 15, '#10b981', 1.2);
    } else {
      this.score += obs.points;
      this.addFloatingText('+1000 GOLD COIN!', obs.x, obs.y - 15, '#facc15', 1.4);
    }
  }

  private gameOver() {
    if (this.gameState === 'GAMEOVER') return;
    this.gameState = 'GAMEOVER';
    this.player.health = 0;
    this.speed = 0; // 車・背景の移動速度を完全に0へ
    this.player.isNitroActive = false;
    this.player.isRamming = false;
    this.player.vy = 0;

    soundManager.setNitroActive(false);
    soundManager.stopEngine();
    soundManager.stopHardEdm(); // ハードEDM BGMも即時停止！
    soundManager.playGameOver(); // 大破爆発音
    this.addCameraTrauma(28);
    this.camera.flashAlpha = 0.85;
    this.camera.flashColor = '#f97316';
    this.particles.emitExplosion(this.player.x + 50, this.player.y + 30, 3.0);
    this.particles.emitCarDestruction(this.player.x + 50, this.player.y + 30, 4);

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('WASTELAND_RUNNER_HIGHSCORE', this.highScore.toString());
    }

    this.syncState();
  }

  private updateCamera(dt: number) {
    if (this.camera.shake > 0) {
      const intensity = (this.camera.shake / GAME_CONSTANTS.FX.MAX_SHAKE_INTENSITY) ** 2 * 25;
      this.camera.shakeX = (Math.random() * 2 - 1) * intensity;
      this.camera.shakeY = (Math.random() * 2 - 1) * intensity;
      this.camera.shake = Math.max(0, this.camera.shake - 22 * dt);
    } else {
      this.camera.shakeX = 0;
      this.camera.shakeY = 0;
    }

    const targetZoom = this.player.isNitroActive ? GAME_CONSTANTS.FX.NITRO_FOV_ZOOM : 1.0;
    this.camera.zoom += (targetZoom - this.camera.zoom) * Math.min(1, dt * 6);

    if (this.camera.flashAlpha > 0) {
      this.camera.flashAlpha = Math.max(0, this.camera.flashAlpha - 2.5 * dt);
    }
  }

  private addFloatingText(text: string, x: number, y: number, color: string, scale: number = 1.0) {
    this.floatingTexts.push({
      id: ++this.textIdCounter,
      text,
      x,
      y,
      vy: -120,
      color,
      alpha: 1.0,
      scale,
    });
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy * dt;
      t.alpha -= 0.85 * dt;
      if (t.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private syncState() {
    if (this.onStateUpdate) {
      this.onStateUpdate({
        gameState: this.gameState,
        score: this.score,
        highScore: this.highScore,
        distance: Math.floor(this.distance),
        speed: Math.floor(this.speed),
        scrapCount: this.scrapCount,
        nitro: Math.floor(this.player.nitro),
        isNitroActive: this.player.isNitroActive,
        health: Math.floor(this.player.health),
        combo: this.player.combo,
        multiplier: this.multiplier,
      });
    }
  }
}
