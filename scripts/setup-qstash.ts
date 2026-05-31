// Bu script'i bir kez çalıştır: npx tsx scripts/setup-qstash.ts
// QStash'te 4 saatte bir /api/refresh'i çağıran schedule oluşturur.

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const APP_URL = "https://app-orpin-two-91.vercel.app";

async function setup() {
  if (!QSTASH_TOKEN) {
    console.error("QSTASH_TOKEN env variable gerekli!");
    console.log("Vercel dashboard → Settings → Environment Variables'dan alabilirsin.");
    process.exit(1);
  }

  // Mevcut schedule'ları kontrol et
  const listRes = await fetch("https://qstash.upstash.io/v2/schedules", {
    headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
  });
  const existing = await listRes.json();
  console.log(`Mevcut schedule sayısı: ${existing.length || 0}`);

  // Her 4 saatte bir çalışacak schedule oluştur
  const res = await fetch(`https://qstash.upstash.io/v2/schedules/${APP_URL}/api/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      "Upstash-Cron": "0 */4 * * *", // Her 4 saatte bir (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
    },
  });

  if (res.ok) {
    const data = await res.json();
    console.log("QStash schedule oluşturuldu!");
    console.log(`  Schedule ID: ${data.scheduleId}`);
    console.log(`  Cron: Her 4 saatte bir (0 */4 * * *)`);
    console.log(`  Hedef: ${APP_URL}/api/refresh`);
    console.log(`\nSistem artık 7/24 her 4 saatte otomatik yenilenecek.`);
  } else {
    const error = await res.text();
    console.error("Hata:", res.status, error);
  }
}

setup();
