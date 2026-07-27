require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const reminders = await prisma.appointmentReminder.findMany({
    where: { clinicId: 'c0172310-7113-475b-bdee-29fe502c7fa7' }
  });

  console.log(JSON.stringify(reminders, null, 2));

  await prisma.$disconnect();
  await pool.end();
}

main();
