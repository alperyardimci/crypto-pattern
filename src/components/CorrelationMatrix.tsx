"use client";

interface Props {
  coins: string[];
  matrix: number[][];
}

function cellColor(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 0.75) return "rgba(34,197,94,0.8)";
  if (abs >= 0.5) return "rgba(34,197,94,0.5)";
  if (abs >= 0.3) return "rgba(234,179,8,0.35)";
  return "rgba(148,163,184,0.15)";
}

export default function CorrelationMatrix({ coins, matrix }: Props) {
  if (!coins.length || !matrix.length) {
    return (
      <div className="rounded-xl border p-6 text-center text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
        Korelasyon verisi yükleniyor...
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold">Coin Korelasyon Haritası (4 saatlik gecikme)</h2>
        <span className="text-[11px] px-2 py-0.5 rounded font-semibold" style={{ background: "rgba(6,182,212,0.1)", color: "var(--cyan)" }}>
          Top {coins.length}
        </span>
      </div>
      <div className="p-4 overflow-x-auto">
        <div
          className="grid gap-0.5"
          style={{
            gridTemplateColumns: `40px repeat(${coins.length}, 1fr)`,
            minWidth: `${40 + coins.length * 44}px`,
          }}
        >
          {/* Header */}
          <div />
          {coins.map((c) => (
            <div key={`h-${c}`} className="text-center text-[10px] font-semibold py-1" style={{ color: "var(--text-muted)" }}>
              {c}
            </div>
          ))}

          {/* Rows */}
          {coins.flatMap((rowCoin, ri) => [
            <div key={`l-${rowCoin}`} className="text-[10px] font-semibold flex items-center justify-end pr-1.5" style={{ color: "var(--text-muted)" }}>
              {rowCoin}
            </div>,
            ...matrix[ri].map((val, ci) => (
              <div
                key={`c-${ri}-${ci}`}
                className="aspect-square rounded flex items-center justify-center text-[10px] font-semibold text-white transition-transform hover:scale-110 hover:z-10 cursor-default"
                style={{
                  background: ri === ci ? "rgba(59,130,246,0.9)" : cellColor(val),
                }}
                title={`${rowCoin} → ${coins[ci]}: ${val}`}
              >
                {val.toFixed(2).replace("0.", ".")}
              </div>
            )),
          ])}
        </div>

        <div className="mt-3 flex items-center gap-3 justify-center">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(148,163,184,0.15)" }} />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Düşük (&lt;.30)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(234,179,8,0.35)" }} />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Orta (.30-.50)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(34,197,94,0.5)" }} />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>İyi (.50-.75)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(34,197,94,0.8)" }} />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Yüksek (.75+)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
