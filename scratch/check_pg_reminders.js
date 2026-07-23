require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const reminders = await prisma.appointmentReminder.findMany();
    console.log(`Found ${reminders.length} reminders in PG:`);
    reminders.forEach(r => {
      console.log(`- ID: ${r.id}`);
      console.log(`  Name: ${r.name}`);
      console.log(`  imageUrl: ${r.imageUrl ? r.imageUrl.slice(0, 100) + (r.imageUrl.length > 100 ? '...' : '') : 'NULL'}`);
    });
  } catch (err) {
    console.error("Error reading PG reminders:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
