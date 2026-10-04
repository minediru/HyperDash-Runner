export type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER';

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  isGrounded: boolean;
  isSliding: boolean;
  isRamming: boolean; // 突撃・破壊モード
  nitro: number; // 0 - 100
  isNitroActive: boolean;
  nitroTimer: number;
  health: number; // 0 - 100
  combo: number;
  comboTimer: number;
  invincibleTimer: number;
  tilt: number;
  wheelRotation: number;
  isSuperJumping?: boolean; // ジャンプ台からの大空ダイブ中
}

export type ObstacleType =
  | 'JUMP_RAMP' // 大空へダイブする鉄骨大ジャンプ台
  | 'MOHAWK_BIKER' // 【新登場】世紀末モヒカン・バイク乗りライダー
  | 'FLAMETHROWER_CAR' // 【新登場】火炎放射器をぶっ放してくる敵マシン
  | 'SPIKE_TRAP' // 地面の凶悪な鉄トゲ（バリケード）
  | 'SPIKE_BUGGY' // 突撃スパイクバギー
  | 'CHOPPER_BIKE' // 超高速世紀末チョッパーバイク
  | 'FLAME_TANKER' // 炎を撒き散らす燃料タンクローリー
  | 'MONSTER_TRUCK' // 巨大タイヤのモンスタートラック
  | 'WAR_TRUCK' // 巨大装甲トラック
  | 'SAW_BLADE' // 回転丸鋸
  | 'OIL_DRUM' // 爆発ドラム缶
  | 'SCRAP_CAN' // ニトロジェリカン
  | 'BONUS_SKULL' // ★ゴールドコイン
  | 'REPAIR_WRENCH'; // 救急修理レンチ

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
  rotation: number;
  rotationSpeed: number;
  points: number;
  canDestroy: boolean;
  pulse?: number;
  // 火炎放射器専用ステート
  isFiringFlame?: boolean;
  flameTimer?: number;
  flameLength?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  type: 'FIRE' | 'SPARK' | 'SMOKE' | 'DEBRIS' | 'SAND' | 'NITRO' | 'WIND' | 'SHOCKWAVE' | 'WHEEL_DEBRIS' | 'METAL_SCRAP' | 'MOHAWK_DEBRIS';
  rotation?: number;
  vRot?: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  vy: number;
  color: string;
  alpha: number;
  scale: number;
}

export interface CameraState {
  shake: number;
  shakeX: number;
  shakeY: number;
  zoom: number;
  flashAlpha: number;
  flashColor: string;
  slowMoTimer: number;
  hitStopTimer: number;
}
