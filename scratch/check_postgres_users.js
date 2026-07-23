require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany({
      include: {
        clinics: true,
      }
    });

    console.log(`Found ${users.length} users in PostgreSQL:`);
    users.forEach(u => {
      console.log(`- User ID: ${u.id}, Email: ${u.email}, Name: ${u.name}, Clinics: ${u.clinics?.map(c => c.name).join(', ') || 'None'}`);
    });
  } catch (err) {
    console.error("Error reading postgres db:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
