require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: 'c0172310-7113-475b-bdee-29fe502c7fa7' }
    });
    console.log("Oliva Clinic WhatsApp API Url:", clinic.whatsappApiUrl);
    console.log("Oliva Clinic WhatsApp API Token:", clinic.whatsappApiToken);
    console.log("Oliva Clinic WhatsApp Instance Name:", clinic.whatsappInstanceName);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
