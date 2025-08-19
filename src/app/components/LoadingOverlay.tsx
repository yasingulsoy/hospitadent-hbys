import React from 'react';

type LoadingOverlayProps = {
  message?: string;
  fullscreen?: boolean;
};

export default function LoadingOverlay({ message = 'Yükleniyor...', fullscreen = true }: LoadingOverlayProps) {
  return (
    <div
      className={`${fullscreen ? 'fixed inset-0' : 'absolute inset-0'} z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-[1px]`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Neon halkalar */}
        <div className="relative">
          <div className="w-28 h-28 rounded-full border-t-4 border-fuchsia-500/80 animate-spin-slow drop-shadow-[0_0_20px_rgba(217,70,239,0.7)]" />
          <div className="absolute inset-0 m-auto w-20 h-20 rounded-full border-b-4 border-purple-500/80 animate-spin drop-shadow-[0_0_16px_rgba(168,85,247,0.7)]" />
          <div className="absolute inset-0 m-auto w-12 h-12 rounded-full border-l-4 border-indigo-500/90 animate-spin-fast drop-shadow-[0_0_14px_rgba(99,102,241,0.8)]" />
        </div>

        {/* Başlık ve alt metin */}
        <div className="space-y-1">
          <div className="text-white/90 text-lg font-semibold tracking-wide animate-pulse-glow">
            {message}
          </div>
          <div className="text-white/50 text-xs">
            Lütfen bekleyin
          </div>
        </div>
      </div>
    </div>
  );
}


