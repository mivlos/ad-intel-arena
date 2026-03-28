'use client';

import { QueryMode } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';

const AD_INSIGHTS = [
  "73% of Gen Z discover brands through social media — Kantar 2025",
  "Humour in advertising increases purchase intent by 24% — IPA Databank",
  "Emotion-led campaigns are 2x more effective than rational ones — System1",
  "Brand-building drives 60% of sales in the long term — Ehrenberg-Bass",
  "Attention spans haven't shrunk — they've become more selective — ThinkBox",
  "Creative quality drives 47% of advertising effectiveness — Nielsen",
];

function RotatingInsights() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(i => (i + 1) % AD_INSIGHTS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-8 flex items-center justify-center mb-4 overflow-hidden">
      <div className="relative w-full text-center">
        <p
          key={index}
          className="text-xs text-zinc-500 italic animate-insightFade"
        >
          💡 {AD_INSIGHTS[index]}
        </p>
      </div>
    </div>
  );
}

const EXAMPLE_QUERIES: Record<QueryMode, string[]> = {
  creative: [
    'What creative approaches resonate with Gen Z women for beauty brands?',
    'Will humour-based advertising work for financial services targeting 45-65 year olds?',
    'We want to target 18-24 year old women in Dubai with athleisure — what messaging will resonate?',
  ],
  audience: [
    'Do young men aged 18-25 in Texas play golf? What sports do they follow?',
    'What do professional women aged 30-45 in London value in luxury brands?',
    'What media do Gen Z males in Japan consume? What influences their purchase decisions?',
  ],
};

interface QueryInputProps {
  mode: QueryMode;
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

export default function QueryInput({ mode, onSubmit, isLoading }: QueryInputProps) {
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSubmit(query.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  const placeholder =
    mode === 'creative'
      ? 'Ask about creative strategies, messaging angles, or brief effectiveness...'
      : 'Ask about audience demographics, psychographics, behaviors, or media habits...';

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <RotatingInsights />
      <form onSubmit={handleSubmit}>
        <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl focus-within:border-zinc-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={3}
            className="w-full bg-transparent text-white placeholder-zinc-500 px-4 pt-4 pb-12 resize-none outline-none text-sm leading-relaxed min-h-[80px] max-h-[200px]"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="text-zinc-600 text-xs hidden sm:block">⌘↵ to submit</span>
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="px-4 py-1.5 bg-white text-black text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
            >
              {isLoading ? 'Running...' : 'Compare'}
            </button>
          </div>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLE_QUERIES[mode].map((example) => (
          <button
            key={example}
            onClick={() => setQuery(example)}
            className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 rounded-full px-3 py-1.5 transition-all text-left"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
