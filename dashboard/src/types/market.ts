export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface IndicatorSummary {
  ma20: number | null;
  ma50: number | null;
  rsi: number | null;
  trend: "bullish" | "bearish" | "sideways";
  support: number | null;
  resistance: number | null;
}

export interface PatternInsight {
  name: string;
  type: "bullish" | "bearish" | "neutral";
  confidence: number;
  description: string;
}

export interface TradeSignal {
  action: "Buy" | "Sell" | "Hold";
  confidence: number;
  reason: string;
}

export interface MarketResponse {
  symbol: string;
  interval: string;
  ticker: {
    lastPrice: number;
    priceChangePercent: number;
    highPrice: number;
    lowPrice: number;
    volume: number;
    quoteVolume: number;
  };
  candles: Candle[];
  indicators: IndicatorSummary;
  patterns: PatternInsight[];
  signal: TradeSignal;
}

export interface OverviewAsset {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
}
