import React, { useEffect, useState } from 'react';
import { Flame, Play, RotateCcw, Skull } from 'lucide-react';
import { GameCanvas } from './components/GameCanvas';
import { SpriteUploadModal } from './components/SpriteUploadModal';
import { RotateNoticeOverlay } from './components/RotateNoticeOverlay';
import { soundManager } from './game/audio';

export default function App() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [lastScore, setLastScore] = useState<number>(0);
  const [lastDistance, setLastDistance] = useState<number>(0);
  const [lastScrap, setLastScrap] = useState<number>(0);

  const [customSprite, setCustomSprite] = useState<HTMLImageElement | null>(null);
  const [isSpriteModalOpen, setIsSpriteModalOpen] = useState<boolean>(false);

  // 縦画面スマホ検知
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // 画面の幅と高さから縦持ちスマホを判定
      const isMobile = window.innerWidth <= 960 || window.innerHeight <= 600 || ('ontouchstart' in window);
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsPortraitMobile(isMobile && isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleForceFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    if ('orientation' in screen && 'lock' in screen.orientation) {
      (screen.orientation as unknown as { lock: (mode: string) => Promise<void> }).lock('landscape').catch(() => {});
    }
  };

  const handleStartGame = () => {
    setIsGameOver(false);
    setIsPlaying(true);
  };

  const handleGameOver = (score: number, distance: number, scrap: number) => {
    soundManager.stopEngine();
    soundManager.stopHardEdm();
    setLastScore(score);
    setLastDistance(distance);
    setLastScrap(scrap);
    setIsGameOver(true);
  };

  const handleRestart = () => {
    setIsGameOver(false);
    setIsPlaying(false);
    setTimeout(() => {
      setIsPlaying(true);
    }, 50);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950 overflow-x-hidden">
      {/* 縦画面スマホ用の回転案内オーバーレイ */}
      {isPortraitMobile && (
        <RotateNoticeOverlay onForceFullscreen={handleForceFullscreen} />
      )}

      {/* 世紀末警告ストライプバー（プレイ中かつ横画面スマホでは非表示にして画面を広く確保） */}
      <div className={`h-2 w-full bg-[repeating-linear-gradient(45deg,#d97706,#d97706_15px,#1c1917_15px,#1c1917_30px)] ${isPlaying ? 'hidden sm:block' : ''}`} />

      {/* トップナビゲーション（プレイ中かつスマホ横画面では画面を広く使うため非表示） */}
      <header className={`border-b border-stone-800 bg-stone-900/60 backdrop-blur-md px-4 sm:px-6 py-2.5 sm:py-4 items-center justify-between ${isPlaying ? 'hidden sm:flex' : 'flex'}`}>
        <div className="flex items-center gap-3">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-amber-600 to-red-700 text-stone-950 shadow-md shadow-red-900/30">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-stone-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-black uppercase tracking-widest text-amber-500">
                WASTELAND FURY
              </h1>
              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-red-950/80 border border-red-700/60 text-red-400 font-mono font-bold">
                V8 APOCALYPSE
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-400 hidden sm:block">超ド派手2D無限ラン・Webブラウザゲーム</p>
          </div>
        </div>
      </header>

      {/* メインエリア */}
      <main className={`flex-1 flex flex-col items-center justify-center w-full mx-auto ${isPlaying ? 'p-0 sm:p-4 max-w-full sm:max-w-7xl' : 'p-4 max-w-7xl'}`}>
        {!isPlaying ? (
          /* タイトル画面 */
          <div className="max-w-2xl w-full bg-stone-900 border-2 border-stone-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center my-auto">
            {/* 錆びた背景ディテール */}
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Skull className="w-64 h-64 text-amber-500" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-950/40 border border-amber-700/50 text-amber-400 text-xs font-mono font-bold uppercase tracking-widest mb-3 sm:mb-4">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              WITNESS ME! WE RIDE TO VALHALLA!
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-amber-500 uppercase tracking-tight mb-2 sm:mb-3">
              WASTELAND FURY
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-lg mx-auto mb-6 leading-relaxed font-sans">
              世紀末の荒野を爆走せよ！大ジャンプ台で空へダイブ、火炎放射車やモヒカンバイクを<strong className="text-amber-400">RAM突撃</strong>＆<strong className="text-amber-300">STOMP踏み潰し</strong>で粉砕！
            </p>

            {/* 操作説明（PC＆スマホ両対応案内） */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono text-stone-300 mb-6 max-w-lg mx-auto">
              <div className="bg-stone-950 p-2 border border-stone-800">
                <span className="text-amber-500 font-bold block mb-0.5">左親指 / SPACE</span>
                <span>2段ジャンプ</span>
              </div>
              <div className="bg-stone-950 p-2 border border-stone-800">
                <span className="text-red-500 font-bold block mb-0.5">右親指 / D</span>
                <span>RAM突撃（粉砕）</span>
              </div>
              <div className="bg-stone-950 p-2 border border-stone-800">
                <span className="text-sky-400 font-bold block mb-0.5">右親指 / E</span>
                <span>ニトロ加速</span>
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="inline-flex items-center gap-2 px-8 py-3.5 sm:py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-stone-950 text-base sm:text-lg font-black uppercase tracking-widest shadow-xl shadow-red-900/40 transition-transform active:scale-95 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START RUN (エンジン始動)</span>
            </button>
          </div>
        ) : (
          /* ゲーム画面 */
          <div className="w-full flex flex-col items-center">
            <GameCanvas
              onGameOver={handleGameOver}
              customSprite={customSprite}
              onOpenSpriteModal={() => setIsSpriteModalOpen(true)}
              isGameOver={isGameOver}
            />

            {/* ゲームオーバー・リザルトモーダル */}
            {isGameOver && (
              <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                <div className="max-w-md w-full bg-stone-900 border-4 border-red-700 p-6 sm:p-8 text-center text-stone-200 shadow-2xl relative">
                  <div className="p-2 sm:p-3 bg-red-900/60 inline-block mb-2 sm:mb-3 border border-red-500">
                    <Skull className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-red-500 mb-1">
                    WRECKED!!
                  </h2>
                  <p className="text-xs text-stone-400 mb-4 sm:mb-6 font-mono">
                    マシンの大破を確認。荒野の塵となった。
                  </p>

                  <div className="bg-stone-950 border border-stone-800 p-3 sm:p-4 mb-4 sm:mb-6 font-mono space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-stone-400">FINAL SCORE:</span>
                      <span className="font-bold text-amber-400 text-base sm:text-lg">
                        {lastScore.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-stone-400">DISTANCE:</span>
                      <span className="font-bold text-stone-200">{lastDistance} M</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-stone-400">SCRAP RECOVERED:</span>
                      <span className="font-bold text-sky-400">{lastScrap} CANS</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRestart}
                      className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-stone-950 font-black text-xs sm:text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4" /> もう一度走る
                    </button>
                    <button
                      onClick={() => setIsPlaying(false)}
                      className="py-2.5 sm:py-3 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase border border-stone-700 cursor-pointer active:scale-95"
                    >
                      タイトルへ
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* フッター（プレイ中かつ横画面スマホでは非表示） */}
      <footer className={`border-t border-stone-800 bg-stone-950 px-6 py-3 text-center text-xs text-stone-500 font-mono ${isPlaying ? 'hidden sm:block' : 'block'}`}>
        WASTELAND FURY © 2026 · Built for Web & Mobile
      </footer>

      {/* スプライト差し替えモーダル */}
      <SpriteUploadModal
        isOpen={isSpriteModalOpen}
        onClose={() => setIsSpriteModalOpen(false)}
        onSpriteChange={(img) => setCustomSprite(img)}
        hasCustomSprite={!!customSprite}
      />
    </div>
  );
}
