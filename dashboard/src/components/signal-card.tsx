"use client";

import type { TradeSignal } from "@/types/market";
import clsx from "clsx";

interface SignalCardProps {
  signal: TradeSignal;
}

const badgeColors = {
  Buy: "bg-emerald-500/20 text-emerald-300 border-emerald-400/60",
  Sell: "bg-rose-500/20 text-rose-300 border-rose-400/60",
  Hold: "bg-slate-600/30 text-slate-200 border-slate-500/60",
} as const;

export function SignalCard({ signal }: SignalCardProps) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-100">Trading Signal</h3>
        <span
          className={clsx(
            "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider",
            badgeColors[signal.action]
          )}
        >
          {signal.action}
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-400">{signal.reason}</p>
      <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
        <span>Signal confidence</span>
        <span className="font-semibold text-slate-100">
          {(signal.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Signals are heuristic-based and should be validated with your risk
        framework.
      </p>
    </div>
  );
}
