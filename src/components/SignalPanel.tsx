"use client";

interface SignalResult {
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
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

export default function SignalPanel({ signals }: { signals: SignalResult[] }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold">Canlı Sinyaller</h2>
        <span className="text-[11px] px-2 py-0.5 rounded font-semibold" style={{ background: "var(--yellow-bg)", color: "var(--yellow)" }}>
          {signals.length} aktif
        </span>
      </div>
      <div className="p-4 space-y-3">
        {signals.map((signal, i) => {
          const borderColor =
            signal.priority === "yüksek" ? "var(--green)" :
            signal.priority === "orta" ? "var(--yellow)" : "var(--text-muted)";
          const bgColor =
            signal.priority === "yüksek" ? "rgba(34,197,94,0.05)" :
            signal.priority === "orta" ? "rgba(234,179,8,0.05)" : "rgba(255,255,255,0.02)";
          const moveDir = signal.leaderChange > 0;

          return (
            <div
              key={`signal-${i}`}
              className="p-3 rounded-lg"
              style={{ borderLeft: `3px solid ${borderColor}`, background: bgColor }}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.1)", color: "var(--purple)" }}>
                    {signal.type === "coin" ? "Coin" : "Sektör"}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(signal.timestamp)}</span>
                </div>
              </div>

              {/* Ana bilgi kutuları */}
              <div className="flex items-center gap-2 mb-2">
                {/* Lider hareket */}
                <div className="flex-1 rounded-md p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>Gerçekleşen</div>
                  <div className="text-xs font-bold" style={{ color: moveDir ? "var(--green)" : "var(--red)" }}>
                    {signal.leader} {moveDir ? "↑" : "↓"} %{Math.abs(signal.leaderChange).toFixed(1)}
                  </div>
                </div>

                <span className="text-sm" style={{ color: "var(--text-muted)" }}>→</span>

                {/* Beklenen hareket */}
                <div className="flex-1 rounded-md p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>Beklenen</div>
                  <div className="text-xs font-bold" style={{ color: "var(--accent-light)" }}>
                    {signal.follower} ~%{signal.expectedMove} {signal.timeframe} içinde
                  </div>
                </div>
              </div>

              {/* Açıklama */}
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}>
                {signal.description}
              </p>

              {/* Etiketler */}
              <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded"
                  style={{
                    background: signal.probability >= 75 ? "var(--green-bg)" : "var(--yellow-bg)",
                    color: signal.probability >= 75 ? "var(--green)" : "var(--yellow)",
                  }}>
                  %{signal.probability} olasılık
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent-light)" }}>
                  {signal.timeframe}
                </span>
                {signal.expectedMove > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: moveDir ? "var(--green-bg)" : "var(--red-bg)", color: moveDir ? "var(--green)" : "var(--red)" }}>
                    Tahmini ~%{signal.expectedMove} hareket
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {signals.length === 0 && (
          <div className="text-center py-6 text-sm" style={{ color: "var(--text-muted)" }}>
            Şu anda aktif sinyal bulunmuyor.
          </div>
        )}
      </div>
    </div>
  );
}
