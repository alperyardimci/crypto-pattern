"use client";

import { useState } from "react";

interface SectorFlowResult {
  fromSector: string;
  toSector: string;
  probability: number;
  avgLagHours: string;
  sampleSize: number;
  supportingPairs: number;
}

const SECTOR_COLORS: Record<string, { bg: string; text: string }> = {
  "Layer 1": { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  "Layer 2": { bg: "rgba(168,85,247,0.15)", text: "#a855f7" },
  "DeFi": { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
  "Yapay Zeka": { bg: "rgba(6,182,212,0.15)", text: "#06b6d4" },
  "Gaming / Metaverse": { bg: "rgba(234,179,8,0.15)", text: "#eab308" },
  "Meme": { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
  "Altyapı / Oracle": { bg: "rgba(99,102,241,0.15)", text: "#6366f1" },
  "Bitcoin Ekosistemi": { bg: "rgba(247,147,26,0.15)", text: "#f7931a" },
  "Fan / Sosyal": { bg: "rgba(236,72,153,0.15)", text: "#ec4899" },
};

function sectorStyle(name: string) {
  return SECTOR_COLORS[name] || { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" };
}

const INITIAL_COUNT = 5;

export default function SectorFlow({ flows }: { flows: SectorFlowResult[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? flows : flows.slice(0, INITIAL_COUNT);
  const hasMore = flows.length > INITIAL_COUNT;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold">Sektör Akış Paterni</h2>
        <span className="text-[11px] px-2 py-0.5 rounded font-semibold" style={{ background: "var(--purple-bg)", color: "var(--purple)" }}>
          {flows.length} akış
        </span>
      </div>
      <div className="p-4 space-y-2">
        {visible.map((flow, i) => {
          const from = sectorStyle(flow.fromSector);
          const to = sectorStyle(flow.toSector);
          const probColor = flow.probability >= 75 ? "var(--green)" : flow.probability >= 65 ? "var(--yellow)" : "var(--text-muted)";

          return (
            <div
              key={`${flow.fromSector}-${flow.toSector}-${i}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-transparent transition-all hover:border-[var(--border)]"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <span className="px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap" style={{ background: from.bg, color: from.text }}>
                {flow.fromSector}
              </span>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>→</span>
              <span className="px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap" style={{ background: to.bg, color: to.text }}>
                {flow.toSector}
              </span>
              <div className="ml-auto text-right shrink-0">
                <div className="text-sm font-bold" style={{ color: probColor }}>%{flow.probability}</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {flow.avgLagHours} · {flow.supportingPairs} çift
                </div>
              </div>
            </div>
          );
        })}
        {flows.length === 0 && (
          <div className="text-center py-6 text-sm" style={{ color: "var(--text-muted)" }}>
            Yeterli veri ile sektör akışı tespit edilemedi.
          </div>
        )}
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 mt-1 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: "rgba(59,130,246,0.08)", color: "var(--accent-light)" }}
          >
            {showAll ? "Daha az göster" : `Tümünü göster (${flows.length})`}
          </button>
        )}
      </div>
    </div>
  );
}
