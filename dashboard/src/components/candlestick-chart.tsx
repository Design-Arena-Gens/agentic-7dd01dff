"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  LineStyle,
  LineSeries,
  Time,
  createChart,
} from "lightweight-charts";
import type { Candle } from "@/types/market";

interface CandlestickChartProps {
  candles: Candle[];
  height?: number;
}

const DEFAULT_HEIGHT = 420;

function toChartTime(timestamp: number): Time {
  return Math.floor(timestamp / 1000) as Time;
}

function computeSeries(values: (number | null)[], candles: Candle[]) {
  return values
    .map((value, index) => {
      if (value === null) return null;
      return {
        time: toChartTime(candles[index].closeTime),
        value,
      };
    })
    .filter(Boolean) as { time: Time; value: number }[];
}

function movingAverage(candles: Candle[], period: number): (number | null)[] {
  const closes = candles.map((candle) => candle.close);
  const result: (number | null)[] = Array(closes.length).fill(null);
  let sum = 0;

  for (let i = 0; i < closes.length; i += 1) {
    sum += closes[i];
    if (i >= period) {
      sum -= closes[i - period];
    }
    if (i >= period - 1) {
      result[i] = sum / period;
    }
  }

  return result;
}

export function CandlestickChart({
  candles,
  height = DEFAULT_HEIGHT,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick", Time> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram", Time> | null>(null);
  const ma20SeriesRef = useRef<ISeriesApi<"Line", Time> | null>(null);
  const ma50SeriesRef = useRef<ISeriesApi<"Line", Time> | null>(null);

  const ma20Series = useMemo(
    () => computeSeries(movingAverage(candles, 20), candles),
    [candles]
  );
  const ma50Series = useMemo(
    () => computeSeries(movingAverage(candles, 50), candles),
    [candles]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#cbd5f5",
        fontFamily: "var(--font-geist-sans, Inter, sans-serif)",
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.2)", style: LineStyle.Dotted },
        horzLines: { color: "rgba(148, 163, 184, 0.2)", style: LineStyle.Dotted },
      },
      localization: {
        priceFormatter: (price: number) => price.toFixed(2),
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#f87171",
      wickUpColor: "#16a34a",
      wickDownColor: "#ef4444",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: "rgba(99, 102, 241, 0.6)",
      base: 0,
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.75, bottom: 0 },
    });

    const ma20 = chart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 2,
      priceLineVisible: false,
    });
    const ma50 = chart.addSeries(LineSeries, {
      color: "#facc15",
      lineWidth: 2,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    ma20SeriesRef.current = ma20;
    ma50SeriesRef.current = ma50;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container) {
          chart.applyOptions({
            width: entry.contentRect.width,
            height,
          });
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      ma20SeriesRef.current = null;
      ma50SeriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (!candles.length) return;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const ma20 = ma20SeriesRef.current;
    const ma50 = ma50SeriesRef.current;
    const chart = chartRef.current;
    if (!candleSeries || !volumeSeries || !ma20 || !ma50 || !chart) return;

    const formattedCandles = candles.map((candle) => ({
      time: toChartTime(candle.openTime),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
    candleSeries.setData(formattedCandles);

    const volumes = candles.map((candle) => ({
      time: toChartTime(candle.openTime),
      value: candle.volume,
      color: candle.close >= candle.open ? "#22c55e" : "#ef4444",
    }));
    volumeSeries.setData(volumes);
    ma20.setData(ma20Series);
    ma50.setData(ma50Series);

    chart.timeScale().fitContent();
  }, [candles, ma20Series, ma50Series]);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 p-2 shadow-xl backdrop-blur">
      <div
        ref={containerRef}
        className="h-full w-full rounded-xl"
        style={{ minHeight: `${height}px` }}
      />
    </div>
  );
}
