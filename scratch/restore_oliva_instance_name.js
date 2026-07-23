require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const clinicId = 'c0172310-7113-475b-bdee-29fe502c7fa7';
  const instanceName = 'clinic-c0172310';

  try {
    console.log(`Restoring clinic Oliva to active instance ${instanceName} in PostgreSQL...`);
    const updated = await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        whatsappInstanceName: instanceName,
        whatsappConnected: true
      }
    });

    console.log("SUCCESS! Restored clinic Oliva instance settings:");
    console.log("- Instance Name:", updated.whatsappInstanceName);
    console.log("- Connected Status:", updated.whatsappConnected);
  } catch (err) {
    console.error("Error updating clinic:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
