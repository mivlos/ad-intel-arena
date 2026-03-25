export type QueryMode = 'creative' | 'audience';

export type ModelId = 'zappi' | 'claude' | 'gemini' | 'openai';

export type ModelStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

export type Rating = 'up' | 'down' | null;

export interface ModelState {
  status: ModelStatus;
  content: string;
  startTime: number | null;
  endTime: number | null;
  tokens: number | null;
  rating: Rating;
  error: string | null;
}

export interface QueryHistoryEntry {
  query: string;
  mode: QueryMode;
  timestamp: number;
}

export interface StreamChunk {
  type: 'text' | 'replace' | 'done' | 'error';
  content?: string;
  tokens?: number;
  message?: string;
}

// ─── Evaluation types ───────────────────────────────────────────────────────

export interface CriterionResult {
  pass: boolean;
  evidence: string;
}

export interface PlatformEvalResult {
  score: number;
  total: number;
  criteria: Record<string, CriterionResult>;
}

export interface EvaluationResult {
  queryType: string;
  evalSet: string;
  platforms: Record<ModelId, PlatformEvalResult>;
  ranking: ModelId[];
  convergenceFlag: boolean;
  universallyPassed: string[];
  universallyFailed: string[];
  metaPatterns: string;
}

export interface StoredEvaluation {
  date: string;
  query: string;
  queryType: string;
  evalSet: string;
  platforms: Record<string, { score: number; total: number }>;
  ranking: string[];
  convergenceFlag: boolean;
}

// ─── Model config ────────────────────────────────────────────────────────────

export const MODEL_CONFIG: Record<ModelId, { label: string; accent: string; accentBg: string; accentBorder: string; accentText: string; badge?: string }> = {
  zappi: {
    label: 'Zappi Ad Intelligence',
    accent: '#FF6B00',
    accentBg: 'bg-orange-900/20',
    accentBorder: 'border-orange-700/50',
    accentText: 'text-orange-400',
    badge: 'BASELINE',
  },
  claude: {
    label: 'Claude Opus 4.6',
    accent: '#7c3aed',
    accentBg: 'bg-purple-900/20',
    accentBorder: 'border-purple-700/50',
    accentText: 'text-purple-400',
  },
  gemini: {
    label: 'Gemini 2.5 Pro',
    accent: '#2563eb',
    accentBg: 'bg-blue-900/20',
    accentBorder: 'border-blue-700/50',
    accentText: 'text-blue-400',
  },
  openai: {
    label: 'OpenAI o3',
    accent: '#059669',
    accentBg: 'bg-emerald-900/20',
    accentBorder: 'border-emerald-700/50',
    accentText: 'text-emerald-400',
  },
};
