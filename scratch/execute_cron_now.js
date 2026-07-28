import "dotenv/config";
import { POST } from "../src/app/api/notifications/trigger-cron/route.ts";

async function main() {
  console.log("Calling POST /api/notifications/trigger-cron directly...");
  const fakeReq = new Request("http://localhost:3000/api/notifications/trigger-cron", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clinicId: "c0172310-7113-475b-bdee-29fe502c7fa7" }),
  });

  const res = await POST(fakeReq);
  console.log("Response status:", res.status);
  const data = await res.json();
  console.log("Response body:", JSON.stringify(data, null, 2));

  process.exit(0);
}

main().catch(console.error);
