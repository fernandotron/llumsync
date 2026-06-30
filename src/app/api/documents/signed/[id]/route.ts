import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/documents/signed/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const rows: any = await prisma.$queryRawUnsafe(
      `SELECT * FROM "SignedDocument" WHERE "id" = ?`,
      id
    );
    const signedDoc = rows[0];

    if (!signedDoc) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    // Fetch client details using standard Prisma
    const client = await prisma.client.findUnique({
      where: { id: signedDoc.clientId },
    });

    signedDoc.client = client;
    return NextResponse.json(signedDoc);
  } catch (error) {
    console.error("Error fetching signed document details:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// PUT /api/documents/signed/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { signature } = body;

    if (!signature) {
      return NextResponse.json({ error: "Falta la firma" }, { status: 400 });
    }

    const rowsBefore: any = await prisma.$queryRawUnsafe(
      `SELECT * FROM "SignedDocument" WHERE "id" = ?`,
      id
    );
    const signedDoc = rowsBefore[0];

    if (!signedDoc) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    if (signedDoc.signature) {
      return NextResponse.json({ error: "Este documento ya ha sido firmado anteriormente" }, { status: 400 });
    }

    // Reemplazar el marcador o badge HTML de firma digital por la imagen de la firma del paciente
    let updatedContent = signedDoc.content;
    const signatureImg = `
      <div style="text-align: center; display: inline-block;">
        <img src="${signature}" style="max-height: 90px; max-width: 180px; display: block;" alt="Firma Paciente" />
        <span style="font-size: 10px; color: #64748b; display: block; margin-top: 4px; font-family: sans-serif;">
          Firmado digitalmente por el Paciente el ${new Date().toLocaleDateString("es-ES")}
        </span>
      </div>
    `;

    const digitalBadgeRegex = /<span[^>]*data-type="digital"[^>]*>.*?<\/span>/gi;
    if (digitalBadgeRegex.test(updatedContent)) {
      updatedContent = updatedContent.replace(digitalBadgeRegex, signatureImg);
    } else if (updatedContent.includes("[Campo_firma_digital]")) {
      updatedContent = updatedContent.replaceAll("[Campo_firma_digital]", signatureImg);
    } else if (updatedContent.includes("<em>[Espacio de Firma Digital]</em>")) {
      updatedContent = updatedContent.replace("<em>[Espacio de Firma Digital]</em>", signatureImg);
    } else {
      updatedContent += `<br/><br/>` + signatureImg;
    }

    await prisma.signedDocument.update({
      where: { id },
      data: {
        signature,
        content: updatedContent,
      },
    });

    const rowsAfter: any = await prisma.$queryRawUnsafe(
      `SELECT * FROM "SignedDocument" WHERE "id" = ?`,
      id
    );

    return NextResponse.json(rowsAfter[0]);
  } catch (error) {
    console.error("Error updating signed document remotely:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.$executeRawUnsafe(
      `DELETE FROM "SignedDocument" WHERE "id" = ?`,
      id
    );

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("Error deleting signed document:", error);
    return NextResponse.json({ error: "Error en el servidor al intentar eliminar el documento" }, { status: 500 });
  }
}
