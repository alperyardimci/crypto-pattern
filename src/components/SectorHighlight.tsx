"use client";

interface SectorPerf {
  sector: string;
  change: number;
  coins: Array<{ symbol: string; change: number }>;
}

interface SectorFlowResult {
  fromSector: string;
  toSector: string;
  probability: number;
  avgLagHours: string;
  sampleSize: number;
  supportingPairs: number;
}

const SECTOR_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  "Layer 1": { bg: "rgba(59,130,246,0.08)", text: "#60a5fa", accent: "rgba(59,130,246,0.2)" },
  "Layer 2": { bg: "rgba(168,85,247,0.08)", text: "#a855f7", accent: "rgba(168,85,247,0.2)" },
  "DeFi": { bg: "rgba(34,197,94,0.08)", text: "#22c55e", accent: "rgba(34,197,94,0.2)" },
  "Yapay Zeka": { bg: "rgba(6,182,212,0.08)", text: "#06b6d4", accent: "rgba(6,182,212,0.2)" },
  "Gaming / Metaverse": { bg: "rgba(234,179,8,0.08)", text: "#eab308", accent: "rgba(234,179,8,0.2)" },
  "Meme": { bg: "rgba(239,68,68,0.08)", text: "#ef4444", accent: "rgba(239,68,68,0.2)" },
  "Altyapı / Oracle": { bg: "rgba(99,102,241,0.08)", text: "#6366f1", accent: "rgba(99,102,241,0.2)" },
  "Bitcoin Ekosistemi": { bg: "rgba(247,147,26,0.08)", text: "#f7931a", accent: "rgba(247,147,26,0.2)" },
  "Fan / Sosyal": { bg: "rgba(236,72,153,0.08)", text: "#ec4899", accent: "rgba(236,72,153,0.2)" },
};

function sectorStyle(name: string) {
  return SECTOR_COLORS[name] || { bg: "rgba(148,163,184,0.08)", text: "#94a3b8", accent: "rgba(148,163,184,0.2)" };
}

export default function SectorHighlight({
  sectorPerformance,
  sectorFlows,
}: {
  sectorPerformance: SectorPerf[];
  sectorFlows: SectorFlowResult[];
}) {
  if (!sectorPerformance.length) return null;

  // En çok yükselen sektör
  const topSector = sectorPerformance[0];
  const topStyle = sectorStyle(topSector.sector);

  // Bu sektörden akan hedef sektörler (olasılık sırasına göre)
  const targetFlows = sectorFlows
    .filter((f) => f.fromSector === topSector.sector)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3);

  // Hedef sektörlerin coin bilgileri
  const targetSectors = targetFlows.map((flow) => {
    const perf = sectorPerformance.find((s) => s.sector === flow.toSector);
    return {
      ...flow,
      coins: perf?.coins.slice(0, 4) || [],
      sectorChange: perf?.change || 0,
    };
  });

  const topCoins = topSector.coins.slice(0, 6);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold">Sektör Akış Özeti</h2>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Son periyot verilerine göre</span>
      </div>

      <div className="p-4">
        {/* EN ÇOK YÜKSELEN SEKTÖR */}
        <div className="rounded-lg p-4 mb-4" style={{ background: topStyle.bg, border: `1px solid ${topStyle.accent}` }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                En Çok Yükselen Sektör
              </div>
              <div className="text-lg font-bold" style={{ color: topStyle.text }}>
                {topSector.sector}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: topSector.change >= 0 ? "var(--green)" : "var(--red)" }}>
                {topSector.change >= 0 ? "+" : ""}{topSector.change}%
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                ortalama değişim
              </div>
            </div>
          </div>

          {/* Sektördeki coinler */}
          <div className="flex flex-wrap gap-2">
            {topCoins.map((coin) => (
              <div
                key={coin.symbol}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs"
                style={{ background: "rgba(0,0,0,0.2)" }}
              >
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{coin.symbol}</span>
                <span className="font-bold" style={{ color: coin.change >= 0 ? "var(--green)" : "var(--red)" }}>
                  {coin.change >= 0 ? "+" : ""}{coin.change}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AKIŞ HEDEFLERİ */}
        {targetSectors.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
                Akış Hedefleri
              </div>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {topSector.sector} yükseldiğinde sıradaki sektörler
              </div>
            </div>

            <div className="space-y-3">
              {targetSectors.map((target) => {
                const tStyle = sectorStyle(target.toSector);
                return (
                  <div
                    key={target.toSector}
                    className="rounded-lg p-3"
                    style={{ background: "rgba(255,255,255,0.02)", border: `1px solid var(--border)` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: topStyle.bg, color: topStyle.text }}>
                          {topSector.sector}
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>→</span>
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: tStyle.bg, color: tStyle.text }}>
                          {target.toSector}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold" style={{ color: target.probability >= 75 ? "var(--green)" : "var(--yellow)" }}>
                          %{target.probability}
                        </span>
                        <span className="text-[10px] ml-1.5" style={{ color: "var(--text-muted)" }}>
                          {target.avgLagHours}
                        </span>
                      </div>
                    </div>

                    {/* Hedef sektördeki coin örnekleri */}
                    <div className="flex flex-wrap gap-1.5">
                      {target.coins.map((coin) => (
                        <div
                          key={coin.symbol}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[11px]"
                          style={{ background: tStyle.bg }}
                        >
                          <span className="font-semibold" style={{ color: tStyle.text }}>{coin.symbol}</span>
                          <span style={{ color: coin.change >= 0 ? "var(--green)" : "var(--red)" }}>
                            {coin.change >= 0 ? "+" : ""}{coin.change}%
                          </span>
                        </div>
                      ))}
                      <span className="text-[10px] flex items-center px-1" style={{ color: "var(--text-muted)" }}>
                        +{target.supportingPairs} destekleyen çift
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {targetSectors.length === 0 && (
          <div className="text-center py-3 text-xs" style={{ color: "var(--text-muted)" }}>
            Bu sektörden henüz anlamlı bir akış paterni tespit edilmedi.
          </div>
        )}
      </div>
    </div>
  );
}
