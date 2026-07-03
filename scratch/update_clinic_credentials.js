require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 5) {
    console.log("Usage: node scratch/update_clinic_credentials.js <clinicId> <metaAccessToken> <metaPhoneNumberId> <metaBusinessAccountId> <metaTemplateName>");
    process.exit(1);
  }

  const [clinicId, metaAccessToken, metaPhoneNumberId, metaBusinessAccountId, metaTemplateName] = args;

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const updated = await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        metaAccessToken,
        metaPhoneNumberId,
        metaBusinessAccountId,
        metaTemplateName
      }
    });
    console.log("SUCCESS! Updated clinic in PostgreSQL database:");
    console.log(JSON.stringify(updated, null, 2));
  } catch (err) {
    console.error("Error updating clinic in DB:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
