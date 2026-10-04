/**
 * WASTELAND FURY: V8 APOCALYPSE
 * ゲーム全体の物理演算・バランスパラメータ
 */

export const GAME_CONSTANTS = {
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  GROUND_Y: 560,

  // 物理演算パラメータ
  PHYSICS: {
    GRAVITY: 2150,
    JUMP_FORCE: -900,
    DOUBLE_JUMP_FORCE: -800,
    SUPER_JUMP_FORCE: -1350, // 大ジャンプ台カタパルト射出力！
    BASE_SPEED: 780,
    MAX_SPEED: 1450,
    SPEED_ACCELERATION: 18,
    NITRO_SPEED_MULTIPLIER: 1.8,
    NITRO_DURATION: 4.5,
  },

  // プレイヤー設定
  PLAYER: {
    DEFAULT_X: 180,
    WIDTH: 100,
    HEIGHT: 65,
    SLIDE_HEIGHT: 40,
    MAX_HEALTH: 100,
    RAM_DURATION: 0.55,
    RAM_COOLDOWN: 0.95,
    RAM_REACH: 115, // 前方攻撃判定拡大リーチ
  },

  // 演出・カメラ
  FX: {
    MAX_SHAKE_INTENSITY: 26,
    HIT_STOP_DURATION: 0.09,
    NITRO_FOV_ZOOM: 0.92,
  },

  // カラーパレット
  COLORS: {
    SKY_TOP: '#1c1008',
    SKY_BOTTOM: '#c2410c',
    SUN: '#fb923c',
    SAND_FAR: '#78350f',
    SAND_MID: '#451a03',
    SAND_NEAR: '#291404',
    ROAD: '#171513',
    RUST: '#b45309',
    FIRE_ORANGE: '#ea580c',
    FIRE_YELLOW: '#facc15',
    NITRO_BLUE: '#38bdf8',
    NITRO_CYAN: '#06b6d4',
    BLOOD_RED: '#b91c1c',
    CHROME: '#e2e8f0',
  },
};
