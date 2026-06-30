import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Helper: check if date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// GET /api/control-horario
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const clinicId = searchParams.get("clinicId");
    const todayOnly = searchParams.get("todayOnly") === "true";
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    // 1. Get today's active status for a specific user
    if (todayOnly && userId) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const activeEntry = await prisma.workEntry.findFirst({
        where: {
          userId,
          clinicId,
          clockIn: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        orderBy: { clockIn: "desc" },
      });

      return NextResponse.json(activeEntry);
    }

    // 2. Query history (Admin panel or user history list)
    const whereClause: any = { clinicId };
    if (userId) {
      whereClause.userId = userId;
    }

    if (startDateStr && endDateStr) {
      whereClause.clockIn = {
        gte: new Date(startDateStr),
        lte: new Date(endDateStr),
      };
    }

    const entries = await prisma.workEntry.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { clockIn: "desc" },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching work entries:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST /api/control-horario (CLOCK IN)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, clinicId, notes } = body;

    if (!userId || !clinicId) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    // Check if there is an active session (clockOut is null)
    const activeEntry = await prisma.workEntry.findFirst({
      where: {
        userId,
        clinicId,
        clockOut: null,
      },
    });

    if (activeEntry) {
      return NextResponse.json({ error: "Ya tienes una jornada activa en curso" }, { status: 400 });
    }

    const entry = await prisma.workEntry.create({
      data: {
        userId,
        clinicId,
        clockIn: new Date(),
        inNotes: notes || null,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error during clock in:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// PATCH /api/control-horario (CLOCK OUT OR BREAKS)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action, notes } = body; // id of the WorkEntry

    if (!id || !action) {
      return NextResponse.json({ error: "Faltan ID de registro o acción" }, { status: 400 });
    }

    const entry = await prisma.workEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    const now = new Date();
    const updateData: any = {};

    if (action === "BREAK_START") {
      if (entry.breakStart) {
        return NextResponse.json({ error: "Ya estás en un descanso" }, { status: 400 });
      }
      updateData.breakStart = now;
    } 
    else if (action === "BREAK_END") {
      if (!entry.breakStart) {
        return NextResponse.json({ error: "No tienes un descanso activo" }, { status: 400 });
      }
      // Calculate minutes difference
      const diffMs = now.getTime() - new Date(entry.breakStart).getTime();
      const diffMins = Math.round(diffMs / 1000 / 60);

      updateData.breakStart = null;
      updateData.totalBreaksMinutes = entry.totalBreaksMinutes + diffMins;
    } 
    else if (action === "CLOCK_OUT") {
      if (entry.clockOut) {
        return NextResponse.json({ error: "Jornada ya cerrada previamente" }, { status: 400 });
      }
      
      // If there was an active break, close it first
      let additionalMinutes = 0;
      if (entry.breakStart) {
        const diffMs = now.getTime() - new Date(entry.breakStart).getTime();
        additionalMinutes = Math.round(diffMs / 1000 / 60);
        updateData.breakStart = null;
      }

      updateData.clockOut = now;
      updateData.totalBreaksMinutes = entry.totalBreaksMinutes + additionalMinutes;
      updateData.outNotes = notes || null;
    } 
    else {
      return NextResponse.json({ error: "Acción no permitida" }, { status: 400 });
    }

    const updated = await prisma.workEntry.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating work entry:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
