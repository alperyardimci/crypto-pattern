"use client";

import { useState } from "react";

interface PatternResult {
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
}

const COIN_COLORS: Record<string, string> = {
  BTC: "#f7931a", ETH: "#627eea", SOL: "#9945ff", XRP: "#23292f", DOGE: "#c2a633",
  ADA: "#0033ad", AVAX: "#e84142", DOT: "#e6007a", MATIC: "#8247e5", LINK: "#2a5ada",
  UNI: "#ff007a", ATOM: "#2e3148", NEAR: "#00c08b", FIL: "#0090ff", ARB: "#2d374b",
  OP: "#ff0420", APT: "#000", SUI: "#4da2ff", SEI: "#9b1c2e", INJ: "#00f2fe",
  FET: "#1cd8d2", RNDR: "#1cd8d2", AGIX: "#6916e8", WLD: "#000",
  AAVE: "#b6509e", MKR: "#1aab9b", CRV: "#f3e42f", SUSHI: "#fa52a0",
  COMP: "#00d395", LDO: "#00a3ff", GALA: "#000", AXS: "#0055d5",
  SAND: "#00adef", MANA: "#ff2d55", SHIB: "#ffa409", PEPE: "#4c9141",
  FLOKI: "#f6921a", BONK: "#f5a623", LTC: "#bfbbbb", BCH: "#4cca47",
};

function coinColor(coin: string) {
  return COIN_COLORS[coin] || "#6366f1";
}

function probColor(prob: number) {
  if (prob >= 80) return "var(--green)";
  if (prob >= 70) return "var(--yellow)";
  return "var(--text-muted)";
}

export default function PatternTable({ patterns, coinChanges = {} }: { patterns: PatternResult[]; coinChanges?: Record<string, number> }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = patterns
    .filter((p) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        p.leader.toLowerCase().includes(q) ||
        p.follower.toLowerCase().includes(q) ||
        p.leaderSector.toLowerCase().includes(q) ||
        p.followerSector.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.sampleSize - a.sampleSize || b.probability - a.probability);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold">Tespit Edilen Takip Paternleri</h2>
        <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "rgba(59,130,246,0.08)", color: "var(--accent-light)" }}>
          {filtered.length} patern
        </span>
      </div>

      {/* SEARCH */}
      <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
        <input
          type="text"
          placeholder="Coin, sektör veya patern ara... (örnek: FET, AI, DeFi)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-xs outline-none"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-left px-4 py-2.5 text-[9px] uppercase tracking-wide font-bold" style={{ color: "var(--text-muted)" }}>#</th>
              <th className="text-left px-4 py-2.5 text-[9px] uppercase tracking-wide font-bold" style={{ color: "var(--text-muted)" }}>Lider → Takipçi</th>
              <th className="text-left px-4 py-2.5 text-[9px] uppercase tracking-wide font-bold" style={{ color: "var(--text-muted)" }}>Olasılık</th>
              <th className="text-left px-4 py-2.5 text-[9px] uppercase tracking-wide font-bold" style={{ color: "var(--text-muted)" }}>Örneklem</th>
              <th className="text-left px-4 py-2.5 text-[9px] uppercase tracking-wide font-bold" style={{ color: "var(--text-muted)" }}>Gecikme</th>
              <th className="text-left px-4 py-2.5 text-[9px] uppercase tracking-wide font-bold" style={{ color: "var(--text-muted)" }}>Detay</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <PatternRow
                key={`${p.leader}-${p.follower}-${i}`}
                index={i + 1}
                pattern={p}
                isExpanded={expanded === i}
                onToggle={() => setExpanded(expanded === i ? null : i)}
                coinChanges={coinChanges}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  Eşleşen patern bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoinChange({ change }: { change: number | undefined }) {
  if (change === undefined) return null;
  const color = change > 0 ? "var(--green)" : change < 0 ? "var(--red)" : "var(--text-muted)";
  return (
    <span className="text-[10px] font-bold ml-1" style={{ color }}>
      {change > 0 ? "+" : ""}{change}%
    </span>
  );
}

function PatternRow({ index, pattern: p, isExpanded, onToggle, coinChanges }: { index: number; pattern: PatternResult; isExpanded: boolean; onToggle: () => void; coinChanges: Record<string, number> }) {
  return (
    <>
      <tr
        className="cursor-pointer transition-colors"
        style={{ borderBottom: isExpanded ? "none" : "1px solid rgba(42,58,78,0.3)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-xs font-bold" style={{ color: "var(--text-muted)" }}>{index}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
              style={{ background: coinColor(p.leader) }}>{p.leader[0]}</span>
            <div>
              <div className="flex items-center">
                <span className="font-semibold text-xs">{p.leader}</span>
                <CoinChange change={coinChanges[p.leader]} />
              </div>
              <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>{p.leaderSector}</div>
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>→</span>
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
              style={{ background: coinColor(p.follower) }}>{p.follower[0]}</span>
            <div>
              <div className="flex items-center">
                <span className="font-semibold text-xs">{p.follower}</span>
                <CoinChange change={coinChanges[p.follower]} />
              </div>
              <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>{p.followerSector}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-full rounded-full" style={{ width: `${p.probability}%`, background: probColor(p.probability) }} />
            </div>
            <span className="font-bold text-xs" style={{ color: probColor(p.probability) }}>%{p.probability}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{p.sampleSize}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{p.lagHours}</span>
        </td>
        <td className="px-4 py-3">
          <button className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.08)", color: "var(--accent-light)" }}>
            {isExpanded ? "Gizle" : "Göster"}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-0 py-0" style={{ borderBottom: "1px solid rgba(42,58,78,0.3)" }}>
            <div className="px-4 py-4" style={{ background: "var(--bg-secondary)" }}>
              <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--accent-light)" }}>
                {p.leader} → {p.follower} — Nasıl Tespit Edildi?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="rounded-lg p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="text-[9px] uppercase tracking-wide mb-1 font-bold" style={{ color: "var(--text-muted)" }}>Örneklem</div>
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {p.sampleSize} sinyal ({p.leader} en az %4 hareket ettiği anlar)
                  </div>
                </div>
                <div className="rounded-lg p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="text-[9px] uppercase tracking-wide mb-1 font-bold" style={{ color: "var(--text-muted)" }}>Son Doğruluk</div>
                  <div className="text-sm font-bold" style={{ color: p.recentAccuracy >= 70 ? "var(--green)" : "var(--yellow)" }}>
                    %{p.recentAccuracy}
                  </div>
                </div>
                <div className="rounded-lg p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="text-[9px] uppercase tracking-wide mb-1 font-bold" style={{ color: "var(--text-muted)" }}>Güven</div>
                  <div className="text-sm font-bold" style={{ color: probColor(p.confidence) }}>%{p.confidence}</div>
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="text-[9px] uppercase tracking-wide mb-2 font-bold" style={{ color: "var(--text-muted)" }}>Açıklama</div>
                <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>{p.details}</div>
              </div>
              <div className="rounded-lg p-2 mt-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{p.method}</div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
