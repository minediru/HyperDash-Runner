import React, { useEffect, useRef, useState } from 'react';
import { Flame, ShieldAlert, Zap, Volume2, VolumeX, Sparkles, Maximize2, Pause, Play, ChevronUp, ChevronDown } from 'lucide-react';
import { soundManager } from '../game/audio';
import { GAME_CONSTANTS } from '../game/constants';
import { GameEngine, GameEngineState } from '../game/engine';
import { GameRenderer } from '../game/renderer';

interface Props {
  onGameOver: (score: number, distance: number, scrap: number) => void;
  customSprite: HTMLImageElement | null;
  onOpenSpriteModal: () => void;
  isGameOver?: boolean;
}

export const GameCanvas: React.FC<Props> = ({
  onGameOver,
  customSprite,
  onOpenSpriteModal,
  isGameOver = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  // 横画面スマホ検知（画面高さが低く横長の場合、完全全画面表示モードにする）
  const [isLandscapeMobile, setIsLandscapeMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkLandscape = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isMobileHeight = window.innerHeight <= 600 || window.innerWidth <= 960;
      setIsLandscapeMobile(isLandscape && isMobileHeight);
    };
    checkLandscape();
    window.addEventListener('resize', checkLandscape);
    window.addEventListener('orientationchange', checkLandscape);
    return () => {
      window.removeEventListener('resize', checkLandscape);
      window.removeEventListener('orientationchange', checkLandscape);
    };
  }, []);

  const [engineState, setEngineState] = useState<GameEngineState>({
    gameState: 'MENU',
    score: 0,
    highScore: 0,
    distance: 0,
    speed: GAME_CONSTANTS.PHYSICS.BASE_SPEED,
    scrapCount: 0,
    nitro: 30,
    isNitroActive: false,
    health: 100,
    combo: 0,
    multiplier: 1,
  });

  const [isMuted, setIsMuted] = useState(soundManager.isMuted);

  // 初期化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = GAME_CONSTANTS.CANVAS_WIDTH;
    canvas.height = GAME_CONSTANTS.CANVAS_HEIGHT;

    const renderer = new GameRenderer(canvas);
    rendererRef.current = renderer;

    const engine = new GameEngine((state) => {
      setEngineState(state);
      if (state.gameState === 'GAMEOVER') {
        onGameOver(state.score, state.distance, state.scrapCount);
      }
    });
    engineRef.current = engine;

    engine.startGame();

    let gameOverFrames = 0;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min(0.05, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;

      if (!isPausedRef.current) {
        engine.update(dt);
      }

      renderer.render(
        engine.player,
        engine.obstacles,
        engine.particles,
        engine.floatingTexts,
        engine.distance,
        engine.camera,
        engine.speed,
        engine.nitroExpiredBannerTimer
      );

      // ゲームオーバーになった瞬間に、ループを即座に完全停止！
      if (engine.gameState === 'GAMEOVER') {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        soundManager.stopEngine();
        soundManager.stopHardEdm();
        return;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      soundManager.stopEngine();
      soundManager.stopHardEdm();
    };
  }, [onGameOver]);

  // モーダル表示（isGameOver === true）の瞬間に即時完全停止
  useEffect(() => {
    if (isGameOver) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      soundManager.stopEngine();
      soundManager.stopHardEdm();
    }
  }, [isGameOver]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setCustomSprite(customSprite);
    }
  }, [customSprite]);

  const togglePause = () => {
    const next = !isPaused;
    setIsPaused(next);
    isPausedRef.current = next;
    if (next) {
      soundManager.stopEngine();
      soundManager.stopHardEdm();
    } else {
      soundManager.startEngine();
      soundManager.startHardEdm();
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      if ('orientation' in screen && 'lock' in screen.orientation) {
        (screen.orientation as unknown as { lock: (mode: string) => Promise<void> }).lock('landscape').catch(() => {});
      }
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      if (engineRef.current.gameState === 'GAMEOVER') return;

      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        togglePause();
        return;
      }

      if (isPausedRef.current) return;

      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        engineRef.current.jump();
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        e.preventDefault();
        engineRef.current.setSliding(true);
      } else if (e.code === 'KeyD' || e.code === 'KeyX' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        engineRef.current.activateRam();
      } else if (e.code === 'KeyE' || e.code === 'KeyF' || e.code === 'Enter') {
        e.preventDefault();
        engineRef.current.activateNitro();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        engineRef.current.setSliding(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPaused]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
  };

  return (
    <div
      ref={containerRef}
      className={`select-none font-mono touch-none ${
        isLandscapeMobile
          ? 'fixed inset-0 z-40 w-screen h-screen bg-black flex flex-col justify-center items-center overflow-hidden'
          : 'relative w-full max-w-6xl mx-auto flex flex-col items-center'
      }`}
    >
      {/* HUD上部：スコア・耐久度・ニトロ（横画面スマホでは透過ミニバーとして上部に配置） */}
      <div
        className={`${
          isLandscapeMobile
            ? 'absolute top-0 left-0 right-0 z-30 bg-black/60 backdrop-blur-xs px-4 py-1 flex items-center justify-between gap-3 text-stone-200 border-b border-stone-800/80'
            : 'w-full bg-stone-950 border-2 border-stone-800 p-2 sm:p-3 mb-1 sm:mb-2 flex flex-wrap items-center justify-between gap-2 sm:gap-4 text-stone-200'
        }`}
      >
        {/* スコア・コンボ */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[9px] text-stone-400 uppercase tracking-widest">SCORE:</span>
            <span className="text-base sm:text-2xl font-black text-amber-500 tracking-wider">
              {engineState.score.toLocaleString()}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[9px] text-stone-400 uppercase tracking-widest">DIST:</span>
            <span className="text-xs sm:text-lg font-bold text-stone-300">
              {engineState.distance}m
            </span>
          </div>
          {engineState.combo > 1 && (
            <div className="flex items-center gap-1 animate-pulse">
              <Zap className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span className="text-xs sm:text-sm font-black text-red-500">
                {engineState.combo}x ({engineState.multiplier}x)
              </span>
            </div>
          )}
        </div>

        {/* 状態ゲージ（HP & NITRO） */}
        <div className="flex items-center gap-3 sm:gap-5 flex-1 max-w-[220px] sm:max-w-md">
          {/* 耐久度 HP */}
          <div className="flex-1">
            <div className="flex justify-between text-[9px] text-stone-400 mb-0.5">
              <span>HULL</span>
              <span className={engineState.health < 30 ? 'text-red-500 font-bold' : ''}>
                {engineState.health}%
              </span>
            </div>
            <div className="h-2 sm:h-3 w-full bg-stone-900 border border-stone-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-amber-600 to-emerald-600 transition-all duration-150"
                style={{ width: `${engineState.health}%` }}
              />
            </div>
          </div>

          {/* ニトロゲージ */}
          <div className="flex-1">
            <div className="flex justify-between text-[9px] text-stone-400 mb-0.5">
              <span className="flex items-center gap-1">
                <Flame className={`w-2.5 h-2.5 ${engineState.isNitroActive && engineState.nitro < 30 ? 'text-red-500 animate-ping' : 'text-sky-400'}`} />
                <span className={engineState.isNitroActive && engineState.nitro < 30 ? 'text-red-400 font-black animate-pulse' : 'text-sky-400 font-bold'}>
                  {engineState.isNitroActive && engineState.nitro < 30 ? '⚠️ CUTTING OUT!!' : 'NITRO'}
                </span>
              </span>
              <span className={engineState.isNitroActive && engineState.nitro < 30 ? 'text-red-400 font-black text-xs animate-ping' : 'text-sky-300 font-bold'}>
                {engineState.nitro}%
              </span>
            </div>
            <div className={`h-2 sm:h-3 w-full bg-stone-900 border overflow-hidden relative ${
              engineState.isNitroActive && engineState.nitro < 30 ? 'border-red-500 animate-pulse' : 'border-sky-800/60'
            }`}>
              <div
                className={`h-full transition-all duration-100 ${
                  engineState.isNitroActive && engineState.nitro < 30
                    ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500'
                    : engineState.isNitroActive
                    ? 'bg-sky-400 animate-pulse shadow-lg shadow-sky-400'
                    : 'bg-gradient-to-r from-cyan-600 to-sky-400'
                }`}
                style={{ width: `${engineState.nitro}%` }}
              />
            </div>
          </div>
        </div>

        {/* ユーティリティボタン */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={togglePause}
            className="p-1 sm:p-2 bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 transition-colors"
            title={isPaused ? '再開 (P)' : '一時停止 (P)'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={toggleMute}
            className="p-1 sm:p-2 bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 transition-colors"
            title="音量切り替え"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
          <button
            onClick={onOpenSpriteModal}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs text-stone-300 font-bold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            スプライト
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1 sm:p-2 bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 transition-colors"
            title="全画面"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* メインゲームCanvasビューポート（横画面スマホでは画面一杯の100%に最大化表示！） */}
      <div
        className={`relative overflow-hidden shadow-2xl bg-black flex items-center justify-center ${
          isLandscapeMobile
            ? 'w-full h-full border-0'
            : 'w-full aspect-[16/9] max-h-[82vh] border-2 sm:border-4 border-stone-800'
        }`}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain block image-rendering-auto"
        />

        {/* 【左下ゾーン】JUMP（画面端にスッキリ配置し、視界の邪魔にならない半透明デザイン） */}
        {engineState.gameState !== 'GAMEOVER' && (
          <div className="absolute bottom-2.5 left-2.5 sm:bottom-4 sm:left-4 z-30 pointer-events-auto">
            {/* JUMP ボタン */}
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                engineRef.current?.jump();
              }}
              onClick={() => engineRef.current?.jump()}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/20 active:bg-amber-500 border border-amber-500/60 active:border-amber-300 backdrop-blur-xs flex flex-col items-center justify-center text-amber-400 active:text-stone-950 shadow-lg shadow-amber-500/20 transition-transform active:scale-90"
            >
              <ChevronUp className="w-5 h-5 -mb-0.5 stroke-[2.5]" />
              <span className="text-[10px] font-black tracking-widest uppercase">JUMP</span>
              <span className="text-[8px] font-bold opacity-80">(x2)</span>
            </button>
          </div>
        )}

        {/* 【右下ゾーン】NITRO ＆ RAM（画面端にスッキリ配置し、大きさを揃えた半透明デザイン） */}
        {engineState.gameState !== 'GAMEOVER' && (
          <div className="absolute bottom-2.5 right-2.5 sm:bottom-4 sm:right-4 flex items-end gap-2 sm:gap-2.5 z-30 pointer-events-auto">
            {/* NITRO ボタン */}
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                engineRef.current?.activateNitro();
              }}
              onClick={() => engineRef.current?.activateNitro()}
              disabled={engineState.nitro < 30 || engineState.isNitroActive}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border backdrop-blur-xs flex flex-col items-center justify-center shadow-lg transition-transform active:scale-90 ${
                engineState.isNitroActive && engineState.nitro < 30
                  ? 'bg-red-600 text-white border-red-400 animate-ping font-black shadow-red-500/80'
                  : engineState.isNitroActive
                  ? 'bg-sky-500 text-stone-950 border-sky-300 animate-pulse font-black shadow-sky-500/40'
                  : engineState.nitro >= 30
                  ? 'bg-sky-950/50 active:bg-sky-500 active:text-stone-950 border-sky-500/70 text-sky-400 animate-pulse'
                  : 'bg-black/35 border-stone-800 text-stone-600 opacity-40 cursor-not-allowed'
              }`}
            >
              <Flame className="w-5 h-5 -mb-0.5" />
              <span className="text-[10px] font-black tracking-wider uppercase">
                {engineState.isNitroActive && engineState.nitro < 30 ? 'CUTTING!' : 'NITRO'}
              </span>
            </button>

            {/* RAM ATTACK ボタン */}
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                engineRef.current?.activateRam();
              }}
              onClick={() => engineRef.current?.activateRam()}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-600/25 active:bg-red-600 border border-red-500/60 active:border-red-300 backdrop-blur-xs flex flex-col items-center justify-center text-red-500 active:text-white shadow-lg shadow-red-600/20 transition-transform active:scale-90"
            >
              <ShieldAlert className="w-5 h-5 -mb-0.5" />
              <span className="text-[10px] font-black tracking-widest uppercase">RAM</span>
            </button>
          </div>
        )}

        {/* ポーズ中のオーバーレイ */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center text-amber-500 font-black z-30">
            <span className="text-3xl tracking-widest uppercase mb-2">PAUSED</span>
            <span className="text-xs text-stone-400 font-sans">
              画面右上のボタンまたは [P] キーで再開
            </span>
          </div>
        )}

        {/* ニトロ発動中の画面全体エフェクトオーバレイ */}
        {engineState.isNitroActive && (
          <div
            className={`absolute inset-0 pointer-events-none border-4 mix-blend-screen z-10 ${
              engineState.nitro < 30
                ? 'border-red-500/80 animate-ping shadow-[inset_0_0_40px_rgba(239,68,68,0.5)]'
                : 'border-sky-400/40 animate-pulse'
            }`}
          />
        )}
      </div>

      {/* デスクトップ用 下部操作ガイド（スマホ横画面時は非表示） */}
      {!isLandscapeMobile && (
        <div className="w-full mt-2 hidden sm:grid grid-cols-3 gap-2 text-stone-300 text-center text-xs">
          <div className="bg-stone-900/60 border border-stone-800 p-2">
            <span className="text-amber-500 font-bold block">SPACE / W</span>
            <span>2段ジャンプ</span>
          </div>
          <div className="bg-stone-900/60 border border-stone-800 p-2">
            <span className="text-red-500 font-bold block">D / SHIFT</span>
            <span>RAM突撃（粉砕）</span>
          </div>
          <div className="bg-stone-900/60 border border-stone-800 p-2">
            <span className="text-sky-400 font-bold block">E / ENTER</span>
            <span>ニトロ加速</span>
          </div>
        </div>
      )}
    </div>
  );
};
