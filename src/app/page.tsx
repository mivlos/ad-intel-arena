'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import TopBar from '@/components/TopBar';
import QueryInput from '@/components/QueryInput';
import ModelColumn from '@/components/ModelColumn';
import SummaryBar from '@/components/SummaryBar';
import {
  ModelId,
  ModelState,
  QueryHistoryEntry,
  QueryMode,
  StreamChunk,
} from '@/lib/types';

const HISTORY_KEY = 'ad-intel-arena-history';
const MAX_HISTORY = 10;

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

export default function HomePage() {
  const [mode, setMode] = useState<QueryMode>('creative');
  const [models, setModels] = useState<Record<ModelId, ModelState>>(makeInitialModels());
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // ignore parse errors
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
    <div className="flex flex-col min-h-screen">
      <TopBar mode={mode} onModeChange={setMode} />

      <div className="py-6 border-b border-zinc-800/60 bg-zinc-950">
        <QueryInput mode={mode} onSubmit={handleSubmit} isLoading={anyActive} />
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 bg-zinc-950">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[500px]">
          {MODEL_IDS.map((id) => (
            <ModelColumn
              key={id}
              modelId={id}
              state={models[id]}
              onRating={(rating) => handleRating(id, rating)}
            />
          ))}
        </div>
      </div>

      <SummaryBar models={models} history={history} onHistoryClick={handleHistoryClick} />
    </div>
  );
}
