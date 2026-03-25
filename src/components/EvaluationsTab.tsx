'use client';

import { useEffect, useState } from 'react';
import { StoredEvaluation, MODEL_CONFIG, ModelId } from '@/lib/types';

const EVALS_KEY = 'arena-evaluations';

const MUTATION_SUGGESTIONS: Record<string, string> = {
  A1: 'add explicit instruction to cite ≥3 quantified stats with named sources',
  A2: 'add instruction to identify ≥3 distinct cultural/social dynamics beyond the obvious one',
  A3: 'add instruction to name ≥2 messaging territories with tagline-level copy',
  A4: 'add instruction to cite ≥5 named research organisations with specific findings',
  A5: 'add instruction to name ≥3 specific local venues, institutions, or individuals',
  A6: 'add instruction to identify ≥4 pitfalls each with stated consequences',
  A7: 'add strict category coherence check — reject off-category recommendations',
  B1: 'add instruction to describe ≥3 specific creative mechanisms with production detail',
  B2: 'add instruction to back each mechanism with named effectiveness data',
  B3: 'add instruction to specify platform/format (Reels vs Stories vs TikTok) per recommendation',
  B4: 'add instruction to link every creative recommendation to a stated audience insight',
  B5: 'add instruction to include ≥2 production-level notes (visual language, casting, styling)',
  B6: 'add instruction to name ≥3 creative anti-patterns with explanations',
  B7: 'add strict category coherence check — reject off-category recommendations',
  C1: 'add instruction to state clear yes/no/conditional answer in first two paragraphs',
  C2: 'add instruction to cite ≥3 specific evidence points from named sources',
  C3: 'add instruction to identify ≥2 moderating conditions (segment, tone, market)',
  C4: 'add instruction to compare with at least one alternative approach and effectiveness data',
  C5: 'add instruction to cite ≥2 real-world precedents with named campaigns and outcomes',
  C6: 'add instruction to provide ≥2 specific execution recommendations',
  C7: 'add instruction to identify ≥2 risks with specific mitigation strategies',
};

function scoreColor(pct: number): string {
  if (pct > 70) return 'text-emerald-400';
  if (pct >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function scoreBg(pct: number): string {
  if (pct > 70) return 'bg-emerald-900/30';
  if (pct >= 40) return 'bg-yellow-900/30';
  return 'bg-red-900/30';
}

function ScorePct({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  return (
    <span className={`font-mono font-semibold ${scoreColor(pct)}`}>
      {score}/{total} ({pct}%)
    </span>
  );
}

function ColorBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
      <div
        className={`h-full rounded-full transition-all ${pct > 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface ExpandedRow {
  index: number;
}

export default function EvaluationsTab() {
  const [evals, setEvals] = useState<StoredEvaluation[]>([]);
  const [expanded, setExpanded] = useState<ExpandedRow | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(EVALS_KEY);
      if (stored) setEvals(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const modelIds: ModelId[] = ['zappi', 'claude', 'gemini', 'openai'];

  // Aggregate stats
  const totalEvals = evals.length;

  // Per-platform aggregate score
  const platformAgg = modelIds.reduce<Record<string, { passed: number; total: number }>>((acc, id) => {
    acc[id] = { passed: 0, total: 0 };
    return acc;
  }, {});

  for (const ev of evals) {
    for (const id of modelIds) {
      const p = ev.platforms[id];
      if (p) {
        platformAgg[id].passed += p.score;
        platformAgg[id].total += p.total;
      }
    }
  }

  // Consistency score: 1 - stdev/mean of per-query scores per platform
  const platformConsistency = modelIds.reduce<Record<string, number>>((acc, id) => {
    const scores = evals
      .map((ev) => {
        const p = ev.platforms[id];
        return p && p.total > 0 ? p.score / p.total : null;
      })
      .filter((s): s is number => s !== null);

    if (scores.length < 2) {
      acc[id] = 1;
      return acc;
    }
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
    const stdev = Math.sqrt(variance);
    acc[id] = mean > 0 ? Math.max(0, 1 - stdev / mean) : 0;
    return acc;
  }, {});

  // Category strength map: per platform per query type
  const catStrength = modelIds.reduce<Record<string, Record<string, { passed: number; total: number }>>>((acc, id) => {
    acc[id] = { A: { passed: 0, total: 0 }, B: { passed: 0, total: 0 }, C: { passed: 0, total: 0 } };
    return acc;
  }, {});

  for (const ev of evals) {
    const type = ev.queryType?.charAt(0).toUpperCase();
    if (!type || !['A', 'B', 'C'].includes(type)) continue;
    for (const id of modelIds) {
      const p = ev.platforms[id];
      if (p) {
        catStrength[id][type].passed += p.score;
        catStrength[id][type].total += p.total;
      }
    }
  }

  // Mutation suggestions: criteria that fail >50% of the time per platform
  const criteriaFailRates = modelIds.reduce<Record<string, Record<string, { fail: number; total: number }>>>((acc, id) => {
    acc[id] = {};
    return acc;
  }, {});

  // We don't store criteria breakdown in StoredEvaluation (only scores), so we skip this
  // and just show based on overall failure patterns

  const rankEmoji = ['🥇', '🥈', '🥉', ''];

  if (totalEvals === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        No evaluations yet. Run a query in the Arena tab to get started.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 bg-zinc-950">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Aggregate stats */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Aggregate Performance <span className="text-zinc-500 font-normal">({totalEvals} evaluation{totalEvals !== 1 ? 's' : ''})</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {modelIds.map((id) => {
              const agg = platformAgg[id];
              const pct = agg.total > 0 ? Math.round((agg.passed / agg.total) * 100) : 0;
              const consistency = Math.round(platformConsistency[id] * 100);
              const config = MODEL_CONFIG[id];
              return (
                <div key={id} className={`rounded-xl border ${config.accentBorder} ${config.accentBg} p-4`}>
                  <div className={`text-xs font-semibold ${config.accentText} mb-1`}>{config.label}</div>
                  <div className={`text-2xl font-bold font-mono ${scoreColor(pct)}`}>{pct}%</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {agg.passed}/{agg.total} criteria passed
                  </div>
                  <ColorBar pct={pct} />
                  <div className="text-[10px] text-zinc-500 mt-2">
                    Consistency: <span className={scoreColor(consistency)}>{consistency}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category strength map */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Category Strength Map</h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-left px-4 py-2.5 text-zinc-400 font-medium">Platform</th>
                  <th className="text-center px-4 py-2.5 text-zinc-400 font-medium">Type A (audience)</th>
                  <th className="text-center px-4 py-2.5 text-zinc-400 font-medium">Type B (creative)</th>
                  <th className="text-center px-4 py-2.5 text-zinc-400 font-medium">Type C (validation)</th>
                  <th className="text-center px-4 py-2.5 text-zinc-400 font-medium">Aggregate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {modelIds.map((id) => {
                  const config = MODEL_CONFIG[id];
                  const agg = platformAgg[id];
                  const aggPct = agg.total > 0 ? Math.round((agg.passed / agg.total) * 100) : 0;
                  return (
                    <tr key={id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${config.accentText}`}>{config.label}</span>
                      </td>
                      {(['A', 'B', 'C'] as const).map((type) => {
                        const cat = catStrength[id][type];
                        const pct = cat.total > 0 ? Math.round((cat.passed / cat.total) * 100) : null;
                        return (
                          <td key={type} className="px-4 py-3 text-center">
                            {pct !== null ? (
                              <div>
                                <span className={`font-mono font-semibold ${scoreColor(pct)}`}>{pct}%</span>
                                <div className="w-16 mx-auto mt-1">
                                  <ColorBar pct={pct} />
                                </div>
                              </div>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono font-semibold ${scoreColor(aggPct)}`}>{aggPct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mutation suggestions (only after 3+ evals) */}
        {totalEvals >= 3 && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Mutation Suggestions</h2>
            <div className="space-y-2">
              {modelIds.map((id) => {
                const agg = platformAgg[id];
                const pct = agg.total > 0 ? Math.round((agg.passed / agg.total) * 100) : 0;
                if (pct > 70) return null;
                const config = MODEL_CONFIG[id];
                return (
                  <div key={id} className={`rounded-lg border ${config.accentBorder} px-4 py-3 text-xs`}>
                    <span className={`font-semibold ${config.accentText}`}>{config.label}</span>
                    <span className="text-zinc-400 ml-2">
                      scores {pct}% aggregate — consider strengthening instructions for data specificity, citation density, and local execution detail.
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Evaluation history */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Evaluation History</h2>
          <div className="space-y-2">
            {evals.map((ev, i) => {
              const isExpanded = expanded?.index === i;
              return (
                <div key={i} className="rounded-xl border border-zinc-800 overflow-hidden">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : { index: i })}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/40 transition-colors text-left"
                  >
                    <span className="text-zinc-500 text-[10px] font-mono shrink-0">{ev.date}</span>
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 shrink-0">
                      {ev.queryType}
                    </span>
                    <span className="text-sm text-zinc-300 truncate flex-1">{ev.query}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {ev.ranking.slice(0, 4).map((platform, rank) => {
                        const pid = platform as ModelId;
                        const p = ev.platforms[pid];
                        const pct = p && p.total > 0 ? Math.round((p.score / p.total) * 100) : 0;
                        const config = MODEL_CONFIG[pid];
                        return (
                          <span key={platform} className={`text-[11px] font-mono ${config?.accentText ?? 'text-zinc-400'}`}>
                            {rankEmoji[rank]} {pct}%
                          </span>
                        );
                      })}
                    </div>
                    <svg className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-zinc-800 px-4 py-4">
                      <div className="text-xs text-zinc-500 mb-3">
                        <span className="text-zinc-400 font-medium">Query:</span> {ev.query}
                        {ev.convergenceFlag && (
                          <span className="ml-3 text-amber-400">⚠ Convergent</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {ev.ranking.map((platform, rank) => {
                          const pid = platform as ModelId;
                          const p = ev.platforms[pid];
                          if (!p) return null;
                          const pct = p.total > 0 ? Math.round((p.score / p.total) * 100) : 0;
                          const config = MODEL_CONFIG[pid];
                          return (
                            <div key={platform} className={`rounded-lg border ${config?.accentBorder ?? 'border-zinc-700'} px-3 py-2`}>
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-xs">{rankEmoji[rank]}</span>
                                <span className={`text-xs font-semibold ${config?.accentText ?? 'text-zinc-400'}`}>{config?.label ?? platform}</span>
                              </div>
                              <ScorePct score={p.score} total={p.total} />
                              <ColorBar pct={pct} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
