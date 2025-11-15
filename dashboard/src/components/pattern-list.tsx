"use client";

import type { PatternInsight } from "@/types/market";
import clsx from "clsx";

interface PatternListProps {
  patterns: PatternInsight[];
}

export function PatternList({ patterns }: PatternListProps) {
  if (!patterns.length) {
    return (
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 text-sm text-slate-400 shadow-lg backdrop-blur">
        No high-confidence candle patterns detected in the latest data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {patterns.map((pattern) => (
        <div
          key={pattern.name}
          className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 shadow-lg backdrop-blur"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold text-slate-100">
                {pattern.name}
              </h4>
              <p className="text-sm text-slate-400">{pattern.description}</p>
            </div>
            <span
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                pattern.type === "bullish" && "bg-emerald-500/20 text-emerald-300",
                pattern.type === "bearish" && "bg-rose-500/20 text-rose-300",
                pattern.type === "neutral" && "bg-slate-600/40 text-slate-200"
              )}
            >
              {pattern.type}
            </span>
          </div>
          <div className="mt-3 text-xs uppercase tracking-wide text-slate-500">
            Confidence: {(pattern.confidence * 100).toFixed(0)}%
          </div>
        </div>
      ))}
    </div>
  );
}
