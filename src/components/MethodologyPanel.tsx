"use client";

import { useState } from "react";

export default function MethodologyPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--bg-card-hover)]"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">📊</span>
          <h2 className="text-sm font-semibold">Paternler Nasıl Tespit Ediliyor?</h2>
        </div>
        <span className="text-xs" style={{ color: "var(--accent-light)" }}>{open ? "Gizle" : "Göster"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">

            <div className="rounded-lg p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-bold mb-2" style={{ color: "var(--accent-light)" }}>1. Çapraz Korelasyon</div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Her coin çifti için fiyat değişimlerini farklı gecikme süreleriyle (4s, 8s, 12s, 16s, 24s) karşılaştırıyoruz.
                Pearson korelasyon katsayısı ile ilişki gücünü ölçüyoruz.
              </p>
              <div className="mt-2 p-2 rounded text-[10px] font-mono" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>
                r = Σ(xi-x̄)(yi-ȳ) / √[Σ(xi-x̄)²·Σ(yi-ȳ)²]
              </div>
            </div>

            <div className="rounded-lg p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-bold mb-2" style={{ color: "var(--green)" }}>2. Yön Takip Analizi</div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Lider coin en az %4 hareket ettikten sonra, takipçi coin&apos;in aynı yönde hareket edip etmediğini sayıyoruz.
                Bu Granger nedensellik testinin pratik bir uygulamasıdır.
              </p>
              <div className="mt-2 p-2 rounded text-[10px] font-mono" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>
                Olasılık = Doğrulanan / Toplam sinyal
              </div>
            </div>

            <div className="rounded-lg p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-bold mb-2" style={{ color: "var(--yellow)" }}>3. Güven Skoru</div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Korelasyon gücü (%25), yön takip oranı (%35), örneklem büyüklüğü (%15) ve son dönem doğruluğu (%25)
                ağırlıklı ortalaması ile hesaplanır.
              </p>
              <div className="mt-2 p-2 rounded text-[10px] font-mono" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>
                Güven = 0.25r + 0.35t + 0.15s + 0.25d
              </div>
            </div>

            <div className="rounded-lg p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-bold mb-2" style={{ color: "var(--purple)" }}>4. Sektör Agregasyonu</div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Her sektördeki coin&apos;lerin ağırlıklı ortalamasını alarak sektör endeksi oluşturuyoruz,
                ardından aynı çapraz korelasyonu sektörler arası uyguluyoruz.
              </p>
              <div className="mt-2 p-2 rounded text-[10px] font-mono" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>
                Sektör = Σ(coin değişimi) / n
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 rounded-lg" style={{ background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <p className="text-[11px]" style={{ color: "var(--yellow)" }}>
              <strong>Önemli:</strong> Tüm paternler 4 saatlik mum verileri üzerinden son ~16 günlük veriye dayanır (100 periyot).
              Minimum hareket eşiği %4 olarak uygulanır — küçük dalgalanmalar filtrelenir.
              Bu analizler geçmiş verilere dayalıdır ve gelecek performansı garanti etmez.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
