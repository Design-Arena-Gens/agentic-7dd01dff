import { NextResponse } from "next/server";
import { OverviewAsset } from "@/types/market";

const BASE_URL = "https://api.binance.com";

const DEFAULT_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
];

interface RawTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

function parseNumber(value: string | number): number {
  if (typeof value === "number") return value;
  const result = Number.parseFloat(value);
  if (Number.isNaN(result)) {
    throw new Error(`Unable to parse number from value "${value}"`);
  }
  return result;
}

export async function GET() {
  try {
    const symbolsParam = encodeURIComponent(JSON.stringify(DEFAULT_SYMBOLS));
    const response = await fetch(
      `${BASE_URL}/api/v3/ticker/24hr?symbols=${symbolsParam}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`Overview request failed: ${response.statusText}`);
    }

    const payload = (await response.json()) as RawTicker[];

    const assets: OverviewAsset[] = payload.map((item) => ({
      symbol: item.symbol,
      lastPrice: parseNumber(item.lastPrice),
      priceChangePercent: parseNumber(item.priceChangePercent),
      highPrice: parseNumber(item.highPrice),
      lowPrice: parseNumber(item.lowPrice),
      volume: parseNumber(item.volume),
      quoteVolume: parseNumber(item.quoteVolume),
    }));

    return NextResponse.json({ assets });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load overview data" },
      { status: 500 }
    );
  }
}
