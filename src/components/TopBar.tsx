'use client';

import { QueryMode } from '@/lib/types';

interface TopBarProps {
  mode: QueryMode;
  onModeChange: (mode: QueryMode) => void;
}

export default function TopBar({ mode, onModeChange }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
            AI
          </div>
          <span className="text-white font-semibold text-base tracking-tight">
            Ad Intelligence Arena
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        <button
          onClick={() => onModeChange('creative')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            mode === 'creative'
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Creative Intelligence
        </button>
        <button
          onClick={() => onModeChange('audience')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            mode === 'audience'
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Audience Insights
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-xs">Powered by</span>
        <span className="text-white font-bold text-sm tracking-wide">Zappi</span>
      </div>
    </header>
  );
}
