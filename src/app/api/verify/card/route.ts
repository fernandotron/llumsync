import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PRESET_TEMPLATES } from "@/components/LoyaltyCardDesigner";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberCode = searchParams.get("member");

    if (!memberCode) {
      return NextResponse.json({ error: "Código de socio no especificado" }, { status: 400 });
    }

    // Find member by memberNumber
    const member = await prisma.client.findFirst({
      where: {
        memberNumber: {
          equals: memberCode,
          mode: "insensitive",
        },
        isMember: true,
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            logo: true,
            address: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada o socio no activo", valid: false },
        { status: 404 }
      );
    }

    // Fetch clinic templates store from API or fallback preset
    let activeTemplate = PRESET_TEMPLATES[0];
    try {
      const clinicId = member.clinicId;
      const tplRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/loyalty/templates?clinicId=${clinicId}`,
        { next: { revalidate: 0 } }
      );
      if (tplRes.ok) {
        const tplData = await tplRes.json();
        if (tplData && tplData.activeTemplateId) {
          const allTpls = [...PRESET_TEMPLATES, ...(tplData.templates || [])];
          activeTemplate =
            allTpls.find((t) => t.id === tplData.activeTemplateId) || PRESET_TEMPLATES[0];
        }
      }
    } catch (e) {
      console.warn("Using fallback template for verification:", e);
    }

    return NextResponse.json({
      valid: true,
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        memberNumber: member.memberNumber,
        dniNif: member.dniNif,
        membershipDate: member.membershipDate || member.createdAt,
      },
      clinic: member.clinic,
      template: activeTemplate,
    });
  } catch (error: any) {
    console.error("Error verifying loyalty card:", error);
    return NextResponse.json(
      { error: "Error en la verificación de tarjeta", valid: false },
      { status: 500 }
    );
  }
}
