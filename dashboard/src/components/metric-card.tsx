"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  subValue?: ReactNode;
  intent?: "neutral" | "positive" | "negative";
}

export function MetricCard({
  label,
  value,
  subValue,
  intent = "neutral",
}: MetricCardProps) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-2 rounded-2xl border p-4 shadow-sm transition hover:shadow-lg md:p-5",
        "border-slate-700/70 bg-slate-900/70 backdrop-blur",
        intent === "positive" && "border-emerald-400/40",
        intent === "negative" && "border-rose-400/40"
      )}
    >
      <span className="text-sm font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="text-2xl font-semibold text-slate-100 md:text-3xl">
        {value}
      </div>
      {subValue ? (
        <span className="text-sm text-slate-400 md:text-base">{subValue}</span>
      ) : null}
    </div>
  );
}
