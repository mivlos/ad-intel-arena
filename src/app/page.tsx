'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import TopBar from '@/components/TopBar';
import QueryInput from '@/components/QueryInput';
import ModelColumn from '@/components/ModelColumn';
import SummaryBar from '@/components/SummaryBar';
import ZappiChat from '@/components/ZappiChat';
import EvaluationsTab from '@/components/EvaluationsTab';
import {
  ModelId,
  ModelState,
  QueryHistoryEntry,
  QueryMode,
  StreamChunk,
  EvaluationResult,
  StoredEvaluation,
} from '@/lib/types';
import { MODEL_CONFIG } from '@/lib/types';

const HISTORY_KEY = 'ad-intel-arena-history';
const TAB_KEY = 'ad-intel-arena-tab';
const EVALS_KEY = 'arena-evaluations';
const MAX_HISTORY = 10;

type ActiveTab = 'arena' | 'zappi-chat' | 'evaluations';

const MODEL_IDS: ModelId[] = ['zappi', 'claude', 'gemini', 'openai'];

const API_ROUTES: Record<ModelId, string> = {
  zappi: '/api/query/zappi',
  claude: '/api/query/anthropic',
  gemini: '/api/query/gemini',
  openai: '/api/query/openai',
};

function makeIdleState(): ModelState {
  return {
    status: 'idle',
    content: '',
    startTime: null,
    endTime: null,
    tokens: null,
    rating: null,
    error: null,
  };
}

function makeInitialModels(): Record<ModelId, ModelState> {
  return { zappi: makeIdleState(), claude: makeIdleState(), gemini: makeIdleState(), openai: makeIdleState() };
}

const EVAL_CRITERIA_LIST = [
  'Data specificity & citations',
  'Cultural/social insight depth',
  'Actionable recommendations',
  'Evidence quality',
  'Local execution detail',
  'Risk identification',
  'Category coherence',
];

function EvalCriteriaAnimation() {
  const [visible, setVisible] = useState<number[]>([]);

  useEffect(() => {
    EVAL_CRITERIA_LIST.forEach((_, i) => {
      setTimeout(() => {
        setVisible(prev => [...prev, i]);
      }, i * 100);
    });
  }, []);

  return (
    <div className="space-y-1">
      {EVAL_CRITERIA_LIST.map((criterion, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 text-xs transition-all duration-200 ${
            visible.includes(i) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
          }`}
        >
          <span className="text-emerald-400">✅</span>
          <span className="text-zinc-500">{criterion}</span>
        </div>
      ))}
    </div>
  );
}

const RANK_MEDAL = ['🥇', '🥈', '🥉', ''];

function pct(score: number, total: number) {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

function scoreColor(p: number) {
  if (p > 70) return 'text-emerald-400';
  if (p >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('arena');
  const [mode, setMode] = useState<QueryMode>('creative');
  const [models, setModels] = useState<Record<ModelId, ModelState>>(makeInitialModels());
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');

  // Evaluation state
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const evaluationTriggeredRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
    try {
      const storedTab = localStorage.getItem(TAB_KEY);
      if (storedTab === 'arena' || storedTab === 'zappi-chat' || storedTab === 'evaluations') {
        setActiveTab(storedTab as ActiveTab);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      // ignore
    }
  }, []);

  const abortRefs = useRef<Record<ModelId, AbortController | null>>({
    zappi: null,
    claude: null,
    gemini: null,
    openai: null,
  });

  const updateModel = useCallback((id: ModelId, updates: Partial<ModelState>) => {
    setModels((prev) => ({ ...prev, [id]: { ...prev[id], ...updates } }));
  }, []);

  // Auto-trigger evaluation when all 4 streams complete
  useEffect(() => {
    const allDone = MODEL_IDS.every(
      (id) => models[id].status === 'done' || models[id].status === 'error'
    );
    const anyStarted = MODEL_IDS.some(
      (id) => models[id].status !== 'idle'
    );
    const hasContent = MODEL_IDS.some((id) => models[id].content.length > 0);

    if (allDone && anyStarted && hasContent && !evaluationTriggeredRef.current && currentQuery) {
      evaluationTriggeredRef.current = true;
      triggerEvaluation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, currentQuery]);

  const triggerEvaluation = useCallback(async () => {
    setIsEvaluating(true);
    setEvaluationResult(null);

    const responses = MODEL_IDS.map((id) => ({
      platform: id,
      content: models[id].content,
    })).filter((r) => r.content.length > 0);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery, responses, mode }),
      });

      if (!res.ok) {
        console.error('Evaluation failed:', await res.text());
        return;
      }

      const result: EvaluationResult = await res.json();
      setEvaluationResult(result);

      // Persist to localStorage
      const stored: StoredEvaluation = {
        date: new Date().toISOString().split('T')[0],
        query: currentQuery,
        queryType: result.queryType,
        evalSet: result.evalSet,
        platforms: Object.fromEntries(
          MODEL_IDS.map((id) => [
            id,
            { score: result.platforms[id]?.score ?? 0, total: result.platforms[id]?.total ?? 0 },
          ])
        ),
        ranking: result.ranking,
        convergenceFlag: result.convergenceFlag,
      };

      try {
        const existing = localStorage.getItem(EVALS_KEY);
        const arr: StoredEvaluation[] = existing ? JSON.parse(existing) : [];
        arr.unshift(stored);
        localStorage.setItem(EVALS_KEY, JSON.stringify(arr.slice(0, 100)));
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('Evaluation error:', err);
    } finally {
      setIsEvaluating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, currentQuery, mode]);

  const streamModel = useCallback(
    async (id: ModelId, query: string, signal: AbortSignal) => {
      const startTime = Date.now();
      updateModel(id, {
        status: 'loading',
        content: '',
        startTime,
        endTime: null,
        tokens: null,
        error: null,
      });

      try {
        const response = await fetch(API_ROUTES[id], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
          signal,
        });

        if (!response.ok) {
          const text = await response.text();
          updateModel(id, {
            status: 'error',
            error: `HTTP ${response.status}: ${text}`,
            endTime: Date.now(),
          });
          return;
        }

        updateModel(id, { status: 'streaming' });

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            try {
              const chunk: StreamChunk = JSON.parse(raw);
              if (chunk.type === 'text' && chunk.content) {
                setModels((prev) => ({
                  ...prev,
                  [id]: { ...prev[id], content: prev[id].content + chunk.content },
                }));
              } else if (chunk.type === 'replace' && chunk.content !== undefined) {
                setModels((prev) => ({
                  ...prev,
                  [id]: { ...prev[id], content: chunk.content! },
                }));
              } else if (chunk.type === 'done') {
                updateModel(id, {
                  status: 'done',
                  endTime: Date.now(),
                  tokens: chunk.tokens ?? null,
                });
              } else if (chunk.type === 'error') {
                updateModel(id, {
                  status: 'error',
                  error: chunk.message ?? 'Unknown error',
                  endTime: Date.now(),
                });
              }
            } catch {
              // malformed SSE chunk, skip
            }
          }
        }

        // Ensure done state if stream closed without explicit done event
        setModels((prev) => {
          if (prev[id].status === 'streaming') {
            return {
              ...prev,
              [id]: { ...prev[id], status: 'done', endTime: Date.now() },
            };
          }
          return prev;
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        updateModel(id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
          endTime: Date.now(),
        });
      }
    },
    [updateModel]
  );

  const handleSubmit = useCallback(
    (query: string) => {
      MODEL_IDS.forEach((id) => {
        abortRefs.current[id]?.abort();
        abortRefs.current[id] = new AbortController();
      });

      setModels(makeInitialModels());
      setCurrentQuery(query);
      setEvaluationResult(null);
      setIsEvaluating(false);
      evaluationTriggeredRef.current = false;

      const entry: QueryHistoryEntry = { query, mode, timestamp: Date.now() };
      setHistory((prev) => {
        const next = [entry, ...prev.filter((e) => e.query !== query)].slice(
          0,
          MAX_HISTORY
        );
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });

      MODEL_IDS.forEach((id) => {
        streamModel(id, query, abortRefs.current[id]!.signal);
      });
    },
    [mode, streamModel]
  );

  const handleRating = useCallback((modelId: ModelId, rating: 'up' | 'down') => {
    setModels((prev) => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        rating: prev[modelId].rating === rating ? null : rating,
      },
    }));
  }, []);

  const handleHistoryClick = useCallback(
    (entry: QueryHistoryEntry) => {
      setMode(entry.mode);
      handleSubmit(entry.query);
    },
    [handleSubmit]
  );

  const anyActive = MODEL_IDS.some(
    (id) => models[id].status === 'loading' || models[id].status === 'streaming'
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-950">
      {/* Tab toggle — very top of page */}
      <div className="sticky top-0 z-20 flex items-center px-6 py-2 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <button
            onClick={() => handleTabChange('arena')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'arena'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Arena
          </button>
          <button
            onClick={() => handleTabChange('zappi-chat')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'zappi-chat'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Zappi Chat
          </button>
          <button
            onClick={() => handleTabChange('evaluations')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'evaluations'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Evaluations
          </button>
        </div>
      </div>

      {activeTab === 'arena' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar mode={mode} onModeChange={setMode} />

          <div className="py-6 border-b border-zinc-800/60 bg-zinc-950">
            <QueryInput mode={mode} onSubmit={handleSubmit} isLoading={anyActive} />
          </div>

          {/* Evaluation loading — animated criteria */}
          {isEvaluating && (
            <div className="px-4 pt-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                  <span>Evaluating responses...</span>
                </div>
                <EvalCriteriaAnimation />
              </div>
            </div>
          )}

          {/* Ranking banner */}
          {evaluationResult && !isEvaluating && (
            <div className="px-4 pt-3 space-y-2">
              {/* Convergence warning */}
              {evaluationResult.convergenceFlag && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-2">
                  ⚠ 3+ platforms converged on the same core recommendation — insight may be directionally correct but competitively undifferentiated
                </div>
              )}

              {/* Ranking bar — grid matches the 4-column model layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {MODEL_IDS.map((pid) => {
                  const p = evaluationResult.platforms[pid];
                  if (!p) return null;
                  const rank = evaluationResult.ranking.indexOf(pid);
                  const score = pct(p.score, p.total);
                  const config = MODEL_CONFIG[pid];
                  return (
                    <div
                      key={pid}
                      className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg"
                    >
                      <span className="text-base leading-none w-5 shrink-0">{RANK_MEDAL[rank] ?? ''}</span>
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-semibold ${config?.accentText ?? 'text-zinc-400'} truncate`}>
                          {config?.label ?? pid}
                        </div>
                        <div className={`text-xs font-mono font-bold ${scoreColor(score)}`}>
                          {p.score}/{p.total} ({score}%)
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-600 font-mono shrink-0">#{rank + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto p-4 md:p-6 bg-zinc-950">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[500px]">
              {MODEL_IDS.map((id) => (
                <ModelColumn
                  key={id}
                  modelId={id}
                  state={models[id]}
                  onRating={(rating) => handleRating(id, rating)}
                  evalResult={evaluationResult?.platforms[id] ?? undefined}
                />
              ))}
            </div>
          </div>

          <SummaryBar
            models={models}
            history={history}
            onHistoryClick={handleHistoryClick}
            evalResult={evaluationResult}
          />
        </div>
      ) : activeTab === 'zappi-chat' ? (
        <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
          <ZappiChat />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <EvaluationsTab />
        </div>
      )}
    </div>
  );
}
