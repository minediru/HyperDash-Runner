import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, X, RefreshCw, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSpriteChange: (img: HTMLImageElement | null) => void;
  hasCustomSprite: boolean;
}

export const SpriteUploadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSpriteChange,
  hasCustomSprite,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setPreviewUrl(url);
      const img = new Image();
      img.onload = () => {
        onSpriteChange(img);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleResetToSymbol = () => {
    setPreviewUrl(null);
    onSpriteChange(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-stone-900 border-2 border-amber-600 p-6 text-stone-200">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-black uppercase text-amber-500">
              主人公スプライト差し替えテスター
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-stone-800 text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-400 mb-4 leading-relaxed">
          自作のドット絵（PNG/GIF）やイラスト画像をアップロードすると、現在の記号/SVGバギーから即座に差し替えて走らせることができます。
        </p>

        {/* ドロップゾーン */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-stone-700 hover:border-amber-500 bg-stone-950 p-6 text-center cursor-pointer transition-colors mb-4 flex flex-col items-center justify-center min-h-[140px]"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            accept="image/*"
            className="hidden"
          />
          {previewUrl || hasCustomSprite ? (
            <div className="flex flex-col items-center gap-2">
              <img
                src={previewUrl || ''}
                alt="Preview"
                className="max-h-24 max-w-full object-contain image-rendering-pixelated border border-stone-800 p-1 bg-stone-900"
              />
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> カスタムスプライト適用中（クリックで変更）
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-stone-400">
              <Upload className="w-8 h-8 text-amber-500" />
              <span className="text-xs font-semibold">
                画像をここにドラッグ＆ドロップ、またはクリックして選択
              </span>
              <span className="text-[10px] text-stone-500">
                推奨: 透過PNG（横長 100x65px 程度のドット絵）
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          {hasCustomSprite && (
            <button
              onClick={handleResetToSymbol}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-xs text-stone-300 font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> デフォルトのSVG記号に戻す
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
};
