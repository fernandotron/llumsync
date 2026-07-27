import { NextResponse } from "next/server";

// In-memory / fallback store when DB schema doesn't have custom table yet
const clinicTemplatesStore: Record<string, { activeTemplateId: string; templates: any[] }> = {};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const data = clinicTemplatesStore[clinicId] || {
      activeTemplateId: "preset-gold",
      templates: [],
    };

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching loyalty templates:", error);
    return NextResponse.json({ error: "Error al obtener plantillas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinicId, activeTemplateId, templates } = body;

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    clinicTemplatesStore[clinicId] = {
      activeTemplateId: activeTemplateId || "preset-gold",
      templates: Array.isArray(templates) ? templates : [],
    };

    return NextResponse.json({
      success: true,
      activeTemplateId: clinicTemplatesStore[clinicId].activeTemplateId,
      templates: clinicTemplatesStore[clinicId].templates,
    });
  } catch (error: any) {
    console.error("Error saving loyalty templates:", error);
    return NextResponse.json({ error: "Error al guardar plantillas" }, { status: 500 });
  }
}
