import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, name, content, signature, pin } = body;

    if (!clientId || !name || !content) {
      return NextResponse.json({ error: "Faltan datos obligatorios para el documento firmado" }, { status: 400 });
    }

    const docId = crypto.randomUUID();
    const now = new Date();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "SignedDocument" ("id", "clientId", "name", "content", "signature", "pin", "createdAt")
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      docId,
      clientId,
      name,
      content,
      signature || null,
      pin || null,
      now
    );

    const rows: any = await prisma.$queryRawUnsafe(
      `SELECT * FROM "SignedDocument" WHERE "id" = ?`,
      docId
    );

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error saving signed document:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
