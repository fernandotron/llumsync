import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";

// PUT /api/fiscal-profiles/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta ID de perfil fiscal" }, { status: 400 });
    }

    const existing = await prisma.fiscalProfile.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Perfil fiscal no encontrado" }, { status: 404 });
    }

    const auth = await authenticateApiRequest(existing.clinicId);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const body = await request.json();

    const updateData: any = {};
    if (body.entityType !== undefined) updateData.entityType = body.entityType;
    if (body.comercialName !== undefined) updateData.comercialName = body.comercialName;
    if (body.nif !== undefined) updateData.nif = body.nif;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.municipality !== undefined) updateData.municipality = body.municipality;
    if (body.postalCode !== undefined) updateData.postalCode = body.postalCode;
    if (body.logo !== undefined) updateData.logo = body.logo;
    if (body.irpf !== undefined) updateData.irpf = parseFloat(body.irpf) || 0;
    if (body.creditorSuffix !== undefined) updateData.creditorSuffix = body.creditorSuffix;
    if (body.iban !== undefined) updateData.iban = body.iban;
    if (body.bicSwift !== undefined) updateData.bicSwift = body.bicSwift;
    if (body.serieFacturaOrdinaria !== undefined) updateData.serieFacturaOrdinaria = body.serieFacturaOrdinaria;
    if (body.serieRectificadaOrdinaria !== undefined) updateData.serieRectificadaOrdinaria = body.serieRectificadaOrdinaria;
    if (body.serieFacturaSimplificada !== undefined) updateData.serieFacturaSimplificada = body.serieFacturaSimplificada;
    if (body.serieRectificadaSimplificada !== undefined) updateData.serieRectificadaSimplificada = body.serieRectificadaSimplificada;
    if (body.footerNotes !== undefined) updateData.footerNotes = body.footerNotes;
    if (body.footerNotesSimplified !== undefined) updateData.footerNotesSimplified = body.footerNotesSimplified;
    if (body.firma !== undefined) updateData.firma = body.firma;
    if (body.sello !== undefined) updateData.sello = body.sello;

    const profile = await prisma.fiscalProfile.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error updating fiscal profile:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// DELETE /api/fiscal-profiles/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta ID de perfil fiscal" }, { status: 400 });
    }

    const existing = await prisma.fiscalProfile.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Perfil fiscal no encontrado" }, { status: 404 });
    }

    const auth = await authenticateApiRequest(existing.clinicId);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    await prisma.fiscalProfile.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fiscal profile:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
