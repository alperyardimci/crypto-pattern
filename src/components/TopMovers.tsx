"use client";

interface Pattern {
  leader: string;
  follower: string;
  probability: number;
  lagHours: string;
  sampleSize: number;
  confidence: number;
}

interface Props {
  dailyChanges: Record<string, number>;
  patterns: Pattern[];
}

export default function TopMovers({ dailyChanges, patterns }: Props) {
  // Günlük %10+ yükselen coinler, en çok yükselenden başlayarak ilk 10
  const topMovers = Object.entries(dailyChanges)
    .filter(([, change]) => change >= 10)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([symbol, change]) => {
      const relatedPatterns = patterns.filter((p) => p.leader === symbol);
      return { symbol, change, relatedPatterns };
    });

  if (topMovers.length === 0) return null;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold">En Çok Yükselen Coinler (24 saat)</h2>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Günlük %10+ yükseliş</span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topMovers.map(({ symbol, change, relatedPatterns }, i) => (
            <div
              key={symbol}
              className="rounded-lg p-3 flex flex-col gap-2"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}
            >
              {/* Coin bilgi satırı */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>#{i + 1}</span>
                  <span className="text-sm font-bold">{symbol}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: "var(--green)" }}>
                  +{change}%
                </span>
              </div>

              {/* İlişkili paternler */}
              {relatedPatterns.length > 0 ? (
                <div className="space-y-1">
                  {relatedPatterns.slice(0, 2).map((p, j) => (
                    <div
                      key={`${p.follower}-${j}`}
                      className="flex items-center justify-between px-2 py-1.5 rounded"
                      style={{ background: "rgba(34,197,94,0.06)" }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>→</span>
                        <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{p.follower}</span>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>takip edebilir</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold" style={{ color: "var(--green)" }}>%{p.probability}</span>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{p.lagHours}</span>
                      </div>
                    </div>
                  ))}
                  {relatedPatterns.length > 2 && (
                    <div className="text-[10px] px-2" style={{ color: "var(--text-muted)" }}>
                      +{relatedPatterns.length - 2} patern daha
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] px-2 py-1" style={{ color: "var(--text-muted)" }}>
                  Tespit edilmiş takip paterni yok
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
