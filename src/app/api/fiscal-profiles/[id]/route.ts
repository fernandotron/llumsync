import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PUT /api/fiscal-profiles/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const profile = await prisma.fiscalProfile.update({
      where: { id },
      data: {
        entityType: body.entityType,
        comercialName: body.comercialName,
        nif: body.nif,
        address: body.address,
        municipality: body.municipality,
        postalCode: body.postalCode,
        logo: body.logo,
        irpf: body.irpf,
        creditorSuffix: body.creditorSuffix,
        iban: body.iban,
        bicSwift: body.bicSwift,
        serieFacturaOrdinaria: body.serieFacturaOrdinaria,
        serieRectificadaOrdinaria: body.serieRectificadaOrdinaria,
        serieFacturaSimplificada: body.serieFacturaSimplificada,
        serieRectificadaSimplificada: body.serieRectificadaSimplificada,
        footerNotes: body.footerNotes,
        footerNotesSimplified: body.footerNotesSimplified,
        firma: body.firma,
        sello: body.sello,
      },
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

    await prisma.fiscalProfile.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fiscal profile:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
