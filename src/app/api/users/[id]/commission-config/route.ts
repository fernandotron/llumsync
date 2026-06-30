import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/users/[id]/commission-config?clinicId=...
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const config = await prisma.userCommissionConfig.findUnique({
      where: {
        userId_clinicId: {
          userId,
          clinicId,
        },
      },
    });

    // Si no existe, devolvemos una configuración por defecto inicial
    if (!config) {
      return NextResponse.json({
        userId,
        clinicId,
        defaultType: "PERCENTAGE",
        defaultValue: 0,
        overridesJson: "{}",
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching user commission config:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST /api/users/[id]/commission-config
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const body = await request.json();
    const { clinicId, defaultType, defaultValue, overridesJson } = body;

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const config = await prisma.userCommissionConfig.upsert({
      where: {
        userId_clinicId: {
          userId,
          clinicId,
        },
      },
      update: {
        defaultType: defaultType || "PERCENTAGE",
        defaultValue: parseFloat(defaultValue) || 0,
        overridesJson: overridesJson || "{}",
      },
      create: {
        userId,
        clinicId,
        defaultType: defaultType || "PERCENTAGE",
        defaultValue: parseFloat(defaultValue) || 0,
        overridesJson: overridesJson || "{}",
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error saving user commission config:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
