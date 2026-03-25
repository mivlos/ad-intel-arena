'use client';

import { ModelId, ModelState, MODEL_CONFIG, PlatformEvalResult } from '@/lib/types';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ModelColumnProps {
  modelId: ModelId;
  state: ModelState;
  onRating: (rating: 'up' | 'down') => void;
  evalResult?: PlatformEvalResult;
}

function ElapsedTimer({ startTime, endTime }: { startTime: number | null; endTime: number | null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    if (endTime) {
      setElapsed((endTime - startTime) / 1000);
      return;
    }
    const interval = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  if (!startTime) return null;
  return (
    <span className="text-zinc-400 text-xs font-mono tabular-nums">
      {elapsed.toFixed(1)}s
    </span>
  );
}

function ScoreBadge({ result }: { result: PlatformEvalResult }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((result.score / result.total) * 100);
  const color = pct > 70 ? 'text-emerald-400 border-emerald-700/60' : pct >= 40 ? 'text-yellow-400 border-yellow-700/60' : 'text-red-400 border-red-700/60';

  const criteriaEntries = Object.entries(result.criteria);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${color} bg-zinc-900/60 hover:bg-zinc-800 transition-colors`}
        title="Click to see criterion breakdown"
      >
        {result.score}/{result.total} — {pct}%
      </button>
      {open && criteriaEntries.length > 0 && (
        <div className="absolute right-0 top-full mt-1 z-30 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wide font-semibold">
            Criterion Breakdown
          </div>
          <div className="divide-y divide-zinc-800/60 max-h-64 overflow-y-auto">
            {criteriaEntries.map(([id, cr]) => (
              <div key={id} className="flex items-start gap-2 px-3 py-2">
                <span className={`mt-0.5 shrink-0 text-xs font-bold ${cr.pass ? 'text-emerald-400' : 'text-red-400'}`}>
                  {cr.pass ? '✓' : '✗'}
                </span>
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-zinc-300">{id}</span>
                  <p className="text-[10px] text-zinc-500 leading-snug mt-0.5">{cr.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModelColumn({ modelId, state, onRating, evalResult }: ModelColumnProps) {
  const config = MODEL_CONFIG[modelId];

  const handleCopy = () => {
    navigator.clipboard.writeText(state.content).catch(() => {});
  };

  return (
    <div className={`flex flex-col h-full min-h-[500px] rounded-xl border ${config.accentBorder} ${config.accentBg} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.accent }}
          />
          <span className={`text-sm font-semibold ${config.accentText}`}>
            {config.label}
          </span>
          {config.badge && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: config.accent, color: '#fff' }}
            >
              {config.badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {evalResult && <ScoreBadge result={evalResult} />}
          {state.status === 'loading' || state.status === 'streaming' ? (
            <div className="flex items-center gap-1.5">
              <Spinner color={config.accent} />
              <ElapsedTimer startTime={state.startTime} endTime={null} />
            </div>
          ) : state.status === 'done' ? (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <ElapsedTimer startTime={state.startTime} endTime={state.endTime} />
            </div>
          ) : state.status === 'error' ? (
            <span className="text-red-400 text-xs">Error</span>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 text-sm text-zinc-200 leading-relaxed">
        {state.status === 'idle' && (
          <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
            Waiting for query...
          </div>
        )}

        {(state.status === 'loading') && (
          <div className="space-y-3 animate-pulse">
            <div className="h-3 bg-zinc-800 rounded w-full" />
            <div className="h-3 bg-zinc-800 rounded w-5/6" />
            <div className="h-3 bg-zinc-800 rounded w-4/6" />
            <div className="h-3 bg-zinc-800 rounded w-full mt-4" />
            <div className="h-3 bg-zinc-800 rounded w-3/4" />
          </div>
        )}

        {state.status === 'error' && (
          <div className="text-red-400 text-sm p-3 bg-red-900/20 rounded-lg border border-red-900/40">
            <span className="font-medium">Error:</span> {state.error}
          </div>
        )}

        {(state.status === 'streaming' || state.status === 'done') && state.content && (
          <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-100 prose-strong:text-zinc-100 prose-code:text-zinc-200 prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded prose-pre:bg-zinc-800 prose-ul:text-zinc-200 prose-ol:text-zinc-200 prose-li:marker:text-zinc-500">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {state.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800/60 bg-zinc-900/30">
        <div className="flex items-center gap-1">
          {state.tokens !== null && (
            <span className="text-zinc-500 text-xs">{state.tokens.toLocaleString()} tokens</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            disabled={!state.content}
            title="Copy response"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => onRating('up')}
            disabled={state.status !== 'done'}
            className={`p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              state.rating === 'up'
                ? 'text-emerald-400 bg-emerald-900/30'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill={state.rating === 'up' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
          </button>
          <button
            onClick={() => onRating('down')}
            disabled={state.status !== 'done'}
            className={`p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              state.rating === 'down'
                ? 'text-red-400 bg-red-900/30'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill={state.rating === 'down' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <svg
      className="w-3.5 h-3.5 animate-spin"
      style={{ color }}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
