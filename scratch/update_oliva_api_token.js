require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const clinicId = 'c0172310-7113-475b-bdee-29fe502c7fa7';
  const realToken = 'e96c7870e7a0b5031b530b43b9119b42cd58b4bcc6968096205e6a1e2f3d94a1';
  const realUrl = 'https://evolution-api-production-e0d9.up.railway.app';

  try {
    console.log(`Updating WhatsApp credentials for clinic Oliva (${clinicId}) in PostgreSQL...`);
    const updated = await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        whatsappApiUrl: realUrl,
        whatsappApiToken: realToken
      }
    });

    console.log("SUCCESS! Updated clinic Oliva credentials in PostgreSQL:");
    console.log("- URL:", updated.whatsappApiUrl);
    console.log("- Token:", updated.whatsappApiToken ? 'UPDATED (OK)' : 'NULL');
  } catch (err) {
    console.error("Error updating clinic:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
