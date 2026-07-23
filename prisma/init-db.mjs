import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const isLocal = connectionString?.includes("localhost") || connectionString?.includes("127.0.0.1") || !connectionString;

try {
  console.log("Running prisma db push...");
  const command = isLocal 
    ? "npx prisma db push --accept-data-loss" 
    : "npx prisma db push"; // Avoid accidental data loss in production!
  execSync(command, { stdio: "inherit" });
} catch (e) {
  console.error("Error during prisma db push:", e);
}

const pool = new Pool({ 
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
