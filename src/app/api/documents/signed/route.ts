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

    const signedDoc = await prisma.signedDocument.create({
      data: {
        id: docId,
        clientId,
        name,
        content,
        signature: signature || null,
        pin: pin || null,
        createdAt: now,
      },
    });

    return NextResponse.json(signedDoc);
  } catch (error) {
    console.error("Error saving signed document:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
