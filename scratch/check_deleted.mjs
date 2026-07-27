import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const isLocal = connectionString?.includes("localhost") || connectionString?.includes("127.0.0.1");

const pool = new Pool({ 
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const deletedApps = await prisma.appointment.findMany({
    where: { deletedAt: { not: null } },
    include: { client: true, clinic: true }
  });
  console.log("=== DELETED APPOINTMENTS (deletedAt != null) ===");
  console.log("Count:", deletedApps.length);
  console.log(JSON.stringify(deletedApps, null, 2));

  const recentApps = await prisma.appointment.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 10,
    include: { client: true, clinic: true }
  });
  console.log("=== 10 RECENTLY UPDATED APPOINTMENTS ===");
  console.log(JSON.stringify(recentApps.map(a => ({
    id: a.id,
    deletedAt: a.deletedAt,
    status: a.status,
    clinicId: a.clinicId,
    clinicName: a.clinic?.name,
    clientName: `${a.client?.firstName} ${a.client?.lastName}`,
    start: a.start,
    updatedAt: a.updatedAt
  })), null, 2));

  const clinics = await prisma.clinic.findMany({ select: { id: true, name: true } });
  console.log("=== CLINICS ===");
  console.log(clinics);
}

main().catch(console.error).finally(() => pool.end());
