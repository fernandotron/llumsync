import "dotenv/config";
import { prisma } from "../src/lib/db.ts";

async function main() {
  const clinicId = "c0172310-7113-475b-bdee-29fe502c7fa7";
  console.log("=== EXECUTING TRIGGER-CRON FOR CLINIC ===", clinicId);

  const res = await fetch("http://localhost:3000/api/notifications/trigger-cron", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clinicId }),
  }).catch((err) => {
    console.error("Local server fetch error:", err.message);
    return null;
  });

  if (res) {
    const data = await res.json();
    console.log("Cron Result:", JSON.stringify(data, null, 2));
  }

  process.exit(0);
}

main().catch(console.error);
