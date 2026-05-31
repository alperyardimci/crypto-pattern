const OKX_BASE = "https://www.okx.com/api/v5";

// ============================================================
// OKX TR SPOT LİSTESİ — API'DEN DİNAMİK ÇEKİLİR
// ============================================================

export type CoinSymbol = string;

// Stablecoin ve wrapped tokenlar — analiz dışı
const EXCLUDE_COINS = new Set([
  "USDC", "TUSD", "BUSD", "DAI", "FDUSD", "PYUSD", "WBTC", "WETH", "STETH",
  "RETH", "CBETH", "EURT", "AUDF", "XAUT", "USDS", "PAXG", "BETH", "JITOSOL",
  "OKSOL", "RLUSD", "USDG", "USD1", "USAT", "AUDM", "BRLF", "BRL1", "RESOLV",
]);

// Sektör tanımları — bilinen coinler için
export const SECTORS: Record<string, string[]> = {
  "Layer 1": [
    "BTC", "ETH", "SOL", "ADA", "AVAX", "DOT", "NEAR", "APT", "SUI", "SEI",
    "ALGO", "HBAR", "EGLD", "FTM", "ATOM", "TON", "TRX", "ICP", "XRP", "ETC",
    "NEO", "ONE", "IOTA", "MINA", "CSPR", "FLR", "ASTR", "CELO", "KAIA",
    "S", "SONIC", "BERA", "CORE", "LUNA",
  ],
  "Layer 2": [
    "ARB", "OP", "POL", "IMX", "STX", "STRK", "METIS", "SKL", "LRC", "BICO",
    "ZK", "ZKJ", "LINEA", "SCR", "MOVE", "MERL", "ZETA",
  ],
  "DeFi": [
    "UNI", "AAVE", "MKR", "SNX", "CRV", "SUSHI", "COMP", "LDO", "INJ",
    "DYDX", "GMX", "JUP", "RAY", "1INCH", "KNC", "BNT", "PENDLE", "RPL",
    "CVX", "LQTY", "MORPHO", "ONDO", "ENA", "ETHFI", "SSV", "FLUID",
    "VELODROME", "JTO", "PYTH", "HUMA", "SKY",
  ],
  "Yapay Zeka": [
    "FET", "RENDER", "RNDR", "WLD", "OCEAN", "ARKM", "AI", "AIXBT",
    "GRASS", "VIRTUAL", "PROMPT", "ROBO", "KAITO", "SAHARA",
  ],
  "Gaming / Metaverse": [
    "GALA", "AXS", "SAND", "MANA", "IMX", "PIXEL", "BIGTIME", "ILV",
    "YGG", "MAGIC", "RON", "GODS", "ENJ", "SLP", "NFT", "ANIME",
  ],
  "Meme": [
    "DOGE", "SHIB", "PEPE", "FLOKI", "BONK", "WIF", "BOME", "MEME",
    "TURBO", "BABYDOGE", "NEIRO", "PNUT", "MOODENG", "DOGS", "MEW",
    "PEOPLE", "TRUMP", "NOT", "GOAT", "CAT", "TOSHI", "DEGEN", "DOOD",
    "VINE", "PENGU",
  ],
  "Altyapı / Oracle": [
    "LINK", "FIL", "GRT", "BAND", "API3", "THETA", "AR", "STORJ",
    "BAT", "LPT", "MASK", "ENS", "CHZ", "VET", "IOST", "FLOW",
    "CFX", "TIA", "EIGEN", "IP", "LAYER", "W",
  ],
  "Bitcoin Ekosistemi": [
    "BTC", "LTC", "BCH", "ETC", "ORDI", "STX", "SATS", "DASH", "ZEC",
    "RVN", "DGB",
  ],
  "Fan / Sosyal": [
    "CHZ", "CITY", "GALFT", "SPURS", "MENGO",
  ],
};

export function getSectorForCoin(coin: string): string {
  for (const [sector, coins] of Object.entries(SECTORS)) {
    if (coins.includes(coin)) return sector;
  }
  return "Diğer";
}

export interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
}

export interface TickerData {
  instId: string;
  last: number;
  open24h: number;
  high24h: number;
  low24h: number;
  vol24h: number;
  change24h: number;
}

// ============================================================
// RATE LIMIT KORUMASI
// ============================================================
// OKX API rate limit: /market/candles → 40 istek/2 saniye
// /public/instruments → 20 istek/2 saniye
// /market/tickers → 20 istek/2 saniye
//
// Strateji:
//   - Coin listesi: instruments API ile tek seferde çekilir (1 istek)
//   - Mum verileri: batch 5, arası 600ms → 5 istek/0.6sn ≈ 16/2sn (limitin altında)
//   - In-memory cache (5 dk TTL) → tekrar istek gönderilmez
//   - revalidate=300 ile Next.js seviyesinde de cache
// ============================================================

const BATCH_SIZE = 10;   // Vercel'de hızlı bağlantı, 10 paralel coin
const BATCH_DELAY_MS = 500; // Batch arası 500ms
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const candleCache = new Map<string, CacheEntry<Candle[]>>();
let tickerCacheRef: CacheEntry<TickerData[]> | null = null;
let coinListCache: CacheEntry<string[]> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// OKX'te listelenen tüm USDT spot çiftlerini çek (1 API isteği)
export async function fetchCoinList(): Promise<string[]> {
  if (coinListCache && Date.now() - coinListCache.ts < CACHE_TTL_MS * 6) {
    return coinListCache.data; // 30 dk cache — liste sık değişmez
  }

  const res = await fetch(`${OKX_BASE}/public/instruments?instType=SPOT`);
  const json = await res.json();
  if (json.code !== "0") throw new Error(`OKX API hatası: ${json.msg}`);

  const coins = json.data
    .filter((x: Record<string, string>) =>
      x.instId.endsWith("-USDT") && x.state === "live"
    )
    .map((x: Record<string, string>) => x.instId.replace("-USDT", ""))
    .filter((c: string) => !EXCLUDE_COINS.has(c))
    .sort();

  coinListCache = { data: coins, ts: Date.now() };
  return coins;
}

export async function fetchTickers(): Promise<TickerData[]> {
  if (tickerCacheRef && Date.now() - tickerCacheRef.ts < CACHE_TTL_MS) {
    return tickerCacheRef.data;
  }

  const coins = await fetchCoinList();
  const usdtPairs = new Set(coins.map((c) => `${c}-USDT`));

  // Tek istek ile tüm ticker'ları çek
  const res = await fetch(`${OKX_BASE}/market/tickers?instType=SPOT`);
  const json = await res.json();
  if (json.code !== "0") throw new Error(`OKX API hatası: ${json.msg}`);

  const data = json.data
    .filter((t: Record<string, string>) => usdtPairs.has(t.instId))
    .map((t: Record<string, string>) => ({
      instId: t.instId,
      last: parseFloat(t.last),
      open24h: parseFloat(t.open24h),
      high24h: parseFloat(t.high24h),
      low24h: parseFloat(t.low24h),
      vol24h: parseFloat(t.vol24h),
      change24h:
        ((parseFloat(t.last) - parseFloat(t.open24h)) /
          parseFloat(t.open24h)) *
        100,
    }));

  tickerCacheRef = { data, ts: Date.now() };
  return data;
}

// OKX API max 100 mum/istek veriyor.
// 90 gün x 4 saatlik = 540 mum → 6 sayfa gerekiyor.
// Sayfalama: "after" parametresi ile eski verilere doğru gidiyoruz.
export async function fetchCandles(
  instId: string,
  bar: string = "4H",
  totalCandles: number = 540
): Promise<Candle[]> {
  const cacheKey = `${instId}:${bar}:${totalCandles}`;

  const cached = candleCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const allCandles: Candle[] = [];
  let after: string | undefined;
  const pageSize = 100;
  const maxPages = Math.ceil(totalCandles / pageSize);

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({ instId, bar, limit: String(pageSize) });
    if (after) params.set("after", after);

    const res = await fetch(`${OKX_BASE}/market/candles?${params}`);
    const json = await res.json();
    if (json.code !== "0") break;
    if (!json.data || json.data.length === 0) break;

    const candles: Candle[] = json.data.map((c: string[]) => ({
      ts: parseInt(c[0]),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      vol: parseFloat(c[5]),
    }));

    allCandles.push(...candles);

    // OKX en eski mumun ts'sini "after" olarak kullanır (daha eskiye gitmek için)
    after = String(candles[candles.length - 1].ts);

    if (candles.length < pageSize) break; // Daha fazla veri yok
    if (allCandles.length >= totalCandles) break;

    // Sayfa arası rate limit bekleme
    await sleep(100);
  }

  candleCache.set(cacheKey, { data: allCandles, ts: Date.now() });
  return allCandles;
}

// Tüm coinleri rate limit'e uygun şekilde toplu çek
export async function fetchAllCandles(
  bar: string = "4H",
  totalCandles: number = 540
): Promise<Map<string, Candle[]>> {
  const coins = await fetchCoinList();
  const candleMap = new Map<string, Candle[]>();

  for (let i = 0; i < coins.length; i += BATCH_SIZE) {
    const batch = coins.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((coin) => fetchCandles(`${coin}-USDT`, bar, totalCandles))
    );

    for (let j = 0; j < batch.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled" && result.value.length > 10) {
        candleMap.set(batch[j], result.value);
      }
    }

    // Son batch değilse rate limit için bekle
    if (i + BATCH_SIZE < coins.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return candleMap;
}
