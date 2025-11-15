import { NextRequest, NextResponse } from "next/server";
import {
  Candle,
  IndicatorSummary,
  MarketResponse,
  PatternInsight,
  TradeSignal,
} from "@/types/market";

const BASE_URL = "https://api.binance.com";

const SUPPORTED_INTERVALS = new Set([
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "12h",
  "1d",
]);

const DEFAULT_SYMBOL = "BTCUSDT";
const DEFAULT_INTERVAL = "15m";
const DEFAULT_LIMIT = 200;

function parseNumber(value: string | number): number {
  if (typeof value === "number") return value;
  const result = Number.parseFloat(value);
  if (Number.isNaN(result)) {
    throw new Error(`Unable to parse number from value "${value}"`);
  }
  return result;
}

function parseCandles(raw: string[][]): Candle[] {
  return raw.map((candle) => ({
    openTime: Number(candle[0]),
    open: parseNumber(candle[1]),
    high: parseNumber(candle[2]),
    low: parseNumber(candle[3]),
    close: parseNumber(candle[4]),
    volume: parseNumber(candle[5]),
    closeTime: Number(candle[6]),
  }));
}

function movingAverage(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = Array(values.length).fill(null);
  let sum = 0;

  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) {
      sum -= values[i - period];
    }
    if (i >= period - 1) {
      result[i] = sum / period;
    }
  }

  return result;
}

function calculateRSI(values: number[], period = 14): (number | null)[] {
  if (values.length < period + 1) {
    return Array(values.length).fill(null);
  }

  const gains: number[] = [];
  const losses: number[] = [];
  const result: (number | null)[] = Array(values.length).fill(null);

  for (let i = 1; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    gains.push(Math.max(diff, 0));
    losses.push(Math.abs(Math.min(diff, 0)));
  }

  let avgGain =
    gains.slice(0, period).reduce((acc, curr) => acc + curr, 0) / period;
  let avgLoss =
    losses.slice(0, period).reduce((acc, curr) => acc + curr, 0) / period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i += 1) {
    const gain = gains[i - 1];
    const loss = losses[i - 1];
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

function detectPatterns(candles: Candle[]): PatternInsight[] {
  if (candles.length < 3) {
    return [];
  }

  const patterns: PatternInsight[] = [];
  const last = candles.at(-1)!;
  const prev = candles.at(-2)!;
  const third = candles.at(-3)!;

  const lastBody = Math.abs(last.close - last.open);
  const prevBody = Math.abs(prev.close - prev.open);
  const thirdBody = Math.abs(third.close - third.open);
  const lastRange = last.high - last.low;
  const thirdRange = third.high - third.low;

  const isBullish = (c: Candle) => c.close > c.open;
  const isBearish = (c: Candle) => c.close < c.open;

  // Bullish engulfing
  if (
    isBearish(prev) &&
    isBullish(last) &&
    last.open <= prev.close &&
    last.close >= prev.open &&
    lastBody > prevBody * 1.05
  ) {
    patterns.push({
      name: "Bullish Engulfing",
      type: "bullish",
      confidence: 0.7,
      description:
        "Recent candle engulfed prior bearish candle, suggesting potential trend reversal upward.",
    });
  }

  // Bearish engulfing
  if (
    isBullish(prev) &&
    isBearish(last) &&
    last.open >= prev.close &&
    last.close <= prev.open &&
    lastBody > prevBody * 1.05
  ) {
    patterns.push({
      name: "Bearish Engulfing",
      type: "bearish",
      confidence: 0.7,
      description:
        "Recent candle engulfed prior bullish candle, signaling potential downside reversal.",
    });
  }

  // Hammer
  if (
    isBullish(last) &&
    lastBody > 0 &&
    lastRange > 0 &&
    last.low < last.open &&
    last.low < last.close &&
    last.open - last.low > lastBody * 2 &&
    last.high - last.close < lastBody
  ) {
    patterns.push({
      name: "Hammer",
      type: "bullish",
      confidence: 0.6,
      description:
        "Long lower wick with small real body after a decline may hint at buyers stepping in.",
    });
  }

  // Shooting Star
  if (
    isBearish(last) &&
    lastBody > 0 &&
    lastRange > 0 &&
    last.high > last.open &&
    last.high > last.close &&
    last.high - last.open > lastBody * 2 &&
    last.close - last.low < lastBody
  ) {
    patterns.push({
      name: "Shooting Star",
      type: "bearish",
      confidence: 0.6,
      description:
        "Long upper wick with small body after a rally can signal exhaustion of upward momentum.",
    });
  }

  // Morning Star (three candle pattern)
  if (
    isBearish(third) &&
    thirdBody > thirdRange * 0.3 &&
    Math.abs(prev.close - prev.open) < thirdBody * 0.5 &&
    isBullish(last) &&
    last.close > (third.open + third.close) / 2
  ) {
    patterns.push({
      name: "Morning Star",
      type: "bullish",
      confidence: 0.65,
      description:
        "Three-candle reversal: strong sell-off, indecision, and bullish confirmation.",
    });
  }

  // Evening Star
  if (
    isBullish(third) &&
    thirdBody > thirdRange * 0.3 &&
    Math.abs(prev.close - prev.open) < thirdBody * 0.5 &&
    isBearish(last) &&
    last.close < (third.open + third.close) / 2
  ) {
    patterns.push({
      name: "Evening Star",
      type: "bearish",
      confidence: 0.65,
      description:
        "Three-candle reversal: strong rally, indecision, and bearish confirmation.",
    });
  }

  return patterns;
}

function buildIndicators(candles: Candle[]): IndicatorSummary {
  const closes = candles.map((candle) => candle.close);

  const ma20Series = movingAverage(closes, 20);
  const ma50Series = movingAverage(closes, 50);

  const ma20 = ma20Series.at(-1) ?? null;
  const ma50 = ma50Series.at(-1) ?? null;

  const rsiSeries = calculateRSI(closes, 14);
  const rsi = rsiSeries.at(-1) ?? null;

  let trend: IndicatorSummary["trend"] = "sideways";
  if (ma20 && ma50) {
    if (ma20 > ma50 * 1.003) {
      trend = "bullish";
    } else if (ma20 < ma50 * 0.997) {
      trend = "bearish";
    }
  }

  const recentCandles = candles.slice(-30);
  const support =
    recentCandles.length > 0
      ? Math.min(...recentCandles.map((candle) => candle.low))
      : null;
  const resistance =
    recentCandles.length > 0
      ? Math.max(...recentCandles.map((candle) => candle.high))
      : null;

  return { ma20, ma50, rsi, trend, support, resistance };
}

function buildSignal(
  patterns: PatternInsight[],
  indicators: IndicatorSummary,
  ticker: MarketResponse["ticker"]
): TradeSignal {
  const bullishCount = patterns.filter((pattern) => pattern.type === "bullish");
  const bearishCount = patterns.filter((pattern) => pattern.type === "bearish");

  let action: TradeSignal["action"] = "Hold";
  let confidence = 0.4;
  const parts: string[] = [];

  const { rsi, trend, support, resistance } = indicators;
  const changePercent = ticker.priceChangePercent;

  if (bullishCount.length > 0 && trend !== "bearish") {
    action = "Buy";
    confidence = 0.55 + Math.min(bullishCount.length * 0.1, 0.25);
    parts.push(
      `${bullishCount.length} bullish pattern${
        bullishCount.length > 1 ? "s" : ""
      } detected`
    );
  } else if (bearishCount.length > 0 && trend !== "bullish") {
    action = "Sell";
    confidence = 0.55 + Math.min(bearishCount.length * 0.1, 0.25);
    parts.push(
      `${bearishCount.length} bearish pattern${
        bearishCount.length > 1 ? "s" : ""
      } detected`
    );
  }

  if (rsi !== null) {
    if (rsi > 70 && action !== "Sell") {
      action = "Sell";
      confidence = Math.max(confidence, 0.65);
      parts.push("RSI indicates overbought conditions");
    } else if (rsi < 35 && action !== "Buy") {
      action = "Buy";
      confidence = Math.max(confidence, 0.65);
      parts.push("RSI indicates oversold conditions");
    } else if (parts.length === 0) {
      parts.push(`RSI neutral at ${rsi.toFixed(1)}`);
    }
  }

  if (trend === "bullish" && action === "Buy") {
    confidence += 0.05;
    parts.push("Short-term trend supports upside momentum");
  } else if (trend === "bearish" && action === "Sell") {
    confidence += 0.05;
    parts.push("Short-term trend supports downside momentum");
  } else if (parts.length === 0) {
    parts.push("Trend signals lack clear direction");
  }

  if (support && ticker.lastPrice <= support * 1.01 && action === "Buy") {
    confidence += 0.05;
    parts.push("Price testing recent support level");
  } else if (
    resistance &&
    ticker.lastPrice >= resistance * 0.99 &&
    action === "Sell"
  ) {
    confidence += 0.05;
    parts.push("Price near resistance zone");
  }

  if (Math.abs(changePercent) < 0.2 && parts.length === 0) {
    parts.push("Muted price action; patience advised");
  }

  confidence = Math.min(confidence, 0.95);

  return {
    action,
    confidence: Number(confidence.toFixed(2)),
    reason: parts.join("; "),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? DEFAULT_SYMBOL).toUpperCase();
  const interval = searchParams.get("interval") ?? DEFAULT_INTERVAL;
  const limitParam = searchParams.get("limit");

  if (!SUPPORTED_INTERVALS.has(interval)) {
    return NextResponse.json(
      { error: "Unsupported interval" },
      { status: 400 }
    );
  }

  const limit =
    limitParam !== null && !Number.isNaN(Number(limitParam))
      ? Math.min(Number(limitParam), 500)
      : DEFAULT_LIMIT;

  try {
    const [rawKlines, ticker] = await Promise.all([
      fetch(
        `${BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
        { cache: "no-store" }
      ).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch candlesticks: ${res.statusText}`);
        }
        return res.json();
      }),
      fetch(`${BASE_URL}/api/v3/ticker/24hr?symbol=${symbol}`, {
        cache: "no-store",
      }).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch ticker: ${res.statusText}`);
        }
        return res.json();
      }),
    ]);

    const candles = parseCandles(rawKlines as string[][]);

    const patterns = detectPatterns(candles);
    const indicators = buildIndicators(candles);

    const tickerSummary = {
      lastPrice: parseNumber(ticker.lastPrice),
      priceChangePercent: parseNumber(ticker.priceChangePercent),
      highPrice: parseNumber(ticker.highPrice),
      lowPrice: parseNumber(ticker.lowPrice),
      volume: parseNumber(ticker.volume),
      quoteVolume: parseNumber(ticker.quoteVolume),
    };

    const signal = buildSignal(patterns, indicators, tickerSummary);

    const response: MarketResponse = {
      symbol,
      interval,
      ticker: tickerSummary,
      candles,
      indicators,
      patterns,
      signal,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load market data" },
      { status: 500 }
    );
  }
}
