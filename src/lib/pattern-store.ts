import { kv } from "@vercel/kv";

// ============================================================
// KALICI PATERN DEPOSU
// ============================================================
// Örneklem sadece gerçek koşullar sağlandığında büyür:
// 1. Lider coin %4+ hareket etti → bekleyen sinyal kaydedilir
// 2. Gecikme süresi dolduktan sonra takipçi kontrol edilir
// 3. Takipçi %2+ aynı yönde → başarılı (successfulSignals++)
// 4. Takipçi %2 altında veya ters → başarısız (sadece totalSignals++)
// ============================================================

const STORE_KEY = "patterns:store:v3";
const META_KEY = "patterns:meta:v3";
const PENDING_KEY = "patterns:pending:v1";
const MAX_PATTERNS = 50;
const MIN_LEADER_MOVE = 4;    // Lider minimum %4 hareket
const MIN_FOLLOWER_MOVE = 2;  // Takipçi minimum %2 hareket

export interface StoredPattern {
  leader: string;
  follower: string;
  leaderSector: string;
  followerSector: string;
  totalSignals: number;
  successfulSignals: number;
  probability: number;
  avgLagPeriods: number;
  lagHours: string;
  direction: "aynı";
  confidence: number;
  avgLeaderMove: number;
  avgFollowerMove: number;
  recentAccuracy: number;
  firstSeen: number;
  lastUpdated: number;
  updateCount: number;
}

// Bekleyen sinyal: lider hareket etti, takipçi henüz kontrol edilmedi
interface PendingSignal {
  leader: string;
  follower: string;
  leaderDir: 1 | -1;         // Lider yönü
  lagPeriods: number;         // Kaç periyot beklenecek
  periodsWaited: number;      // Kaç periyot beklendi
  createdTs: number;          // Oluşturulma zamanı
}

interface StoreMeta {
  lastCandleTs: number;
  lastComputeTs: number;
}

export async function getStoredPatterns(): Promise<StoredPattern[]> {
  try {
    return (await kv.get<StoredPattern[]>(STORE_KEY)) || [];
  } catch {
    return [];
  }
}

export async function getStoreMeta(): Promise<StoreMeta | null> {
  try {
    return await kv.get<StoreMeta>(META_KEY);
  } catch {
    return null;
  }
}

async function getPendingSignals(): Promise<PendingSignal[]> {
  try {
    return (await kv.get<PendingSignal[]>(PENDING_KEY)) || [];
  } catch {
    return [];
  }
}

async function savePendingSignals(signals: PendingSignal[]): Promise<void> {
  try {
    await kv.set(PENDING_KEY, signals);
  } catch {}
}

export async function saveStore(patterns: StoredPattern[], meta: StoreMeta): Promise<void> {
  try {
    const sorted = patterns
      .sort((a, b) => b.totalSignals - a.totalSignals || b.probability - a.probability)
      .slice(0, MAX_PATTERNS);
    await kv.set(STORE_KEY, sorted);
    await kv.set(META_KEY, meta);
  } catch {}
}

export function hasNewData(currentLatestTs: number, storeMeta: StoreMeta | null): boolean {
  if (!storeMeta) return true;
  return currentLatestTs > storeMeta.lastCandleTs;
}

// ============================================================
// ANA MERGE FONKSİYONU
// ============================================================
export async function mergePatterns(
  stored: StoredPattern[],
  fresh: Array<{
    leader: string;
    follower: string;
    leaderSector: string;
    followerSector: string;
    probability: number;
    avgLagPeriods: number;
    lagHours: string;
    direction: "aynı" | "ters";
    sampleSize: number;
    confidence: number;
    avgLeaderMove: number;
    avgFollowerMove: number;
    recentAccuracy: number;
    method: string;
    details: string;
  }>,
  isFirstCompute: boolean,
  lastCandleChanges: Record<string, number>
): Promise<StoredPattern[]> {
  const now = Date.now();
  const storedMap = new Map<string, StoredPattern>();

  for (const p of stored) {
    storedMap.set(`${p.leader}:${p.follower}`, p);
  }

  // 1. Bekleyen sinyalleri çek ve süresi dolmuş olanları değerlendir
  const pending = await getPendingSignals();
  const stillPending: PendingSignal[] = [];

  for (const ps of pending) {
    ps.periodsWaited += 1;

    if (ps.periodsWaited >= ps.lagPeriods) {
      // Gecikme süresi doldu — takipçiyi kontrol et
      const key = `${ps.leader}:${ps.follower}`;
      const pattern = storedMap.get(key);
      if (pattern) {
        // Takipçinin son mumdaki değişimi
        const followerChange = lastCandleChanges[ps.follower];
        if (followerChange !== undefined && Math.abs(followerChange) >= MIN_FOLLOWER_MOVE) {
          // Takipçi anlamlı hareket etti — sinyal sayılır
          pattern.totalSignals += 1;
          const followerDir = followerChange > 0 ? 1 : -1;
          if (followerDir === ps.leaderDir) {
            pattern.successfulSignals += 1;
          }
          pattern.probability = pattern.totalSignals > 0
            ? Math.round((pattern.successfulSignals / pattern.totalSignals) * 100)
            : 0;
          pattern.lastUpdated = now;
        }
        // Takipçi %2 altında → zayıf hareket, sinyal dikkate alınmaz
      }
    } else {
      stillPending.push(ps);
    }
  }

  // 2. Yeni bekleyen sinyaller oluştur (lider %4+ hareket ettiyse)
  //    Aynı çift için zaten bekleyen sinyal varsa duplicate oluşturma
  if (!isFirstCompute) {
    const pendingKeys = new Set(stillPending.map((ps) => `${ps.leader}:${ps.follower}`));

    for (const fp of fresh) {
      if (fp.direction !== "aynı") continue;

      const key = `${fp.leader}:${fp.follower}`;
      if (pendingKeys.has(key)) continue; // Zaten bekliyor, duplicate oluşturma

      const leaderChange = lastCandleChanges[fp.leader];
      if (leaderChange !== undefined && Math.abs(leaderChange) >= MIN_LEADER_MOVE) {
        stillPending.push({
          leader: fp.leader,
          follower: fp.follower,
          leaderDir: leaderChange > 0 ? 1 : -1,
          lagPeriods: fp.avgLagPeriods,
          periodsWaited: 0,
          createdTs: now,
        });
        pendingKeys.add(key);
      }
    }
  }

  // 3. Eski bekleyen sinyalleri temizle (48 saatten eski — takılıp kalmış olabilir)
  const maxPendingAge = 48 * 60 * 60 * 1000;
  const cleanedPending = stillPending.filter((ps) => (now - ps.createdTs) < maxPendingAge);
  await savePendingSignals(cleanedPending);

  // 4. Fresh paternleri depoya ekle/güncelle (ilk hesaplama veya yeni patern)
  for (const fp of fresh) {
    if (fp.direction !== "aynı") continue;

    const key = `${fp.leader}:${fp.follower}`;
    const existing = storedMap.get(key);

    if (existing) {
      if (isFirstCompute) {
        existing.totalSignals = fp.sampleSize;
        existing.successfulSignals = Math.round(fp.probability / 100 * fp.sampleSize);
        existing.probability = fp.probability;
      }
      // Metrikleri güncelle
      const w = 0.8;
      existing.confidence = Math.round(existing.confidence * w + fp.confidence * (1 - w));
      existing.avgLeaderMove = Math.round((existing.avgLeaderMove * w + fp.avgLeaderMove * (1 - w)) * 10) / 10;
      existing.avgFollowerMove = Math.round((existing.avgFollowerMove * w + fp.avgFollowerMove * (1 - w)) * 10) / 10;
      existing.avgLagPeriods = fp.avgLagPeriods;
      existing.lagHours = fp.lagHours;
      existing.recentAccuracy = fp.recentAccuracy;
      existing.lastUpdated = now;
      existing.updateCount++;
    } else {
      // Yeni patern
      const successCount = Math.round(fp.probability / 100 * fp.sampleSize);
      storedMap.set(key, {
        leader: fp.leader,
        follower: fp.follower,
        leaderSector: fp.leaderSector,
        followerSector: fp.followerSector,
        totalSignals: fp.sampleSize,
        successfulSignals: successCount,
        probability: fp.probability,
        avgLagPeriods: fp.avgLagPeriods,
        lagHours: fp.lagHours,
        direction: "aynı",
        confidence: fp.confidence,
        avgLeaderMove: fp.avgLeaderMove,
        avgFollowerMove: fp.avgFollowerMove,
        recentAccuracy: fp.recentAccuracy,
        firstSeen: now,
        lastUpdated: now,
        updateCount: 1,
      });
    }
  }

  // 5. Eski/zayıf paternleri temizle
  const allPatterns = Array.from(storedMap.values()).filter((p) => {
    const ageDays = (now - p.lastUpdated) / (24 * 60 * 60 * 1000);
    if (ageDays > 3 && p.probability < 60) return false;
    if (ageDays > 7) return false;
    return true;
  });

  return allPatterns
    .sort((a, b) => b.totalSignals - a.totalSignals || b.probability - a.probability)
    .slice(0, MAX_PATTERNS);
}
