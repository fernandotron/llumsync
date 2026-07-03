require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const clinics = await prisma.clinic.findMany({
      select: {
        id: true,
        name: true,
        metaAccessToken: true,
        metaPhoneNumberId: true,
        metaTemplateName: true,
        whatsappApiUrl: true,
        whatsappInstanceName: true,
        whatsappApiToken: true
      }
    });

    console.log(`Found ${clinics.length} clinics in PostgreSQL:`);
    clinics.forEach(r => {
      console.log(`- Clinic: ${r.name} (ID: ${r.id})`);
      console.log(`  metaAccessToken: ${r.metaAccessToken ? 'SET (length ' + r.metaAccessToken.length + ')' : 'NULL'}`);
      console.log(`  metaPhoneNumberId: ${r.metaPhoneNumberId || 'NULL'}`);
      console.log(`  metaTemplateName: ${r.metaTemplateName || 'NULL'}`);
      console.log(`  whatsappApiUrl: ${r.whatsappApiUrl || 'NULL'}`);
      console.log(`  whatsappInstanceName: ${r.whatsappInstanceName || 'NULL'}`);
      console.log(`  whatsappApiToken: ${r.whatsappApiToken ? 'SET' : 'NULL'}`);
    });
  } catch (err) {
    console.error("Error reading postgres db:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
