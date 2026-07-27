import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const members = await prisma.client.findMany({
      where: {
        clinicId,
        isMember: true,
      },
      orderBy: { memberNumber: "asc" },
    });

    return NextResponse.json(members);
  } catch (error: any) {
    console.error("Error fetching loyalty members:", error);
    return NextResponse.json({ error: "Error al obtener socios", details: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, clinicId, memberNumber } = body;

    if (!clientId || !clinicId) {
      return NextResponse.json({ error: "Faltan datos obligatorios (clientId, clinicId)" }, { status: 400 });
    }

    let assignedNumber = memberNumber;

    // Auto-generate sequential M000XX if not provided
    if (!assignedNumber) {
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
        membershipDate: new Date(),
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error: any) {
    console.error("Error registering loyalty member:", error);
    return NextResponse.json({ error: "Error al dar de alta como socio", details: error?.message || String(error) }, { status: 500 });
  }
}
