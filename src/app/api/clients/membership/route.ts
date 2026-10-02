import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const tier = searchParams.get("tier");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const whereClause: any = {
      clinicId,
      isMember: true,
      deletedAt: null,
    };

    if (tier && tier !== "ALL") {
      whereClause.membershipTier = tier;
    }

    if (status && status !== "ALL") {
      whereClause.membershipStatus = status;
    }

    if (search && search.trim().length > 0) {
      const q = search.trim();
      whereClause.OR = [
        { memberNumber: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { dniNif: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    const members = await prisma.client.findMany({
      where: whereClause,
      orderBy: [
        { memberNumber: "asc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        clientNumber: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        dniNif: true,
        birthDate: true,
        gender: true,
        address: true,
        isMember: true,
        memberNumber: true,
        membershipDate: true,
        membershipTier: true,
        membershipStatus: true,
        membershipPoints: true,
        createdAt: true,
      },
    });

    // Calculate aggregated Executive KPIs for the Loyalty Club
    const allClinicMembers = await prisma.client.findMany({
      where: {
        clinicId,
        isMember: true,
        deletedAt: null,
      },
      select: {
        id: true,
        membershipTier: true,
        membershipStatus: true,
        membershipPoints: true,
        membershipDate: true,
        createdAt: true,
      },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalMembers = allClinicMembers.length;
    const activeMembers = allClinicMembers.filter(
      (m: { membershipStatus: string | null }) => (m.membershipStatus || "ACTIVE") === "ACTIVE"
    ).length;
    const activePercent = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 100;

    const vipGoldMembers = allClinicMembers.filter((m: { membershipTier: string | null }) => {
      const t = (m.membershipTier || "").toUpperCase();
      return t === "VIP" || t === "GOLD" || t === "PLATINUM" || t.includes("VIP") || t.includes("GOLD");
    }).length;

    const totalPoints = allClinicMembers.reduce(
      (acc: number, m: { membershipPoints: number | null }) => acc + (m.membershipPoints || 0),
      0
    );

    const newThisMonth = allClinicMembers.filter((m: { membershipDate: Date | null; createdAt: Date }) => {
      const regDate = m.membershipDate ? new Date(m.membershipDate) : new Date(m.createdAt);
      return regDate >= startOfMonth;
    }).length;

    const tierDistribution: Record<string, number> = {
      VIP: 0,
      GOLD: 0,
      PLATINUM: 0,
      ESTÁNDAR: 0,
      OTROS: 0,
    };

    allClinicMembers.forEach((m: { membershipTier: string | null }) => {
      const t = (m.membershipTier || "ESTÁNDAR").toUpperCase();
      if (t === "VIP") tierDistribution.VIP++;
      else if (t === "GOLD") tierDistribution.GOLD++;
      else if (t === "PLATINUM") tierDistribution.PLATINUM++;
      else if (t === "ESTÁNDAR" || t === "ESTANDAR") tierDistribution.ESTÁNDAR++;
      else tierDistribution.OTROS++;
    });

    const stats = {
      totalMembers,
      activeMembers,
      activePercent,
      vipGoldMembers,
      totalPoints,
      newThisMonth,
      tierDistribution,
    };

    return NextResponse.json({
      members,
      stats,
    });
  } catch (error: any) {
    console.error("Error fetching loyalty members:", error);
    return NextResponse.json(
      { error: "Error al obtener socios", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientId,
      clinicId,
      memberNumber,
      membershipTier = "ESTÁNDAR",
      membershipStatus = "ACTIVE",
      membershipPoints = 0,
      membershipDate,
    } = body;

    if (!clientId || !clinicId) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios (clientId, clinicId)" },
        { status: 400 }
      );
    }

    // Check if client exists
    const existingClient = await prisma.client.findFirst({
      where: { id: clientId, clinicId },
    });

    if (!existingClient) {
      return NextResponse.json(
        { error: "Paciente no encontrado en esta clínica" },
        { status: 404 }
      );
    }

    let assignedNumber = memberNumber ? String(memberNumber).trim() : "";

    // Check duplicate member number in clinic if specified
    if (assignedNumber) {
      const duplicateNum = await prisma.client.findFirst({
        where: {
          clinicId,
          isMember: true,
          memberNumber: assignedNumber,
          id: { not: clientId },
        },
      });

      if (duplicateNum) {
        return NextResponse.json(
          { error: `El número de socio '${assignedNumber}' ya está en uso por ${duplicateNum.firstName} ${duplicateNum.lastName}` },
          { status: 409 }
        );
      }
    } else {
      // Auto-generate sequential M00001 if not provided
      const existingMembers = await prisma.client.findMany({
        where: { clinicId, isMember: true },
        select: { memberNumber: true },
      });

      const maxNum = existingMembers.reduce((max: number, m: any) => {
        if (m.memberNumber && m.memberNumber.startsWith("M")) {
          const num = parseInt(m.memberNumber.substring(1), 10);
          return !isNaN(num) && num > max ? num : max;
        }
        return max;
      }, 0);

      const nextVal = maxNum + 1;
      assignedNumber = `M${nextVal.toString().padStart(5, "0")}`;
    }

    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        isMember: true,
        memberNumber: assignedNumber,
        membershipDate: membershipDate ? new Date(membershipDate) : new Date(),
        membershipTier: membershipTier || "ESTÁNDAR",
        membershipStatus: membershipStatus || "ACTIVE",
        membershipPoints: Number(membershipPoints) || 0,
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error: any) {
    console.error("Error registering loyalty member:", error);
    return NextResponse.json(
      { error: "Error al dar de alta como socio", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      clientId,
      memberNumber,
      membershipTier,
      membershipStatus,
      membershipPoints,
      membershipDate,
    } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "Falta clientId para actualizar el socio" },
        { status: 400 }
      );
    }

    const currentClient = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!currentClient) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }

    // If changing memberNumber, ensure no collision within the same clinic
    if (memberNumber && memberNumber !== currentClient.memberNumber) {
      const duplicateNum = await prisma.client.findFirst({
        where: {
          clinicId: currentClient.clinicId,
          isMember: true,
          memberNumber: String(memberNumber).trim(),
          id: { not: clientId },
        },
      });

      if (duplicateNum) {
        return NextResponse.json(
          { error: `El número de socio '${memberNumber}' ya está en uso por otro paciente (${duplicateNum.firstName} ${duplicateNum.lastName})` },
          { status: 409 }
        );
      }
    }

    const updateData: any = {};
    if (memberNumber !== undefined) updateData.memberNumber = String(memberNumber).trim();
    if (membershipTier !== undefined) updateData.membershipTier = membershipTier;
    if (membershipStatus !== undefined) updateData.membershipStatus = membershipStatus;
    if (membershipPoints !== undefined) updateData.membershipPoints = Number(membershipPoints) || 0;
    if (membershipDate !== undefined) updateData.membershipDate = new Date(membershipDate);

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating loyalty member:", error);
    return NextResponse.json(
      { error: "Error al actualizar datos del socio", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientIdParam = searchParams.get("clientId");

    let clientId = clientIdParam;
    if (!clientId) {
      try {
        const body = await request.json();
        clientId = body?.clientId;
      } catch {
        // Ignored if body is empty
      }
    }

    if (!clientId) {
      return NextResponse.json(
        { error: "Falta clientId para dar de baja la membresía" },
        { status: 400 }
      );
    }

    const existingClient = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!existingClient) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }

    // Safely unenroll member WITHOUT deleting client record
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        isMember: false,
        membershipStatus: "CANCELLED",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Membresía de ${updated.firstName} ${updated.lastName} cancelada correctamente`,
      client: updated,
    });
  } catch (error: any) {
    console.error("Error cancelling membership:", error);
    return NextResponse.json(
      { error: "Error al dar de baja la membresía", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
