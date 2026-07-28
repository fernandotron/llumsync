import "dotenv/config";
import { prisma } from "../src/lib/db.ts";

async function main() {
  const clinic = await prisma.clinic.findUnique({
    where: { id: "c0172310-7113-475b-bdee-29fe502c7fa7" }
  });

  const apiUrl = clinic?.whatsappApiUrl;
  const instance = clinic?.whatsappInstanceName;
  const token = clinic?.whatsappApiToken;

  console.log(`Checking connection to ${apiUrl}/instance/connectionState/${instance}`);
  const res = await fetch(`${apiUrl}/instance/connectionState/${instance}`, {
    headers: { apikey: token || "" }
  });
  console.log("Status:", res.status);
  const data = await res.json().catch(() => ({}));
  console.log("Evolution API Connection State Response:", JSON.stringify(data, null, 2));

  process.exit(0);
}

main().catch(console.error);
