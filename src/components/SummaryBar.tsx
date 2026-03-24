'use client';

import { ModelId, ModelState, MODEL_CONFIG, QueryHistoryEntry, QueryMode } from '@/lib/types';

interface SummaryBarProps {
  models: Record<ModelId, ModelState>;
  history: QueryHistoryEntry[];
  onHistoryClick: (entry: QueryHistoryEntry) => void;
}

export default function SummaryBar({ models, history, onHistoryClick }: SummaryBarProps) {
  const modelIds: ModelId[] = ['zappi', 'claude', 'gemini', 'openai'];

  const doneModels = modelIds.filter((id) => models[id].status === 'done');

  const fastestModel = doneModels.reduce<{ id: ModelId | null; time: number }>(
    (acc, id) => {
      const s = models[id];
      if (s.startTime && s.endTime) {
        const t = s.endTime - s.startTime;
        if (acc.id === null || t < acc.time) return { id, time: t };
      }
      return acc;
    },
    { id: null, time: Infinity }
  );

  const ratings = modelIds.map((id) => models[id].rating).filter(Boolean);
  const upCount = ratings.filter((r) => r === 'up').length;
  const avgRating = ratings.length > 0 ? `${upCount}/${ratings.length} positive` : null;

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-6 py-3">
      <div className="flex items-start gap-6 flex-wrap">
        {/* Stats */}
        {(fastestModel.id || avgRating) && (
          <div className="flex items-center gap-4 text-xs">
            {fastestModel.id && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">Fastest:</span>
                <span className={`font-medium ${MODEL_CONFIG[fastestModel.id].accentText}`}>
                  {MODEL_CONFIG[fastestModel.id].label}
                </span>
                <span className="text-zinc-600 font-mono">
                  ({(fastestModel.time / 1000).toFixed(1)}s)
                </span>
              </div>
            )}
            {avgRating && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">Ratings:</span>
                <span className="text-zinc-300 font-medium">{avgRating}</span>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-zinc-500 text-xs shrink-0">Recent:</span>
              {history.slice(0, 5).map((entry, i) => (
                <button
                  key={i}
                  onClick={() => onHistoryClick(entry)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-md px-2 py-0.5 transition-all truncate max-w-[200px]"
                  title={entry.query}
                >
                  <span className="text-zinc-600 mr-1">
                    {entry.mode === 'creative' ? '🎨' : '👥'}
                  </span>
                  {entry.query}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
