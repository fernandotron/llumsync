import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: "file:./prisma/dev.db",
  }),
});

globalForPrisma.prisma = prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
