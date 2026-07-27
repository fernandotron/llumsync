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
  const clinicId = 'c0172310-7113-475b-bdee-29fe502c7fa7';
  const deletedAppointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      deletedAt: { not: null },
    },
    include: {
      client: true,
      user: true,
      service: true,
      clinic: true,
    },
    orderBy: { deletedAt: "desc" },
  });

  console.log(`Found ${deletedAppointments.length} deleted appointments for clinic Oliva:`);
  for (const app of deletedAppointments) {
    console.log(`- ID: ${app.id}, Patient: ${app.client?.firstName} ${app.client?.lastName}, DeletedAt: ${app.deletedAt}`);
  }
}

main().catch(console.error).finally(() => pool.end());
