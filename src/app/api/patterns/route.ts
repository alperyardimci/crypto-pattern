import { getCachedData, setCachedData } from "@/lib/cache";
import { computePatternData } from "@/lib/compute";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  try {
    // 1. KV cache'e bak — varsa anında dön
    const cached = await getCachedData();
    if (cached) {
      return Response.json(cached);
    }

    // 2. Cache yoksa veya expire olmuşsa hesapla
    const data = await computePatternData();

    // 3. Sonucu KV'ye yaz (10 dk TTL)
    await setCachedData(data);

    return Response.json(data);
  } catch (error) {
    console.error("Patern analizi hatası:", error);
    return Response.json(
      { error: "Veri analizi sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
