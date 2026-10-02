import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";

// GET /api/fiscal-profiles?clinicId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "clinicId requerido" }, { status: 400 });
    }

    const auth = await authenticateApiRequest(clinicId);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const profiles = await prisma.fiscalProfile.findMany({
      where: { clinicId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(profiles);
  } catch (error) {
    console.error("Error fetching fiscal profiles:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST /api/fiscal-profiles
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinicId, ...rest } = body;

    if (!clinicId) {
      return NextResponse.json({ error: "clinicId requerido" }, { status: 400 });
    }

    const auth = await authenticateApiRequest(clinicId);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const profile = await prisma.fiscalProfile.create({
      data: {
        clinicId,
        entityType: rest.entityType || "Empresa",
        comercialName: rest.comercialName || "",
        nif: rest.nif || "",
        address: rest.address || "",
        municipality: rest.municipality || "",
        postalCode: rest.postalCode || "",
        logo: rest.logo || "",
        irpf: rest.irpf !== undefined ? parseFloat(rest.irpf) || 0 : 0,
        creditorSuffix: rest.creditorSuffix || "0000",
        iban: rest.iban || "",
        bicSwift: rest.bicSwift || "",
        serieFacturaOrdinaria: rest.serieFacturaOrdinaria || "",
        serieRectificadaOrdinaria: rest.serieRectificadaOrdinaria || "",
        serieFacturaSimplificada: rest.serieFacturaSimplificada || "",
        serieRectificadaSimplificada: rest.serieRectificadaSimplificada || "",
        footerNotes: rest.footerNotes || "",
        footerNotesSimplified: rest.footerNotesSimplified || "",
        firma: rest.firma || "",
        sello: rest.sello || "",
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error creating fiscal profile:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
