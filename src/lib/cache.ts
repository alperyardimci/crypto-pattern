import { kv } from "@vercel/kv";

const CACHE_KEY = "patterns:v10";
const CACHE_TTL = 14400; // 4 saat (saniye) — yeni mum da 4 saatte bir geliyor

export async function getCachedData<T>(): Promise<T | null> {
  try {
    const data = await kv.get<T>(CACHE_KEY);
    return data;
  } catch {
    // KV bağlantısı yoksa (lokal geliştirme) null dön
    return null;
  }
}

export async function setCachedData<T>(data: T): Promise<void> {
  try {
    await kv.set(CACHE_KEY, data, { ex: CACHE_TTL });
  } catch {
    // KV bağlantısı yoksa sessizce geç
  }
}
