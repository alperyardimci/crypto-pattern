import { Receiver } from "@upstash/qstash";
import { setCachedData } from "@/lib/cache";
import { computePatternData } from "@/lib/compute";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// QStash imza doğrulaması
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

export async function POST(request: Request) {
  // QStash imzasını doğrula (güvenlik)
  try {
    const signature = request.headers.get("upstash-signature") || "";
    const body = await request.text();
    const isValid = await receiver.verify({ signature, body }).catch(() => false);

    if (!isValid && process.env.QSTASH_CURRENT_SIGNING_KEY) {
      return Response.json({ error: "Geçersiz imza" }, { status: 401 });
    }
  } catch {
    // Doğrulama başarısızsa ama key yoksa (lokal test) devam et
  }

  try {
    const data = await computePatternData();
    await setCachedData(data);

    return Response.json({
      ok: true,
      patterns: data.patterns.length,
      coinsAnalyzed: data.meta.coinsAnalyzed,
      pendingProcessed: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Refresh hatası:", error);
    return Response.json({ error: "Hesaplama hatası" }, { status: 500 });
  }
}
