import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const config = await prisma.loyaltyTemplate.findUnique({
      where: { clinicId },
    });

    if (!config) {
      return NextResponse.json({
        activeTemplateId: "preset-gold",
        templates: [],
      });
    }

    let parsedTemplates: any[] = [];
    try {
      parsedTemplates = JSON.parse(config.templates || "[]");
    } catch {
      parsedTemplates = [];
    }

    return NextResponse.json({
      activeTemplateId: config.activeTemplateId || "preset-gold",
      templates: parsedTemplates,
    });
  } catch (error: any) {
    console.error("Error fetching loyalty templates:", error);
    return NextResponse.json(
      { error: "Error al obtener plantillas de fidelización", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinicId, activeTemplateId, templates } = body;

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const templatesStr = typeof templates === "string" ? templates : JSON.stringify(Array.isArray(templates) ? templates : []);
    const validActiveId = typeof activeTemplateId === "string" && activeTemplateId.trim().length > 0
      ? activeTemplateId
      : "preset-gold";

    const saved = await prisma.loyaltyTemplate.upsert({
      where: { clinicId },
      update: {
        activeTemplateId: validActiveId,
        templates: templatesStr,
      },
      create: {
        clinicId,
        activeTemplateId: validActiveId,
        templates: templatesStr,
      },
    });

    let returnTemplates: any[] = [];
    try {
      returnTemplates = JSON.parse(saved.templates || "[]");
    } catch {
      returnTemplates = [];
    }

    return NextResponse.json({
      success: true,
      activeTemplateId: saved.activeTemplateId,
      templates: returnTemplates,
    });
  } catch (error: any) {
    console.error("Error saving loyalty templates:", error);
    return NextResponse.json(
      { error: "Error al guardar plantillas de fidelización", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
