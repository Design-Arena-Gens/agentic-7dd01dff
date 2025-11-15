"use client";

import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { AssetTable } from "@/components/asset-table";
import { CandlestickChart } from "@/components/candlestick-chart";
import { MetricCard } from "@/components/metric-card";
import { PatternList } from "@/components/pattern-list";
import { SignalCard } from "@/components/signal-card";
import type { MarketResponse, OverviewAsset } from "@/types/market";

const TRACKED_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
];

const TIMEFRAMES = [
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type LoadingState = "idle" | "loading" | "error";

export function Dashboard() {
  const [overviewAssets, setOverviewAssets] = useState<OverviewAsset[]>([]);
  const [marketData, setMarketData] = useState<MarketResponse | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState(TRACKED_SYMBOLS[0]);
  const [interval, setInterval] = useState(TIMEFRAMES[1].value);
  const [overviewState, setOverviewState] = useState<LoadingState>("idle");
  const [marketState, setMarketState] = useState<LoadingState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [debouncedSymbol] = useDebounce(selectedSymbol, 300);
  const [debouncedInterval] = useDebounce(interval, 300);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setOverviewState("loading");
      try {
        const response = await fetch("/api/overview");
        if (!response.ok) {
          throw new Error("Overview request failed");
        }
        const payload = await response.json();
        if (!cancelled) {
          setOverviewAssets(payload.assets);
          setOverviewState("idle");
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setOverviewState("error");
        }
      }
    }

    loadOverview();

    const timer = window.setInterval(() => {
      void loadOverview();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let aborted = false;

    async function loadMarket() {
      setMarketState("loading");
      setErrorMessage(null);
      try {
        const url = `/api/market?symbol=${debouncedSymbol}&interval=${debouncedInterval}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Market request failed");
        }
        const payload = (await response.json()) as MarketResponse;
        if (!aborted) {
          setMarketData(payload);
          setMarketState("idle");
        }
      } catch (error) {
        console.error(error);
        if (!aborted) {
          setMarketState("error");
          setErrorMessage(
            "Unable to load market data. Please retry or choose a different interval."
          );
        }
      }
    }

    loadMarket();
    const timer = window.setInterval(() => {
      void loadMarket();
    }, 20_000);

    return () => {
      aborted = true;
      window.clearInterval(timer);
    };
  }, [debouncedSymbol, debouncedInterval]);

  useEffect(() => {
    if (TRACKED_SYMBOLS.includes(selectedSymbol)) return;
    setSelectedSymbol(TRACKED_SYMBOLS[0]);
  }, [selectedSymbol]);

  const summaryCards = useMemo(() => {
    if (!marketData) return [];

    const { ticker, indicators } = marketData;

    return [
      {
        label: "Last Price",
        value: currencyFormatter.format(ticker.lastPrice),
        subValue: `High ${currencyFormatter.format(
          ticker.highPrice
        )} / Low ${currencyFormatter.format(ticker.lowPrice)}`,
        intent: "neutral" as const,
      },
      {
        label: "24h Change",
        value: percentFormatter.format(ticker.priceChangePercent / 100),
        subValue:
          ticker.priceChangePercent > 0 ? "Market showing strength" : "Watch downside momentum",
        intent:
          ticker.priceChangePercent > 0
            ? ("positive" as const)
            : ticker.priceChangePercent < 0
            ? ("negative" as const)
            : ("neutral" as const),
      },
      {
        label: "24h Volume",
        value: compactCurrencyFormatter.format(marketData.ticker.quoteVolume),
        subValue: `${marketData.ticker.volume.toLocaleString("en-US")} ${selectedSymbol.replace(
          "USDT",
          ""
        )}`,
        intent: "neutral" as const,
      },
      {
        label: "RSI (14)",
        value:
          indicators.rsi !== null ? indicators.rsi.toFixed(2) : "—",
        subValue:
          indicators.rsi !== null
            ? indicators.rsi > 70
              ? "Overbought zone"
              : indicators.rsi < 35
              ? "Oversold zone"
              : "Neutral momentum"
            : "Insufficient data",
        intent:
          indicators.rsi !== null && indicators.rsi < 40
            ? ("positive" as const)
            : indicators.rsi !== null && indicators.rsi > 60
            ? ("negative" as const)
            : ("neutral" as const),
      },
    ];
  }, [marketData, selectedSymbol]);

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-7 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold md:text-3xl">
              AlphaPulse Crypto Desk
            </h1>
            <p className="text-sm text-slate-400 md:text-base">
              Live tracking, pattern detection, and actionable trade sentiment.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TIMEFRAMES.map((frame) => (
              <button
                key={frame.value}
                onClick={() => setInterval(frame.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  interval === frame.value
                    ? "border-sky-500 bg-sky-500/20 text-sky-200"
                    : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-600"
                }`}
              >
                {frame.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 grid max-w-7xl gap-8 px-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <AssetTable
            assets={overviewAssets}
            selectedSymbol={selectedSymbol}
            onSelect={setSelectedSymbol}
            loading={overviewState === "loading"}
          />
          {overviewState === "error" ? (
            <div className="rounded-2xl border border-rose-400/60 bg-rose-500/10 p-4 text-xs text-rose-200">
              Watchlist data unavailable. Retrying shortly…
            </div>
          ) : null}
          {marketData ? (
            <SignalCard signal={marketData.signal} />
          ) : (
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-6 text-sm text-slate-400">
              Generating trading insights…
            </div>
          )}
          <PatternList patterns={marketData?.patterns ?? []} />
        </div>

        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
            {marketData ? (
              <>
                <MetricCard
                  label="MA20 / MA50"
                  value={
                    marketData.indicators.ma20 && marketData.indicators.ma50
                      ? `${currencyFormatter.format(
                          marketData.indicators.ma20
                        )} / ${currencyFormatter.format(marketData.indicators.ma50)}`
                      : "—"
                  }
                  subValue={`Trend: ${marketData.indicators.trend.toUpperCase()}`}
                />
                <MetricCard
                  label="Support"
                  value={
                    marketData.indicators.support
                      ? currencyFormatter.format(marketData.indicators.support)
                      : "—"
                  }
                  subValue="Recent swing low"
                />
                <MetricCard
                  label="Resistance"
                  value={
                    marketData.indicators.resistance
                      ? currencyFormatter.format(marketData.indicators.resistance)
                      : "—"
                  }
                  subValue="Recent swing high"
                />
                <MetricCard
                  label="Signal Confidence"
                  value={
                    marketData
                      ? percentFormatter.format(marketData.signal.confidence)
                      : "—"
                  }
                  subValue={`Recommendation: ${marketData?.signal.action ?? "—"}`}
                  intent={
                    marketData?.signal.action === "Buy"
                      ? "positive"
                      : marketData?.signal.action === "Sell"
                      ? "negative"
                      : "neutral"
                  }
                />
              </>
            ) : null}
          </div>

          <section>
            {marketState === "error" ? (
              <div className="rounded-2xl border border-rose-400/60 bg-rose-500/10 p-6 text-sm text-rose-200">
                {errorMessage}
              </div>
            ) : marketData ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {marketData.symbol} — {debouncedInterval.toUpperCase()} Candles
                    </h2>
                    <p className="text-sm text-slate-400">
                      Automatically refreshed every 20 seconds
                    </p>
                  </div>
                  <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                    Latest close:{" "}
                    <span className="font-semibold text-slate-100">
                      {currencyFormatter.format(marketData.ticker.lastPrice)}
                    </span>
                  </div>
                </div>
                <CandlestickChart candles={marketData.candles} />
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-12 text-center text-sm text-slate-400">
                Loading market data…
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
