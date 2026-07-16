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

function decryptClientFields(client: any) {
  if (!client) return client;
  const result = { ...client };
  for (const field of fieldsToEncrypt) {
    if (field in result && typeof result[field] === "string") {
      result[field] = decrypt(result[field]);
    }
  }
  return result;
}

const globalForPrisma = globalThis as unknown as { prisma: any };

let prismaInstance: any;

if (globalForPrisma.prisma) {
  prismaInstance = globalForPrisma.prisma;
} else {
  const connectionString = process.env.DATABASE_URL;
  const isLocal = connectionString?.includes("localhost") || connectionString?.includes("127.0.0.1");
  
  const pool = new Pool({ 
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  
  const rawClient = new PrismaClient({ adapter });
  
  prismaInstance = rawClient.$extends({
    query: {
      client: {
        async create({ args, query }) {
          if (args.data) {
            args.data = encryptClientFields(args.data);
          }
          const client = await query(args);
          return decryptClientFields(client);
        },
        async update({ args, query }) {
          if (args.data) {
            args.data = encryptClientFields(args.data);
          }
          const client = await query(args);
          return decryptClientFields(client);
        },
        async updateMany({ args, query }) {
          if (args.data) {
            args.data = encryptClientFields(args.data);
          }
          return query(args);
        },
        async upsert({ args, query }) {
          if (args.create) {
            args.create = encryptClientFields(args.create);
          }
          if (args.update) {
            args.update = encryptClientFields(args.update);
          }
          const client = await query(args);
          return decryptClientFields(client);
        },
        async findUnique({ args, query }) {
          const client = await query(args);
          return decryptClientFields(client);
        },
        async findFirst({ args, query }) {
          const client = await query(args);
          return decryptClientFields(client);
        },
        async findMany({ args, query }) {
          const clients = await query(args);
          if (Array.isArray(clients)) {
            return clients.map(decryptClientFields);
          }
          return clients;
        },
      },
      signedDocument: {
        async create({ args, query }) {
          if (args.data) {
            if (typeof args.data.content === "string") {
              args.data.content = encrypt(args.data.content) as any;
            }
            if (typeof args.data.signature === "string") {
              args.data.signature = encrypt(args.data.signature) as any;
            }
          }
          const doc = await query(args);
          if (doc) {
            doc.content = decrypt(doc.content) as string;
            doc.signature = decrypt(doc.signature);
          }
          return doc;
        },
        async update({ args, query }) {
          if (args.data) {
            if (typeof args.data.content === "string") {
              args.data.content = encrypt(args.data.content) as any;
            }
            if (typeof args.data.signature === "string") {
              args.data.signature = encrypt(args.data.signature) as any;
            }
          }
          const doc = await query(args);
          if (doc) {
            doc.content = decrypt(doc.content) as string;
            doc.signature = decrypt(doc.signature);
          }
          return doc;
        },
        async updateMany({ args, query }) {
          if (args.data) {
            if (typeof args.data.content === "string") {
              args.data.content = encrypt(args.data.content) as any;
            }
            if (typeof args.data.signature === "string") {
              args.data.signature = encrypt(args.data.signature) as any;
            }
          }
          return query(args);
        },
        async findUnique({ args, query }) {
          const doc = await query(args);
          if (doc) {
            doc.content = decrypt(doc.content) as string;
            doc.signature = decrypt(doc.signature);
          }
          return doc;
        },
        async findFirst({ args, query }) {
          const doc = await query(args);
          if (doc) {
            doc.content = decrypt(doc.content) as string;
            doc.signature = decrypt(doc.signature);
          }
          return doc;
        },
        async findMany({ args, query }) {
          const docs = await query(args);
          if (Array.isArray(docs)) {
            return docs.map(doc => {
              if (doc) {
                doc.content = decrypt(doc.content) as string;
                doc.signature = decrypt(doc.signature);
              }
              return doc;
            });
          }
          return docs;
        }
      }
    }
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }
}

export const prisma = prismaInstance;

