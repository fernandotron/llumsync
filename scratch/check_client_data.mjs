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
  const client = await prisma.client.findFirst({
    where: { firstName: { contains: "Fernando" } },
    include: {
      appointments: {
        include: { service: true }
      },
      sales: true
    }
  });

  if (!client) {
    console.log("Client not found");
    return;
  }

  console.log(`=== CLIENT: ${client.firstName} ${client.lastName} (${client.id}) ===`);
  console.log("Total appointments:", client.appointments.length);
  console.log("Appointments details:");
  client.appointments.forEach(a => {
    console.log(` - ID: ${a.id} | Start: ${a.start} | Status: ${a.status} | DeletedAt: ${a.deletedAt} | Service: ${a.service?.name}`);
  });

  console.log("\nTotal sales:", client.sales.length);
  client.sales.forEach(s => {
    console.log(` - Sale ID: ${s.id} | Total: ${s.total} | ItemsJson: ${s.itemsJson}`);
  });
}

main().catch(console.error).finally(() => pool.end());
