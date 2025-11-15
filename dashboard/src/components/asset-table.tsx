"use client";

import type { OverviewAsset } from "@/types/market";
import clsx from "clsx";

interface AssetTableProps {
  assets: OverviewAsset[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  loading?: boolean;
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function AssetTable({
  assets,
  selectedSymbol,
  onSelect,
  loading = false,
}: AssetTableProps) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Watchlist
        </h3>
        <span className="text-xs text-slate-500">Tap to explore</span>
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Pair</th>
              <th className="px-5 py-3 text-right font-medium">Last</th>
              <th className="px-5 py-3 text-right font-medium">24h %</th>
              <th className="px-5 py-3 text-right font-medium">24h Volume</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-4 text-center text-sm text-slate-500"
                >
                  Loading assets…
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-4 text-center text-sm text-slate-500"
                >
                  No assets available.
                </td>
              </tr>
            ) : (
              assets.map((asset) => {
                const isSelected = asset.symbol === selectedSymbol;
                const changeClass =
                  asset.priceChangePercent > 0
                    ? "text-emerald-400"
                    : asset.priceChangePercent < 0
                    ? "text-rose-400"
                    : "text-slate-400";

                return (
                  <tr
                    key={asset.symbol}
                    onClick={() => onSelect(asset.symbol)}
                    className={clsx(
                      "cursor-pointer transition hover:bg-slate-800/40",
                      isSelected && "bg-slate-800/60"
                    )}
                  >
                    <td className="px-5 py-3 font-semibold">{asset.symbol}</td>
                    <td className="px-5 py-3 text-right font-mono">
                      {priceFormatter.format(asset.lastPrice)}
                    </td>
                    <td
                      className={clsx(
                        "px-5 py-3 text-right font-semibold",
                        changeClass
                      )}
                    >
                      {percentFormatter.format(asset.priceChangePercent / 100)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-400">
                      {compactFormatter.format(asset.quoteVolume)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
