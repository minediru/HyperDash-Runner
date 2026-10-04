import React from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

interface Props {
  onForceFullscreen?: () => void;
}

export const RotateNoticeOverlay: React.FC<Props> = ({ onForceFullscreen }) => {
  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-stone-100 select-none">
      {/* 世紀末警告ストライプ */}
      <div className="absolute top-0 left-0 right-0 h-3 bg-[repeating-linear-gradient(45deg,#d97706,#d97706_15px,#1c1917_15px,#1c1917_30px)]" />
      <div className="absolute bottom-0 left-0 right-0 h-3 bg-[repeating-linear-gradient(45deg,#d97706,#d97706_15px,#1c1917_15px,#1c1917_30px)]" />

      {/* 回転アニメーションアイコン */}
      <div className="relative mb-6">
        <div className="p-6 bg-stone-900 border-2 border-amber-500 shadow-2xl shadow-amber-500/20 rounded-2xl flex items-center justify-center animate-pulse">
          <Smartphone className="w-16 h-16 text-amber-500 rotate-90 transition-transform duration-700" />
        </div>
        <div className="absolute -bottom-2 -right-2 p-2 bg-amber-500 text-stone-950 rounded-full animate-spin">
          <RotateCw className="w-5 h-5 stroke-[2.5]" />
        </div>
      </div>

      <div className="inline-block px-3 py-1 bg-amber-950/60 border border-amber-600/60 text-amber-400 font-mono text-xs font-bold uppercase tracking-widest mb-3">
        LANDSCAPE MODE REQUIRED
      </div>

      <h2 className="text-2xl font-black text-amber-500 uppercase tracking-tight mb-2">
        端末を横向きに回転してください
      </h2>
      <p className="text-xs text-stone-400 max-w-xs leading-relaxed mb-6 font-sans">
        『WASTELAND FURY』は横画面専用の世紀末カーアクションゲームです。両手親指操作のゲームパッド配置で超快適にプレイできます！
      </p>

      {onForceFullscreen && (
        <button
          onClick={onForceFullscreen}
          className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-stone-950 text-sm font-black uppercase tracking-wider shadow-lg shadow-orange-900/40 cursor-pointer active:scale-95"
        >
          全画面＆横画面に切り替え
        </button>
      )}
    </div>
  );
};
