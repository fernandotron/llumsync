const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: "file:./dev.db",
  }),
});

async function main() {
  try {
    const service = await prisma.service.create({
      data: {
        name: "Toxina Botulínica (Test)",
        price: 240,
        duration: 15,
        color: "#3b82f6",
        category: "Facial",
        type: "Presencial",
        tax: 0,
        total: 240,
        allowedUserIds: "",
        clinicId: "417590d5-1ec6-4ea3-bfa1-68947916d724"
      }
    });
    console.log('CREATE_SUCCESS:', service);
    
    // Clean it up so we don't leave garbage
    await prisma.service.delete({
      where: { id: service.id }
    });
    console.log('CLEANUP_SUCCESS');
  } catch (err) {
    console.error('DATABASE_ERROR:', err);
  }
}

main().finally(() => prisma.$disconnect());
