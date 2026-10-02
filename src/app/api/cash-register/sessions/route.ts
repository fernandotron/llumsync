import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const auth = await authenticateApiRequest(clinicId);
    if ("errorResponse" in auth) return auth.errorResponse;

    const sessions = await prisma.cashRegisterSession.findMany({
      where: {
        clinicId,
        status: "CLOSED",
      },
      orderBy: { closedAt: "desc" },
      take: 60,
    });

    // Collect all user IDs involved
    const userIds = new Set<string>();
    sessions.forEach((s: any) => {
      if (s.openedByUserId) userIds.add(s.openedByUserId);
      if (s.closedByUserId) userIds.add(s.closedByUserId);
    });

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, name: true, role: true },
    });

    const userMap = new Map(users.map((u: any) => [u.id, u]));

    const enrichedSessions = sessions.map((s: any) => ({
      ...s,
      openedByUser: s.openedByUserId ? userMap.get(s.openedByUserId) || null : null,
      closedByUser: s.closedByUserId ? userMap.get(s.closedByUserId) || null : null,
    }));

    return NextResponse.json(enrichedSessions);
  } catch (error: any) {
    console.error("Error fetching closed cash register sessions:", error);
    return NextResponse.json(
      { error: "Error interno al recuperar el historial de caja", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
