import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const waitlist = await prisma.waitlistEntry.findMany({
      where: {
        clinicId: clinicId,
        status: "WAITING",
      },
      include: {
        client: true,
        user: true,
        service: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(waitlist);
  } catch (error) {
    console.error("Error fetching waitlist:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, userId, serviceId, clinicId, notes, preferredDayOfWeek, preferredTimeRange } = body;

    if (!clientId || !clinicId) {
      return NextResponse.json({ error: "Falta clientId o clinicId" }, { status: 400 });
    }

    const waitlistEntry = await prisma.waitlistEntry.create({
      data: {
        clientId,
        userId: userId || null,
        serviceId: serviceId || null,
        clinicId,
        notes: notes || "",
        preferredDayOfWeek: preferredDayOfWeek !== undefined ? Number(preferredDayOfWeek) : null,
        preferredTimeRange: preferredTimeRange || null,
        status: "WAITING",
      },
      include: {
        client: true,
        user: true,
        service: true,
      },
    });

    return NextResponse.json(waitlistEntry);
  } catch (error) {
    console.error("Error creating waitlist entry:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
