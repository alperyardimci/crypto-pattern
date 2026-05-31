"use client";

import { useEffect, useState } from "react";

interface PatternData {
  patterns: Array<{
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
    method: string;
    recentAccuracy: number;
    details: string;
    avgLeaderMove: number;
    avgFollowerMove: number;
  }>;
  sectorFlows: Array<{
    fromSector: string;
    toSector: string;
    probability: number;
    avgLagHours: string;
    sampleSize: number;
    supportingPairs: number;
  }>;
  signals: Array<{
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
    expectedMove: number;
  }>;
  coinChanges: Record<string, number>;
  dailyChanges: Record<string, number>;
  sectorPerformance: Array<{
    sector: string;
    change: number;
    coins: Array<{ symbol: string; change: number }>;
  }>;
  meta: {
    coinsAnalyzed: number;
    bar: string;
    dataPoints: number;
    lastUpdated: number;
    patternStoreSize: number;
    totalAccumulatedSignals: number;
  };
}

const SECTOR_COLORS: Record<string, string> = {
  "Layer 1": "#60a5fa", "Layer 2": "#a855f7", "DeFi": "#22c55e",
  "Yapay Zeka": "#06b6d4", "Gaming / Metaverse": "#eab308", "Meme": "#ef4444",
  "Altyapı / Oracle": "#6366f1", "Bitcoin Ekosistemi": "#f7931a", "Fan / Sosyal": "#ec4899",
};

const SECTOR_EXAMPLE_COINS: Record<string, string[]> = {
  "Layer 1": ["SOL", "AVAX", "NEAR", "SUI"],
  "Layer 2": ["ARB", "OP", "STRK", "POL"],
  "DeFi": ["AAVE", "UNI", "MKR", "CRV"],
  "Yapay Zeka": ["FET", "RENDER", "WLD", "ARKM"],
  "Gaming / Metaverse": ["GALA", "IMX", "PIXEL", "AXS"],
  "Meme": ["PEPE", "WIF", "BONK", "FLOKI"],
  "Altyapı / Oracle": ["LINK", "GRT", "FIL", "AR"],
  "Bitcoin Ekosistemi": ["LTC", "BCH", "ORDI", "STX"],
  "Fan / Sosyal": ["CHZ", "CITY", "GALFT"],
};

function sectorColor(name: string) { return SECTOR_COLORS[name] || "#94a3b8"; }
function probColor(p: number) { return p >= 80 ? "var(--green)" : p >= 70 ? "var(--yellow)" : "var(--text-muted)"; }

export default function Home() {
  const [data, setData] = useState<PatternData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    fetch("/api/patterns")
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent-light)" }} />
          <div className="text-sm font-semibold">283 coin analiz ediliyor...</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>30 gün geriye dönük veri</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <div className="text-sm" style={{ color: "var(--red)" }}>Veri yüklenemedi</div>
          <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: "var(--accent)", color: "#fff" }}>Tekrar Dene</button>
        </div>
      </div>
    );
  }

  const patterns = data.patterns
    .filter((p) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return p.leader.toLowerCase().includes(q) || p.follower.toLowerCase().includes(q) || p.leaderSector.toLowerCase().includes(q) || p.followerSector.toLowerCase().includes(q);
    })
    .sort((a, b) => b.sampleSize - a.sampleSize || b.probability - a.probability);

  const sectorPerf = data.sectorPerformance;
  const sectorFlows = data.sectorFlows;
  const signals = data.signals;
  const coinChanges = data.coinChanges;
  const meta = data.meta;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* NAV */}
      <nav className="flex items-center justify-between px-5 h-12 border-b shrink-0" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-4">
          <div className="text-[15px] font-bold" style={{ color: "var(--accent-light)" }}>CryptoPattern<span className="font-normal text-[11px] ml-1" style={{ color: "var(--text-muted)" }}>OKX TR</span></div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.08)", color: "var(--green)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--green)" }} />Canlı
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NavStat label="coin" value={meta.coinsAnalyzed} />
          <NavStat label="patern" value={patterns.length} />
          <NavStat label="sinyal" value={meta.totalAccumulatedSignals} />
          <NavStat label="gün veri" value={Math.round(meta.dataPoints * 4 / 24)} />
        </div>
      </nav>

      {/* BODY SPLIT */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_360px] overflow-hidden">

        {/* LEFT */}
        <div className="overflow-y-auto p-4 border-r" style={{ borderColor: "var(--border)" }}>

          {/* SECTOR PERFORMANCE */}
          <SectionLabel title="Sektör Performansı" badge="Son 4 saat" badgeColor="var(--cyan)" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
            {sectorPerf.map((s) => (
              <div key={s.sector} className="rounded-lg p-3 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-semibold" style={{ color: sectorColor(s.sector) }}>{s.sector}</span>
                  <span className="text-[13px] font-extrabold" style={{ color: s.change >= 0 ? "var(--green)" : "var(--red)" }}>{s.change >= 0 ? "+" : ""}{s.change}%</span>
                </div>
                <div className="text-[9px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {s.coins.slice(0, 3).map((c) => (
                    <span key={c.symbol}><b style={{ color: "var(--text-secondary)" }}>{c.symbol}</b> {c.change >= 0 ? "+" : ""}{c.change}% · </span>
                  ))}
                </div>
              </div>
            ))}
          </div>


          {/* PATTERNS */}
          <SectionLabel title="Tespit Edilen Takip Paternleri" badge={`${patterns.length} patern`} badgeColor="var(--accent-light)" />

          {/* SEARCH */}
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>🔍</span>
            <input
              type="text"
              placeholder="Coin, sektör veya patern ara... (örnek: FET, AI, DeFi)"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); setExpanded(null); }}
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          {/* TABLE */}
          {(() => {
            const totalPages = Math.ceil(patterns.length / PAGE_SIZE);
            const paged = patterns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
            return (
              <>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>#</th>
                      <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>Lider → Takipçi</th>
                      <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>Olasılık</th>
                      <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>Örneklem</th>
                      <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>Gecikme</th>
                      <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((p, i) => (
                      <PatternRow key={`${p.leader}-${p.follower}-${i}`} index={(page - 1) * PAGE_SIZE + i + 1} pattern={p} coinChanges={coinChanges} isExpanded={expanded === i} onToggle={() => setExpanded(expanded === i ? null : i)} />
                    ))}
                    {patterns.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>Eşleşen patern bulunamadı.</td></tr>
                    )}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-3 px-1">
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{patterns.length} paternden {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, patterns.length)} arası</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setPage(Math.max(1, page - 1)); setExpanded(null); }}
                        disabled={page === 1}
                        className="px-2.5 py-1 rounded text-[10px] font-semibold transition-colors disabled:opacity-30"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      >←</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => { setPage(p); setExpanded(null); }}
                          className="w-7 h-7 rounded text-[10px] font-semibold transition-colors"
                          style={{
                            background: p === page ? "var(--accent)" : "var(--bg-card)",
                            border: `1px solid ${p === page ? "var(--accent)" : "var(--border)"}`,
                            color: p === page ? "#fff" : "var(--text-secondary)",
                          }}
                        >{p}</button>
                      ))}
                      <button
                        onClick={() => { setPage(Math.min(totalPages, page + 1)); setExpanded(null); }}
                        disabled={page === totalPages}
                        className="px-2.5 py-1 rounded text-[10px] font-semibold transition-colors disabled:opacity-30"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      >→</button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* RIGHT */}
        <div className="overflow-y-auto p-4 flex flex-col gap-3">

          {/* SECTOR FLOWS */}
          <PaginatedPanelCard title="Sektör Akış Paterni" badge={`${sectorFlows.length} akış`} badgeColor="var(--purple)" items={sectorFlows} pageSize={5} renderItem={(f, i) => (
            <div key={`${f.fromSector}-${f.toSector}-${i}`} className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: `${sectorColor(f.fromSector)}15`, color: sectorColor(f.fromSector) }}>{f.fromSector}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>→</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: `${sectorColor(f.toSector)}15`, color: sectorColor(f.toSector) }}>{f.toSector}</span>
                <span className="ml-auto text-xs font-extrabold" style={{ color: probColor(f.probability) }}>%{f.probability}</span>
                <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{f.avgLagHours}</span>
              </div>
              <div className="text-[9px] pl-1" style={{ color: "var(--text-muted)" }}>
                {(SECTOR_EXAMPLE_COINS[f.toSector] || []).slice(0, 4).map((c) => <b key={c} style={{ color: "var(--text-secondary)" }}>{c} · </b>)}
                <span>takip edebilir</span>
              </div>
            </div>
          )} />

          {/* SIGNALS */}
          <PaginatedPanelCard title="Canlı Sinyaller" badge={signals.length > 0 ? `${signals.length} aktif` : "Bekleniyor"} badgeColor="var(--yellow)" items={signals} pageSize={5} emptyMessage="Beklenen hareket %5 altında olan sinyaller gösterilmez" renderItem={(s, i) => (
            <div key={`sig-${i}`} className="p-2.5 rounded-lg mb-2 border-l-[3px]" style={{ borderColor: s.priority === "yüksek" ? "var(--green)" : "var(--yellow)", background: "rgba(34,197,94,0.03)" }}>
              <div className="text-[11px] font-bold mb-1">{s.title}</div>
              <div className="text-[10px] leading-relaxed mb-1.5" style={{ color: "var(--text-secondary)" }}>{s.description}</div>
              <div className="flex gap-1 flex-wrap">
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.08)", color: "var(--green)" }}>%{s.probability}</span>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.08)", color: "var(--accent-light)" }}>{s.timeframe}</span>
              </div>
            </div>
          )} />

          {/* TOP MOVERS */}
          {(() => {
            const movers = Object.entries(data.dailyChanges).filter(([, c]) => c >= 10).sort(([, a], [, b]) => b - a);
            if (movers.length === 0) return null;
            return (
              <PaginatedPanelCard title="Günlük %10+ Yükseliş" badge="24 saat" badgeColor="var(--green)" items={movers} pageSize={5} renderItem={([symbol, change], i) => {
                const related = data.patterns.filter((p) => p.leader === symbol);
                return (
                  <div key={symbol} className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: "rgba(30,45,66,0.3)" }}>
                    <span className="text-[10px] font-bold w-4" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                    <span className="text-xs font-bold">{symbol}</span>
                    {related.length > 0 && <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>→ {related[0].follower}</span>}
                    <span className="ml-auto text-xs font-extrabold" style={{ color: "var(--green)" }}>+{change}%</span>
                  </div>
                );
              }} />
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function NavStat({ label, value }: { label: string; value: number }) {
  return <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}><b style={{ color: "var(--text-primary)" }}>{value}</b> {label}</span>;
}

function SectionLabel({ title, badge, badgeColor }: { title: string; badge: string; badgeColor: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h2 className="text-xs font-bold">{title}</h2>
      <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${badgeColor}12`, color: badgeColor }}>{badge}</span>
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}

function PaginatedPanelCard<T>({ title, badge, badgeColor, items, pageSize, renderItem, emptyMessage }: { title: string; badge: string; badgeColor: string; items: T[]; pageSize: number; renderItem: (item: T, index: number) => React.ReactNode; emptyMessage?: string }) {
  const [pg, setPg] = useState(1);
  const totalPages = Math.ceil(items.length / pageSize);
  const paged = items.slice((pg - 1) * pageSize, pg * pageSize);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[11px] font-bold">{title}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${badgeColor}12`, color: badgeColor }}>{badge}</span>
      </div>
      <div className="p-3">
        {items.length > 0 ? paged.map((item, i) => renderItem(item, (pg - 1) * pageSize + i)) : (
          <div className="text-center py-4 text-[10px]" style={{ color: "var(--text-muted)" }}>{emptyMessage || "Veri yok"}</div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{items.length} öğeden {(pg - 1) * pageSize + 1}-{Math.min(pg * pageSize, items.length)}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPg(Math.max(1, pg - 1))} disabled={pg === 1} className="px-1.5 py-0.5 rounded text-[9px] font-semibold disabled:opacity-30" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPg(n)} className="w-5 h-5 rounded text-[9px] font-semibold" style={{ background: n === pg ? "var(--accent)" : "var(--bg-primary)", border: `1px solid ${n === pg ? "var(--accent)" : "var(--border)"}`, color: n === pg ? "#fff" : "var(--text-secondary)" }}>{n}</button>
              ))}
              <button onClick={() => setPg(Math.min(totalPages, pg + 1))} disabled={pg === totalPages} className="px-1.5 py-0.5 rounded text-[9px] font-semibold disabled:opacity-30" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PatternRow({ index, pattern: p, coinChanges, isExpanded, onToggle }: { index: number; pattern: PatternData["patterns"][0]; coinChanges: Record<string, number>; isExpanded: boolean; onToggle: () => void }) {
  const lc = coinChanges[p.leader];
  const fc = coinChanges[p.follower];
  return (
    <>
      <tr className="cursor-pointer" style={{ borderBottom: isExpanded ? "none" : "1px solid rgba(30,45,66,0.3)" }} onClick={onToggle}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.03)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
        <td className="px-3 py-2.5 text-xs font-bold" style={{ color: "var(--text-muted)" }}>{index}</td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold">{p.leader}</span>
                {lc !== undefined && <span className="text-[9px] font-bold" style={{ color: lc >= 0 ? "var(--green)" : "var(--red)" }}>{lc >= 0 ? "+" : ""}{lc}%</span>}
              </div>
              <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>{p.leaderSector}</div>
            </div>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>→</span>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold">{p.follower}</span>
                {fc !== undefined && <span className="text-[9px] font-bold" style={{ color: fc >= 0 ? "var(--green)" : "var(--red)" }}>{fc >= 0 ? "+" : ""}{fc}%</span>}
              </div>
              <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>{p.followerSector}</div>
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-full rounded-full" style={{ width: `${p.probability}%`, background: probColor(p.probability) }} />
            </div>
            <span className="text-xs font-extrabold" style={{ color: probColor(p.probability) }}>{p.probability}%</span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{p.sampleSize}</td>
        <td className="px-3 py-2.5 text-[10px]" style={{ color: "var(--text-muted)" }}>{p.lagHours}</td>
        <td className="px-3 py-2.5"><span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.06)", color: "var(--accent-light)" }}>{isExpanded ? "Gizle" : "Detay"}</span></td>
      </tr>
      {isExpanded && (
        <tr><td colSpan={6} style={{ borderBottom: "1px solid rgba(30,45,66,0.3)" }}>
          <div className="px-3 py-3" style={{ background: "var(--bg-secondary)" }}>
            <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>{p.details}</div>
            <div className="mt-2 text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{p.method}</div>
          </div>
        </td></tr>
      )}
    </>
  );
}
