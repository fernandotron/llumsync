import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

try {
  console.log("Running prisma db push...");
  execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
} catch (e) {
  console.error("Error during prisma db push:", e);
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: "file:./prisma/dev.db",
  }),
});

async function main() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log("Database is empty. Seeding initial data...");
      execSync("node prisma/seed.mjs", { stdio: "inherit" });
    } else {
      console.log(`Database already has ${userCount} users. Skipping seed.`);
    }
  } catch (error) {
    console.error("Database initialization error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
