import { Player } from './types';

/**
 * 主人公（世紀末ウォー・バギー）の描画モジュール
 * 
 * 【差し替えガイド】
 * 後でドット絵（スプライトシート）やPNG画像に差し替える場合は、
 * `customSpriteImage` に Image オブジェクトを渡すか、
 * この関数の先頭で `ctx.drawImage(...)` を呼び出すだけで即座に反映されます。
 */
export function renderPlayerAvatar(
  ctx: CanvasRenderingContext2D,
  player: Player,
  customSpriteImage: HTMLImageElement | null = null
) {
  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  ctx.rotate(player.tilt);

  // RAM突撃時の前方巨大衝角ショックウェーブ（前方に約115px突き出す炎の牙）
  if (player.isRamming) {
    ctx.save();
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 24;
    // 前方に突き出す炎の刃（ショックコーン）
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.beginPath();
    ctx.moveTo(player.width / 2, -player.height / 2 + 10);
    ctx.lineTo(player.width / 2 + 115, 0); // 前方に115px！
    ctx.lineTo(player.width / 2, player.height / 2);
    ctx.closePath();
    ctx.fill();

    // 内側の白熱コア
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(player.width / 2 + 10, -player.height / 4);
    ctx.lineTo(player.width / 2 + 90, 0);
    ctx.lineTo(player.width / 2 + 10, player.height / 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 1. もしカスタム画像（ドット絵やPNG）が登録されていればそれを優先描画
  if (customSpriteImage && customSpriteImage.complete && customSpriteImage.naturalWidth > 0) {
    const drawW = player.width * 1.3;
    const drawH = player.height * 1.3;
    ctx.drawImage(
      customSpriteImage,
      -drawW / 2,
      -drawH / 2,
      drawW,
      drawH
    );
    ctx.restore();
    return;
  }

  // 2. 記号・ベクターSVGコードによる【マッドマックス世紀末バギー】の精密描画
  const w = player.width;
  const h = player.height;
  const halfW = w / 2;
  const halfH = h / 2;

  // ラム突撃時の発光オーラ
  if (player.isRamming) {
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 24;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.strokeRect(-halfW - 8, -halfH - 8, w + 16, h + 16);
  } else if (player.isNitroActive) {
    // ニトロ切れ間近（残り1.4秒以下）のときは警告のオレンジオーラ
    const isExpiring = player.nitroTimer <= 1.4;
    ctx.shadowColor = isExpiring ? '#f97316' : '#38bdf8';
    ctx.shadowBlur = isExpiring ? 32 : 28;
  }

  // A. メイン車体装甲（錆びた鉄板ブロック）
  ctx.fillStyle = '#292524'; // ダークアイアン
  ctx.beginPath();
  ctx.moveTo(-halfW + 15, halfH - 14); // 後輪上
  ctx.lineTo(-halfW + 5, -halfH + 18); // ルーフ後部
  ctx.lineTo(0, -halfH + 10); // キャビン頂点
  ctx.lineTo(halfW - 10, -halfH + 26); // ボンネット先端
  ctx.lineTo(halfW + 12, halfH - 14); // フロントバンパー
  ctx.lineTo(-halfW + 15, halfH - 14);
  ctx.closePath();
  ctx.fill();

  // 錆びた装甲板プレートの境界線＆ボルト
  ctx.strokeStyle = '#78350f'; // 錆色
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // B. フロントの凶悪な巨大スパイク（衝角 / Ramming Spikes）
  ctx.fillStyle = player.isRamming ? '#ef4444' : '#e2e8f0';
  ctx.beginPath();
  // スパイク1（中央）
  ctx.moveTo(halfW + 8, -halfH + 28);
  ctx.lineTo(halfW + 28, -halfH + 34);
  ctx.lineTo(halfW + 8, -halfH + 40);
  // スパイク2（下段）
  ctx.moveTo(halfW + 6, -halfH + 42);
  ctx.lineTo(halfW + 24, halfH - 14);
  ctx.lineTo(halfW + 6, halfH - 12);
  ctx.fill();

  // C. キャビン防護鉄格子＆装甲スリット
  ctx.fillStyle = '#0c0a09';
  ctx.fillRect(-halfW + 22, -halfH + 16, 26, 12);
  // スリット格子
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-halfW + 30, -halfH + 16);
  ctx.lineTo(-halfW + 30, -halfH + 28);
  ctx.moveTo(-halfW + 38, -halfH + 16);
  ctx.lineTo(-halfW + 38, -halfH + 28);
  ctx.stroke();

  // D. 上部ツイン排気マフラー（V8エキゾースト）
  ctx.fillStyle = '#44403c';
  ctx.fillRect(-halfW + 8, -halfH + 2, 8, 16);
  ctx.fillRect(-halfW + 16, -halfH - 2, 8, 20);
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(-halfW + 8, -halfH + 2, 8, 3);
  ctx.fillRect(-halfW + 16, -halfH - 2, 8, 3);

  // E. 世紀末シンボル：ホワイトスカル・ステンシル（頭蓋骨記号）
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  // 頭蓋骨頭部
  ctx.arc(-halfW + 38, 4, 6, 0, Math.PI * 2);
  ctx.fill();
  // 顎
  ctx.fillRect(-halfW + 35, 8, 6, 4);
  // 目穴
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(-halfW + 36, 3, 2, 2);
  ctx.fillRect(-halfW + 39, 3, 2, 2);

  // F. 巨大スパイク・ホイール（前後輪）
  const renderWheel = (wx: number, wy: number) => {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(player.wheelRotation);

    // タイヤゴム
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    // ホイールリム
    ctx.fillStyle = '#78716c';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    // ホイール上のトゲ・スパイク（4方向）
    ctx.fillStyle = '#e2e8f0';
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(-2, -9);
      ctx.lineTo(0, -19);
      ctx.lineTo(2, -9);
      ctx.fill();
    }

    // センターボルト
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  renderWheel(-halfW + 20, halfH - 4); // 後輪
  renderWheel(halfW - 14, halfH - 4);  // 前輪

  ctx.restore();
}
