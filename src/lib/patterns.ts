import { Candle, CoinSymbol, getSectorForCoin, SECTORS } from "./okx";

// ============================================================
// PATERN TESPİT ALGORİTMASI
// ============================================================
//
// 1. Çapraz Korelasyon (Cross-Correlation)
//    Her coin çifti için fiyat değişimlerini farklı gecikme
//    süreleriyle (1, 2, 3, 4, 6 periyot) karşılaştırıyoruz.
//
// 2. Granger Nedensellik (Basitleştirilmiş)
//    A coin'inin geçmiş değerleri, B'yi tahmin etmeye
//    yardımcı oluyor mu? Regresyon bazlı F-testi yerine
//    pratik bir yaklaşım: A hareket ettikten sonra B'nin
//    aynı yönde hareket etme oranı.
//
// 3. Olasılık Hesabı
//    Olasılık = (Paterni doğrulayan pencere) / (Toplam pencere)
//    Minimum %4 hareket eşiği uygulanır.
//
// 4. Güven Skoru
//    Veri noktası sayısı, tutarlılık ve son dönem performansı
//    birleştirilerek hesaplanır.
// ============================================================

export interface PatternResult {
  leader: CoinSymbol;
  follower: CoinSymbol;
  leaderSector: string;
  followerSector: string;
  probability: number;
  avgLagPeriods: number;
  lagHours: string;
  direction: "aynı" | "ters";
  sampleSize: number;
  confidence: number;
  method: string;
  recentAccuracy: number;
  details: string;
  avgLeaderMove: number;   // Liderin ortalama hareket yüzdesi
  avgFollowerMove: number; // Takipçinin ortalama hareket yüzdesi
}

export interface SectorFlowResult {
  fromSector: string;
  toSector: string;
  probability: number;
  avgLagHours: string;
  sampleSize: number;
  supportingPairs: number;
}

export interface SignalResult {
  type: "coin" | "sektör";
  title: string;
  description: string;
  probability: number;
  timeframe: string;
  priority: "yüksek" | "orta" | "düşük";
  timestamp: number;
  leader: string;
  follower: string;
  leaderChange: number;
  expectedMove: number; // Beklenen takipçi hareket yüzdesi
}

const MIN_MOVE_THRESHOLD = 4; // Minimum %4 hareket
const LAGS = [1, 2, 3, 4, 6]; // Test edilecek gecikme periyotları

// Fiyat değişim yüzdelerini hesapla
function priceChanges(candles: Candle[]): number[] {
  const sorted = [...candles].sort((a, b) => a.ts - b.ts);
  const changes: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    changes.push(((sorted[i].close - sorted[i - 1].close) / sorted[i - 1].close) * 100);
  }
  return changes;
}

// Pearson korelasyon katsayısı
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 5) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (den === 0) return 0;
  return num / den;
}

// Çapraz korelasyon: farklı lag değerleri için korelasyon hesapla
function crossCorrelation(
  leader: number[],
  follower: number[],
  lag: number
): number {
  if (leader.length - lag < 5) return 0;
  const x = leader.slice(0, leader.length - lag);
  const y = follower.slice(lag);
  const n = Math.min(x.length, y.length);
  return pearsonCorrelation(x.slice(0, n), y.slice(0, n));
}

// Yön takip oranı: Lider hareket ettikten sonra takipçinin
// aynı yönde hareket etme yüzdesi (Granger benzeri basit test)
function directionalFollowRate(
  leader: number[],
  follower: number[],
  lag: number,
  threshold: number = MIN_MOVE_THRESHOLD
): { rate: number; sampleSize: number; direction: "aynı" | "ters"; avgLeaderMove: number; avgFollowerMove: number } {
  let sameDir = 0;
  let oppositeDir = 0;
  let total = 0;
  let leaderMoveSum = 0;
  let followerMoveSum = 0;

  for (let i = 0; i < leader.length - lag; i++) {
    if (Math.abs(leader[i]) < threshold) continue;
    total++;
    leaderMoveSum += Math.abs(leader[i]);
    followerMoveSum += Math.abs(follower[i + lag]);
    const leaderDir = leader[i] > 0 ? 1 : -1;
    const followerDir = follower[i + lag] > 0 ? 1 : -1;
    if (leaderDir === followerDir) sameDir++;
    else oppositeDir++;
  }

  if (total < 3) return { rate: 0, sampleSize: 0, direction: "aynı", avgLeaderMove: 0, avgFollowerMove: 0 };

  const avgLeaderMove = leaderMoveSum / total;
  const avgFollowerMove = followerMoveSum / total;

  if (sameDir >= oppositeDir) {
    return { rate: sameDir / total, sampleSize: total, direction: "aynı", avgLeaderMove, avgFollowerMove };
  } else {
    return { rate: oppositeDir / total, sampleSize: total, direction: "ters", avgLeaderMove, avgFollowerMove };
  }
}

// Son dönem doğruluğu (son 10 sinyal)
function recentAccuracy(
  leader: number[],
  follower: number[],
  lag: number,
  direction: "aynı" | "ters"
): number {
  let correct = 0;
  let total = 0;
  const startIdx = Math.max(0, leader.length - lag - 10);

  for (let i = startIdx; i < leader.length - lag; i++) {
    if (Math.abs(leader[i]) < MIN_MOVE_THRESHOLD) continue;
    total++;
    const leaderDir = leader[i] > 0 ? 1 : -1;
    const followerDir = follower[i + lag] > 0 ? 1 : -1;
    const match = direction === "aynı" ? leaderDir === followerDir : leaderDir !== followerDir;
    if (match) correct++;
  }

  return total > 0 ? correct / total : 0;
}

// Güven skoru hesapla
function confidenceScore(
  correlation: number,
  followRate: number,
  sampleSize: number,
  recent: number
): number {
  const corrWeight = 0.25;
  const followWeight = 0.35;
  const sampleWeight = 0.15;
  const recentWeight = 0.25;

  const corrScore = Math.abs(correlation);
  const sampleScore = Math.min(sampleSize / 20, 1);

  return (
    corrScore * corrWeight +
    followRate * followWeight +
    sampleScore * sampleWeight +
    recent * recentWeight
  );
}

function lagToHours(lag: number, bar: string): string {
  const hourMap: Record<string, number> = {
    "1H": 1, "4H": 4, "6H": 6, "12H": 12, "1D": 24,
  };
  const h = hourMap[bar] || 4;
  const minH = lag * h;
  const maxH = (lag + 1) * h;
  if (maxH <= 24) return `${minH}-${maxH} saat`;
  return `${Math.round(minH / 24)}-${Math.round(maxH / 24)} gün`;
}

// ============================================================
// ANA FONKSİYON: Coin çifti paternlerini tespit et
// ============================================================
export function detectPatterns(
  candleMap: Map<CoinSymbol, Candle[]>,
  bar: string = "4H"
): PatternResult[] {
  const coins = Array.from(candleMap.keys());
  const changeMap = new Map<CoinSymbol, number[]>();

  for (const coin of coins) {
    changeMap.set(coin, priceChanges(candleMap.get(coin)!));
  }

  const results: PatternResult[] = [];

  for (const leader of coins) {
    for (const follower of coins) {
      if (leader === follower) continue;

      const leaderChanges = changeMap.get(leader)!;
      const followerChanges = changeMap.get(follower)!;

      let bestLag = 1;
      let bestScore = 0;
      let bestCorr = 0;
      let bestFollow: { rate: number; sampleSize: number; direction: "aynı" | "ters"; avgLeaderMove: number; avgFollowerMove: number } = { rate: 0, sampleSize: 0, direction: "aynı", avgLeaderMove: 0, avgFollowerMove: 0 };
      let bestRecent = 0;

      for (const lag of LAGS) {
        const corr = crossCorrelation(leaderChanges, followerChanges, lag);
        const follow = directionalFollowRate(leaderChanges, followerChanges, lag);
        const recent = recentAccuracy(leaderChanges, followerChanges, lag, follow.direction);
        const score = confidenceScore(corr, follow.rate, follow.sampleSize, recent);

        if (score > bestScore) {
          bestScore = score;
          bestLag = lag;
          bestCorr = corr;
          bestFollow = follow;
          bestRecent = recent;
        }
      }

      if (bestFollow.rate < 0.75 || bestFollow.sampleSize < 10 || bestFollow.direction === "ters") continue;

      const method = buildMethodDescription(bestCorr, bestFollow, bestLag, bar);

      results.push({
        leader,
        follower,
        leaderSector: getSectorForCoin(leader),
        followerSector: getSectorForCoin(follower),
        probability: Math.round(bestFollow.rate * 100),
        avgLagPeriods: bestLag,
        lagHours: lagToHours(bestLag, bar),
        direction: bestFollow.direction,
        sampleSize: bestFollow.sampleSize,
        confidence: Math.round(bestScore * 100),
        method,
        recentAccuracy: Math.round(bestRecent * 100),
        details: buildDetails(leader, follower, bestCorr, bestFollow, bestLag, bestRecent),
        avgLeaderMove: Math.round(bestFollow.avgLeaderMove * 10) / 10,
        avgFollowerMove: Math.round(bestFollow.avgFollowerMove * 10) / 10,
      });
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);
  return results;
}

function buildMethodDescription(
  corr: number,
  follow: { rate: number; sampleSize: number },
  lag: number,
  bar: string
): string {
  const parts: string[] = [];
  parts.push(`Çapraz korelasyon (r=${corr.toFixed(2)}, gecikme=${lag} periyot)`);
  parts.push(`Yön takip oranı (%${Math.round(follow.rate * 100)}, ${follow.sampleSize} örnek)`);
  parts.push(`Periyot: ${bar}`);
  return parts.join(" | ");
}

function buildDetails(
  leader: CoinSymbol,
  follower: CoinSymbol,
  corr: number,
  follow: { rate: number; sampleSize: number; direction: string },
  lag: number,
  recent: number
): string {
  return [
    `${leader} en az %${MIN_MOVE_THRESHOLD} hareket ettiğinde, ${follower} ${lag} periyot sonra %${Math.round(follow.rate * 100)} olasılıkla ${follow.direction} yönde hareket ediyor.`,
    `Pearson korelasyonu: ${corr.toFixed(3)}`,
    `Toplam ${follow.sampleSize} örnekten hesaplandı.`,
    `Son 10 sinyaldeki doğruluk: %${Math.round(recent * 100)}`,
  ].join("\n");
}

// ============================================================
// SEKTÖR AKIŞ PATERNLERİ
// ============================================================
export function detectSectorFlows(
  candleMap: Map<CoinSymbol, Candle[]>,
  bar: string = "4H"
): SectorFlowResult[] {
  const sectorNames = Object.keys(SECTORS);
  const sectorChanges = new Map<string, number[]>();

  // Her sektör için ortalama değişim serisi oluştur
  for (const sector of sectorNames) {
    const coins = SECTORS[sector].filter((c) => candleMap.has(c));
    if (coins.length === 0) continue;

    const allChanges = coins.map((c) => priceChanges(candleMap.get(c)!));
    const minLen = Math.min(...allChanges.map((a) => a.length));
    const avgChanges: number[] = [];

    for (let i = 0; i < minLen; i++) {
      let sum = 0;
      for (const changes of allChanges) {
        sum += changes[i];
      }
      avgChanges.push(sum / allChanges.length);
    }
    sectorChanges.set(sector, avgChanges);
  }

  const results: SectorFlowResult[] = [];
  const sectors = Array.from(sectorChanges.keys());

  for (const from of sectors) {
    for (const to of sectors) {
      if (from === to) continue;

      const fromChanges = sectorChanges.get(from)!;
      const toChanges = sectorChanges.get(to)!;

      let bestLag = 1;
      let bestRate = 0;
      let bestSample = 0;

      const SECTOR_THRESHOLD = 2; // Sektör ortalamaları için %2 eşik
      for (const lag of LAGS) {
        const follow = directionalFollowRate(fromChanges, toChanges, lag, SECTOR_THRESHOLD);
        if (follow.rate > bestRate && follow.direction === "aynı") {
          bestRate = follow.rate;
          bestLag = lag;
          bestSample = follow.sampleSize;
        }
      }

      if (bestRate < 0.55 || bestSample < 3) continue;

      // Destekleyen coin çifti sayısı
      const fromCoins = SECTORS[from].filter((c) => candleMap.has(c));
      const toCoins = SECTORS[to].filter((c) => candleMap.has(c));
      let supportingPairs = 0;

      for (const fc of fromCoins) {
        for (const tc of toCoins) {
          const fcChanges = priceChanges(candleMap.get(fc)!);
          const tcChanges = priceChanges(candleMap.get(tc)!);
          const follow = directionalFollowRate(fcChanges, tcChanges, bestLag);
          if (follow.rate >= 0.6 && follow.direction === "aynı") {
            supportingPairs++;
          }
        }
      }

      results.push({
        fromSector: from,
        toSector: to,
        probability: Math.round(bestRate * 100),
        avgLagHours: lagToHours(bestLag, bar),
        sampleSize: bestSample,
        supportingPairs,
      });
    }
  }

  results.sort((a, b) => b.probability - a.probability);
  return results;
}

// ============================================================
// AKTİF SİNYALLER
// ============================================================
export function detectSignals(
  candleMap: Map<CoinSymbol, Candle[]>,
  patterns: PatternResult[],
  sectorFlows: SectorFlowResult[]
): SignalResult[] {
  const signals: SignalResult[] = [];
  const now = Date.now();

  // Son mum verilerinden büyük hareketleri bul
  for (const [coin, candles] of candleMap) {
    const sorted = [...candles].sort((a, b) => a.ts - b.ts);
    if (sorted.length < 2) continue;

    const lastCandle = sorted[sorted.length - 1];
    const prevCandle = sorted[sorted.length - 2];
    const change = ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100;

    if (Math.abs(change) < MIN_MOVE_THRESHOLD) continue;

    // Bu coin'i lider olarak kullanan paternleri bul
    const relevantPatterns = patterns.filter(
      (p) => p.leader === coin && p.probability >= 75
    );

    for (const pattern of relevantPatterns) {
      const leaderDir = change > 0 ? "yükseldi" : "düştü";
      const followerDir = pattern.direction === "aynı"
        ? (change > 0 ? "yükselmesi" : "düşmesi")
        : (change > 0 ? "düşmesi" : "yükselmesi");
      const priority: SignalResult["priority"] =
        pattern.probability >= 80 ? "yüksek" : pattern.probability >= 70 ? "orta" : "düşük";

      // Beklenen hareket: liderin mevcut hareketi ile geçmiş ortalama oranından hesapla
      const avgL = pattern.avgLeaderMove || 0;
      const avgF = pattern.avgFollowerMove || 0;
      const ratio = avgL > 0 ? avgF / avgL : 0;
      const expectedMove = ratio > 0 ? Math.round(Math.abs(change) * ratio * 10) / 10 : avgF;

      signals.push({
        type: "coin",
        title: `${coin} %${Math.abs(change).toFixed(1)} ${leaderDir} → ${pattern.follower} %${expectedMove} ${followerDir} bekleniyor`,
        description: `${coin} son periyotta %${Math.abs(change).toFixed(1)} ${leaderDir}. Geçmiş ${pattern.sampleSize} örnekte ${coin} ortalama %${pattern.avgLeaderMove} hareket ettiğinde, ${pattern.follower} ${pattern.lagHours} içinde ortalama %${pattern.avgFollowerMove} hareket etti. Şu anki hareket için ${pattern.follower} tahmini %${expectedMove} civarında ${followerDir}.`,
        probability: pattern.probability,
        timeframe: pattern.lagHours,
        priority,
        timestamp: lastCandle.ts,
        leader: coin,
        follower: pattern.follower,
        leaderChange: change,
        expectedMove,
      });
    }
  }

  // Sektör sinyalleri
  for (const flow of sectorFlows) {
    if (flow.probability < 65) continue;
    const fromCoins = SECTORS[flow.fromSector]?.filter((c) => candleMap.has(c)) || [];
    if (fromCoins.length === 0) continue;

    let totalChange = 0;
    let count = 0;
    for (const coin of fromCoins) {
      const sorted = [...candleMap.get(coin)!].sort((a, b) => a.ts - b.ts);
      if (sorted.length < 2) continue;
      const last = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];
      totalChange += ((last.close - prev.close) / prev.close) * 100;
      count++;
    }

    const avgChange = count > 0 ? totalChange / count : 0;
    if (Math.abs(avgChange) < 1) continue;

    const leaderDir = avgChange > 0 ? "yükseldi" : "düştü";
    const followerDir = avgChange > 0 ? "yükselmesi" : "düşmesi";
    const priority: SignalResult["priority"] =
      flow.probability >= 75 ? "yüksek" : flow.probability >= 65 ? "orta" : "düşük";

    signals.push({
      type: "sektör",
      title: `${flow.fromSector} %${Math.abs(avgChange).toFixed(1)} ${leaderDir} → ${flow.toSector} ${followerDir} bekleniyor`,
      description: `${flow.fromSector} sektörü (${fromCoins.length} coin) ortalama %${Math.abs(avgChange).toFixed(1)} ${leaderDir}. Geçmiş verilere göre ${flow.toSector} sektörü %${flow.probability} olasılıkla ${flow.avgLagHours} içinde aynı yönde hareket ediyor. Bu akışı destekleyen ${flow.supportingPairs} coin çifti var.`,
      probability: flow.probability,
      timeframe: flow.avgLagHours,
      priority,
      timestamp: now,
      leader: flow.fromSector,
      follower: flow.toSector,
      leaderChange: avgChange,
      expectedMove: Math.round(Math.abs(avgChange) * 0.8 * 10) / 10,
    });
  }

  // Beklenen hareket %5'in altındaki sinyalleri filtrele
  const filtered = signals.filter((s) => s.expectedMove >= 5);

  filtered.sort((a, b) => {
    const prioOrder = { yüksek: 0, orta: 1, düşük: 2 };
    return prioOrder[a.priority] - prioOrder[b.priority] || b.probability - a.probability;
  });

  return filtered;
}

// ============================================================
// KORELASYON MATRİSİ
// ============================================================
export function buildCorrelationMatrix(
  candleMap: Map<CoinSymbol, Candle[]>,
  coins: CoinSymbol[],
  lag: number = 1
): { coins: CoinSymbol[]; matrix: number[][] } {
  const available = coins.filter((c) => candleMap.has(c));
  const changeMap = new Map<CoinSymbol, number[]>();

  for (const coin of available) {
    changeMap.set(coin, priceChanges(candleMap.get(coin)!));
  }

  const matrix: number[][] = [];
  for (const a of available) {
    const row: number[] = [];
    for (const b of available) {
      if (a === b) {
        row.push(1);
      } else {
        const corr = crossCorrelation(changeMap.get(a)!, changeMap.get(b)!, lag);
        row.push(Math.round(corr * 100) / 100);
      }
    }
    matrix.push(row);
  }

  return { coins: available, matrix };
}
