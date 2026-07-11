import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const isLocal = connectionString?.includes("localhost") || connectionString?.includes("127.0.0.1");

const pool = new Pool({ 
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const clinics = await prisma.clinic.findMany({
    select: {
      id: true,
      name: true,
      whatsappApiUrl: true,
      whatsappInstanceName: true,
      whatsappApiToken: true,
      whatsappConnected: true,
    }
  });
  console.log("CLINICS:", JSON.stringify(clinics, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
