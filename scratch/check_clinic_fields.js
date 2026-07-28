import "dotenv/config";
import { prisma } from "../src/lib/db.ts";

async function main() {
  const clinic = await prisma.clinic.findUnique({
    where: { id: "c0172310-7113-475b-bdee-29fe502c7fa7" }
  });
  console.log("CLINIC IN DB:", {
    id: clinic?.id,
    name: clinic?.name,
    whatsappApiUrl: clinic?.whatsappApiUrl,
    whatsappInstanceName: clinic?.whatsappInstanceName,
    whatsappApiToken: clinic?.whatsappApiToken,
    whatsappConnected: clinic?.whatsappConnected,
  });
  process.exit(0);
}

main().catch(console.error);
