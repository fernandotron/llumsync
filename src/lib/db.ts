import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { encrypt, decrypt } from "./crypto";

const fieldsToEncrypt = [
  "dniNif",
  "iban",
  "bic",
  "aestheticTreatments",
  "allergies",
  "medication",
  "medicalHistory",
  "otherNotes",
  "tutorDniNif",
  "tutorAddress",
  "formResponses",
  "followUps"
];

function encryptClientFields(data: any) {
  if (!data) return data;
  const result = { ...data };
  for (const field of fieldsToEncrypt) {
    if (field in result && typeof result[field] === "string") {
      result[field] = encrypt(result[field]);
    }
  }
  return result;
}

function decryptClientFields(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(decryptClientFields);
  }
  if (typeof data !== "object") return data;

  const result = { ...data };

  for (const field of fieldsToEncrypt) {
    if (field in result && typeof result[field] === "string") {
      result[field] = decrypt(result[field]);
    }
  }

  if (result.content && typeof result.content === "string") {
    result.content = decrypt(result.content);
  }
  if (result.signature && typeof result.signature === "string") {
    result.signature = decrypt(result.signature);
  }

  if (result.client && typeof result.client === "object") {
    result.client = decryptClientFields(result.client);
  }

  return result;
}

const globalForPrisma = globalThis as unknown as { prisma: any };

let prismaInstance: any;

if (globalForPrisma.prisma && globalForPrisma.prisma.cashRegisterSession) {
  prismaInstance = globalForPrisma.prisma;
} else {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ 
    connectionString,
  });
  const adapter = new PrismaPg(pool);
  
  const rawClient = new PrismaClient({ adapter });
  
  prismaInstance = rawClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const a = args as any;
          if (operation.startsWith("create") || operation.startsWith("update") || operation.startsWith("upsert")) {
            if (model === "Client" && a?.data) {
              a.data = encryptClientFields(a.data);
            }
            if (model === "SignedDocument" && a?.data) {
              if (typeof a.data.content === "string") {
                a.data.content = encrypt(a.data.content) as any;
              }
              if (typeof a.data.signature === "string") {
                a.data.signature = encrypt(a.data.signature) as any;
              }
            }
          }
          const result = await query(args);
          return decryptClientFields(result);
        }
      }
    }
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }
}

export const prisma = prismaInstance;

if (typeof window === "undefined") {
  import("./cronScheduler").then((m) => m.initCronScheduler()).catch(() => {});
}

