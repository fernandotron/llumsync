require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const email = 'fernando19.asj@gmail.com';

  try {
    console.log(`Connecting user ${email} to all 4 clinics...`);
    
    const user = await prisma.user.update({
      where: { email },
      data: {
        clinics: {
          connect: [
            { id: '1941b619-8ead-4388-91f4-aedd9100a7e9' }, // Clínica Fisioterapia Clifav Central
            { id: '6fe5ca72-4169-48da-94a2-79196efbe581' }, // Clínica Fisioterapia Clifav Norte
            { id: '417590d5-1ec6-4ea3-bfa1-68947916d724' }, // Centro Fernando y Asociados
            { id: '7fdfdcdc-a14e-4c1f-b4b0-49a211c4772a' }  // Test Clinic
          ]
        }
      },
      include: {
        clinics: true
      }
    });

    console.log(`Successfully updated user ${email}. Connected clinics:`);
    user.clinics.forEach(c => {
      console.log(` - Clinic ID: ${c.id}, Name: ${c.name}`);
    });
  } catch (err) {
    console.error("Error linking user to clinics:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
