const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

async function checkDb(dbPath) {
  console.log(`\n=== CHECKING DATABASE: ${dbPath} ===`);
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: `file:${dbPath}`,
    }),
  });

  try {
    const users = await prisma.user.findMany({
      include: {
        clinics: true,
      }
    });
    console.log(`Users count: ${users.length}`);
    users.forEach(u => {
      console.log(` - User ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Clinics: ${u.clinics?.map(c => c.name).join(', ') || 'None'}`);
    });

    const clinics = await prisma.clinic.findMany();
    console.log(`Clinics count: ${clinics.length}`);
    clinics.forEach(c => {
      console.log(` - Clinic ID: ${c.id}, Name: ${c.name}`);
    });
  } catch (err) {
    console.error(`Error checking ${dbPath}:`, err);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await checkDb('./dev.db');
  await checkDb('./prisma/dev.db');
}

main();
