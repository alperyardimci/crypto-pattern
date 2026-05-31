import { fetchAllCandles, fetchCoinList, SECTORS, Candle } from "./okx";
import { detectPatterns, detectSectorFlows, detectSignals } from "./patterns";
import {
  getStoredPatterns,
  getStoreMeta,
  saveStore,
  hasNewData,
  mergePatterns,
  StoredPattern,
} from "./pattern-store";

function calcSectorPerformance(candleMap: Map<string, Candle[]>) {
  const result: Array<{
    sector: string;
    change: number;
    coins: Array<{ symbol: string; change: number }>;
  }> = [];

  for (const [sector, sectorCoins] of Object.entries(SECTORS)) {
    const coinChanges: Array<{ symbol: string; change: number }> = [];

    for (const coin of sectorCoins) {
      const candles = candleMap.get(coin);
      if (!candles || candles.length < 2) continue;
      const sorted = [...candles].sort((a, b) => a.ts - b.ts);
      const last = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];
      const change = ((last.close - prev.close) / prev.close) * 100;
      coinChanges.push({ symbol: coin, change: Math.round(change * 10) / 10 });
    }

    if (coinChanges.length === 0) continue;

    const avgChange = coinChanges.reduce((s, c) => s + c.change, 0) / coinChanges.length;
    coinChanges.sort((a, b) => b.change - a.change);

    result.push({
      sector,
      change: Math.round(avgChange * 10) / 10,
      coins: coinChanges,
    });
  }

  result.sort((a, b) => b.change - a.change);
  return result;
}

// En son mumun timestamp'ini bul
function getLatestCandleTs(candleMap: Map<string, Candle[]>): number {
  let latest = 0;
  for (const candles of candleMap.values()) {
    for (const c of candles) {
      if (c.ts > latest) latest = c.ts;
    }
  }
  return latest;
}

// StoredPattern → frontend format
function formatStoredPatterns(stored: StoredPattern[], coinChanges: Record<string, number>) {
  return stored.filter((p) => p.avgFollowerMove >= 2 && p.leader in coinChanges && p.follower in coinChanges).map((p) => ({
    leader: p.leader,
    follower: p.follower,
    leaderSector: p.leaderSector,
    followerSector: p.followerSector,
    probability: p.probability,
    avgLagPeriods: p.avgLagPeriods,
    lagHours: p.lagHours,
    direction: p.direction as "aynı" | "ters",
    sampleSize: p.totalSignals,
    confidence: p.confidence,
    method: `Birikimli analiz | ${p.totalSignals} sinyal | ${p.updateCount} güncelleme | İlk: ${new Date(p.firstSeen).toLocaleDateString("tr-TR")}`,
    recentAccuracy: p.recentAccuracy,
    details: [
      `${p.leader} en az %4 hareket ettiğinde, ${p.follower} ${p.lagHours} içinde %${p.probability} olasılıkla aynı yönde hareket ediyor.`,
      `Toplam ${p.totalSignals} sinyal gözlendi, ${p.successfulSignals} tanesi doğrulandı.`,
      `Ortalama lider hareket: %${p.avgLeaderMove} | Ortalama takipçi hareket: %${p.avgFollowerMove}`,
      `${p.updateCount} kez güncellendi. İlk tespit: ${new Date(p.firstSeen).toLocaleDateString("tr-TR")}`,
    ].join("\n"),
    avgLeaderMove: p.avgLeaderMove,
    avgFollowerMove: p.avgFollowerMove,
  }));
}

export async function computePatternData() {
  const bar = "4H";
  const totalCandles = 180; // 30 gün

  const allCoins = await fetchCoinList();
  const candleMap = await fetchAllCandles(bar, totalCandles);

  // En son mumun timestamp'i
  const latestTs = getLatestCandleTs(candleMap);

  // Depodan mevcut paternleri ve meta'yı çek
  const stored = await getStoredPatterns();
  const storeMeta = await getStoreMeta();

  // Yeni veri var mı kontrol et
  const newDataAvailable = hasNewData(latestTs, storeMeta);

  let patterns: StoredPattern[];

  // Coin değişimleri — tek seferde hesapla, her yerde kullan
  const coinChanges: Record<string, number> = {};
  const dailyChanges: Record<string, number> = {};

  for (const [coin, candles] of candleMap) {
    const sorted = [...candles].sort((a, b) => a.ts - b.ts);
    if (sorted.length < 2) continue;
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    coinChanges[coin] = Math.round(((last.close - prev.close) / prev.close) * 1000) / 10;

    if (sorted.length >= 7) {
      const dayAgo = sorted[sorted.length - 7];
      dailyChanges[coin] = Math.round(((last.close - dayAgo.close) / dayAgo.close) * 1000) / 10;
    }
  }

  // lastCandleChanges = coinChanges'in yuvarlama öncesi hali (merge için)
  const lastCandleChanges: Record<string, number> = {};
  for (const [coin, candles] of candleMap) {
    const sorted = [...candles].sort((a, b) => a.ts - b.ts);
    if (sorted.length < 2) continue;
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    lastCandleChanges[coin] = ((last.close - prev.close) / prev.close) * 100;
  }

  if (newDataAvailable) {
    // Yeni mum gelmiş — paternleri yeniden hesapla ve birleştir
    const freshPatterns = detectPatterns(candleMap, bar);
    const isFirstCompute = !storeMeta;
    patterns = await mergePatterns(stored, freshPatterns, isFirstCompute, lastCandleChanges);

    // Depoya kaydet
    await saveStore(patterns, { lastCandleTs: latestTs, lastComputeTs: Date.now() });
  } else {
    // Yeni veri yok ama bekleyen sinyaller olabilir — onları kontrol et
    patterns = await mergePatterns(stored, [], false, lastCandleChanges);
    await saveStore(patterns, { lastCandleTs: storeMeta!.lastCandleTs, lastComputeTs: Date.now() });
  }

  // Sektör verileri her zaman güncel hesaplanır (hafif)
  const sectorFlows = detectSectorFlows(candleMap, bar);
  const sectorPerformance = calcSectorPerformance(candleMap);

  // Frontend format
  const formattedPatterns = formatStoredPatterns(patterns, coinChanges);
  const signals = detectSignals(candleMap, formattedPatterns, sectorFlows);

  return {
    patterns: formattedPatterns,
    coinChanges,
    dailyChanges,
    sectorFlows: sectorFlows.slice(0, 20),
    signals: signals.slice(0, 15),
    sectorPerformance,
    meta: {
      coinsAnalyzed: candleMap.size,
      totalCoinsInList: allCoins.length,
      bar,
      dataPoints: totalCandles,
      lastUpdated: Date.now(),
      minMoveThreshold: 4,
      patternStoreSize: patterns.length,
      totalAccumulatedSignals: patterns.reduce((s, p) => s + p.totalSignals, 0),
      newDataProcessed: newDataAvailable,
    },
  };
}
