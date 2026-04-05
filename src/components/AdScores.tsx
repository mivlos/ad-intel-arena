'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Platform = 'facebook' | 'instagram' | 'tiktok' | 'youtube';
type ScoringMode = 'simulation' | 'live';

interface AdEntry {
  ad_url: string;
  ad_name: string;
  brand_name: string;
  platform: Platform;
}

interface AdRunAd {
  uuid: string;
  status: string;
  ad_name?: string;
}

interface AdRun {
  uuid: string;
  status: string;
  ad_count: number;
  ads: AdRunAd[];
}

interface AdResult {
  uuid: string;
  status: string;
  overall_rating?: { rating: number; label: string };
  summary?: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  metadata?: { timestamp: string };
  error?: string;
  retryable?: boolean;
}

interface StoredRun {
  uuid: string;
  mode: ScoringMode;
  ads: AdEntry[];
  createdAt: string;
  status: string;
  results: Record<string, AdResult>;
}

const STORAGE_KEY = 'ad-scores-history';
const MAX_ADS = 10;

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
];

function emptyAd(): AdEntry {
  return { ad_url: '', ad_name: '', brand_name: '', platform: 'facebook' };
}

// ─── Star Rating ─────────────────────────────────────────────────────────────

function StarRating({ rating, label }: { rating: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={`w-5 h-5 ${i <= rating ? 'text-[#FF6B00]' : 'text-zinc-700'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm font-medium text-zinc-300">{label}</span>
    </div>
  );
}

// ─── Badge / Pill ────────────────────────────────────────────────────────────

function Badge({
  text,
  variant,
}: {
  text: string;
  variant: 'green' | 'red' | 'blue';
}) {
  const styles = {
    green: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
    red: 'bg-red-900/40 text-red-300 border-red-700/40',
    blue: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  };
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs border ${styles[variant]}`}
    >
      {text}
    </span>
  );
}

// ─── Status Indicator ────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'completed'
      ? 'bg-emerald-400'
      : status === 'failed'
      ? 'bg-red-400'
      : status === 'processing'
      ? 'bg-yellow-400 animate-pulse'
      : 'bg-zinc-500 animate-pulse';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdScores() {
  const [ads, setAds] = useState<AdEntry[]>([emptyAd()]);
  const [mode, setMode] = useState<ScoringMode>('simulation');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active run state
  const [activeRun, setActiveRun] = useState<AdRun | null>(null);
  const [activeResults, setActiveResults] = useState<Record<string, AdResult>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // History
  const [history, setHistory] = useState<StoredRun[]>([]);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const saveHistory = useCallback((runs: StoredRun[]) => {
    setHistory(runs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(runs.slice(0, 50)));
    } catch {
      // ignore
    }
  }, []);

  // ── Form handlers ──────────────────────────────────────────────────────────

  const updateAd = (index: number, field: keyof AdEntry, value: string) => {
    setAds((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addAd = () => {
    if (ads.length < MAX_ADS) setAds((prev) => [...prev, emptyAd()]);
  };

  const removeAd = (index: number) => {
    if (ads.length > 1) setAds((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Polling ────────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollRun = useCallback(
    async (runUuid: string, adUuids: string[]) => {
      try {
        // Poll run status
        const runRes = await fetch(`/api/ad-scores/run/${runUuid}`);
        if (runRes.ok) {
          const runData: AdRun = await runRes.json();
          setActiveRun(runData);

          // Fetch completed ad results
          for (const ad of runData.ads) {
            if (
              (ad.status === 'completed' || ad.status === 'failed') &&
              !adUuids.includes('fetched-' + ad.uuid)
            ) {
              adUuids.push('fetched-' + ad.uuid);
              try {
                const adRes = await fetch(`/api/ad-scores/ad/${ad.uuid}`);
                if (adRes.ok) {
                  const adData: AdResult = await adRes.json();
                  setActiveResults((prev) => ({ ...prev, [ad.uuid]: adData }));
                }
              } catch {
                // ignore individual ad fetch errors
              }
            }
          }

          // Stop polling when run is terminal
          if (
            runData.status === 'completed' ||
            runData.status === 'partially_completed' ||
            runData.status === 'failed'
          ) {
            stopPolling();
          }
        }
      } catch {
        // ignore poll errors, will retry
      }
    },
    [stopPolling]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setError(null);

    // Validate
    const validAds = ads.filter((a) => a.ad_url.trim() && a.ad_name.trim());
    if (validAds.length === 0) {
      setError('Please provide at least one ad with a URL and name.');
      return;
    }

    setSubmitting(true);
    stopPolling();
    setActiveRun(null);
    setActiveResults({});

    try {
      const res = await fetch('/api/ad-scores/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ads: validAds, mode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(data.error || `Error: ${res.status}`);
        return;
      }

      const run: AdRun = await res.json();
      setActiveRun(run);

      // Save to history
      const stored: StoredRun = {
        uuid: run.uuid,
        mode,
        ads: validAds,
        createdAt: new Date().toISOString(),
        status: run.status,
        results: {},
      };
      saveHistory([stored, ...history]);

      // Start polling
      const fetchedUuids: string[] = [];
      pollRef.current = setInterval(() => pollRun(run.uuid, fetchedUuids), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Update history when results change
  useEffect(() => {
    if (!activeRun) return;
    setHistory((prev) => {
      const idx = prev.findIndex((r) => r.uuid === activeRun.uuid);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        status: activeRun.status,
        results: { ...updated[idx].results, ...activeResults },
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
      } catch {
        // ignore
      }
      return updated;
    });
  }, [activeRun, activeResults]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 bg-zinc-950">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#FF6B00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Ad Scores</h2>
            <p className="text-xs text-zinc-500">
              Submit ads for AI-powered scoring and analysis
            </p>
          </div>
        </div>

        {/* ── Submit Form ─────────────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">Mode:</span>
            <div className="flex bg-zinc-800 border border-zinc-700 rounded-lg p-0.5">
              <button
                onClick={() => setMode('simulation')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  mode === 'simulation'
                    ? 'bg-[#FF6B00] text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Simulation
              </button>
              <button
                onClick={() => setMode('live')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  mode === 'live'
                    ? 'bg-[#FF6B00] text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Live
              </button>
            </div>
            <span className="text-[10px] text-zinc-600">
              {mode === 'simulation'
                ? '⚡ Fast, returns mock data'
                : '🔬 Real scoring, ~5 min'}
            </span>
          </div>

          {/* Ad entries */}
          <div className="space-y-3">
            {ads.map((ad, i) => (
              <div
                key={i}
                className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">
                    Ad {i + 1}
                  </span>
                  {ads.length > 1 && (
                    <button
                      onClick={() => removeAd(i)}
                      className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="url"
                    placeholder="Ad URL *"
                    value={ad.ad_url}
                    onChange={(e) => updateAd(i, 'ad_url', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/30"
                  />
                  <input
                    type="text"
                    placeholder="Ad Name *"
                    value={ad.ad_name}
                    onChange={(e) => updateAd(i, 'ad_name', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/30"
                  />
                  <input
                    type="text"
                    placeholder="Brand Name (optional)"
                    value={ad.brand_name}
                    onChange={(e) => updateAd(i, 'brand_name', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/30"
                  />
                  <select
                    value={ad.platform}
                    onChange={(e) =>
                      updateAd(i, 'platform', e.target.value)
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/30"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {ads.length < MAX_ADS && (
              <button
                onClick={addAd}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-200 transition-all"
              >
                + Add Another Ad
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="ml-auto px-5 py-2 rounded-lg text-sm font-semibold bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                `Score ${ads.filter((a) => a.ad_url.trim() && a.ad_name.trim()).length} Ad${ads.filter((a) => a.ad_url.trim() && a.ad_name.trim()).length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* ── Active Run Results ───────────────────────────────────────────── */}
        {activeRun && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusDot status={activeRun.status} />
                <span className="text-sm font-medium text-white">
                  Run: {activeRun.status}
                </span>
              </div>
              <span className="text-[10px] text-zinc-600 font-mono">
                {activeRun.uuid}
              </span>
            </div>

            <div className="space-y-3">
              {activeRun.ads.map((ad, i) => {
                const result = activeResults[ad.uuid];
                return (
                  <div
                    key={ad.uuid}
                    className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusDot status={ad.status} />
                        <span className="text-sm text-zinc-300">
                          {ad.ad_name || `Ad ${i + 1}`}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-600 capitalize">
                        {ad.status}
                      </span>
                    </div>

                    {result?.status === 'completed' && result.overall_rating && (
                      <div className="space-y-3">
                        <StarRating
                          rating={result.overall_rating.rating}
                          label={result.overall_rating.label}
                        />

                        {result.summary && (
                          <div className="space-y-2">
                            {result.summary.strengths.length > 0 && (
                              <div>
                                <span className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                                  Strengths
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {result.summary.strengths.map((s, j) => (
                                    <Badge key={j} text={s} variant="green" />
                                  ))}
                                </div>
                              </div>
                            )}

                            {result.summary.weaknesses.length > 0 && (
                              <div>
                                <span className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                                  Weaknesses
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {result.summary.weaknesses.map((w, j) => (
                                    <Badge key={j} text={w} variant="red" />
                                  ))}
                                </div>
                              </div>
                            )}

                            {result.summary.suggestions.length > 0 && (
                              <div>
                                <span className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                                  Suggestions
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {result.summary.suggestions.map((s, j) => (
                                    <Badge key={j} text={s} variant="blue" />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {result.metadata?.timestamp && (
                          <span className="text-[10px] text-zinc-600">
                            Scored: {new Date(result.metadata.timestamp).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}

                    {result?.status === 'failed' && (
                      <div className="text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
                        {result.error || 'Scoring failed'}
                        {result.retryable && (
                          <span className="ml-2 text-zinc-500">(retryable)</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── History ──────────────────────────────────────────────────────── */}
        {history.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400">Past Runs</h3>
            {history.map((run) => (
              <div
                key={run.uuid}
                className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedRun(expandedRun === run.uuid ? null : run.uuid)
                  }
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <StatusDot status={run.status} />
                    <div className="text-left">
                      <span className="text-sm text-zinc-300">
                        {run.ads.length} ad{run.ads.length !== 1 ? 's' : ''} •{' '}
                        <span className="capitalize">{run.mode}</span>
                      </span>
                      <div className="text-[10px] text-zinc-600">
                        {new Date(run.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-zinc-600 transition-transform ${
                      expandedRun === run.uuid ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {expandedRun === run.uuid && (
                  <div className="px-4 pb-4 space-y-3 border-t border-zinc-800">
                    <div className="pt-3 text-[10px] text-zinc-600 font-mono">
                      UUID: {run.uuid}
                    </div>
                    {run.ads.map((ad, i) => {
                      const result = run.results[
                        Object.keys(run.results)[i]
                      ];
                      return (
                        <div
                          key={i}
                          className="bg-zinc-800/30 rounded-lg p-3 space-y-2"
                        >
                          <div className="text-sm text-zinc-300">
                            {ad.ad_name}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {ad.ad_url} • {ad.platform}
                            {ad.brand_name ? ` • ${ad.brand_name}` : ''}
                          </div>
                          {result?.overall_rating && (
                            <StarRating
                              rating={result.overall_rating.rating}
                              label={result.overall_rating.label}
                            />
                          )}
                          {result?.summary && (
                            <div className="flex flex-wrap gap-1">
                              {result.summary.strengths.map((s, j) => (
                                <Badge key={`s${j}`} text={s} variant="green" />
                              ))}
                              {result.summary.weaknesses.map((w, j) => (
                                <Badge key={`w${j}`} text={w} variant="red" />
                              ))}
                              {result.summary.suggestions.map((s, j) => (
                                <Badge key={`sg${j}`} text={s} variant="blue" />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
