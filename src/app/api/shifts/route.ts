import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, clinicId, startDate, endDate, mode } = body;

    if (!userId || !clinicId) {
      return NextResponse.json({ error: "Faltan userId o clinicId" }, { status: 400 });
    }

    if (mode === "delete") {
      const { dayOfWeek } = body;
      await prisma.shift.deleteMany({
        where: {
          userId,
          clinicId,
          dayOfWeek: Number(dayOfWeek),
        },
      });
      return NextResponse.json({ success: true });
    }

    if (mode === "single") {
      const { dayOfWeek, startTime, endTime } = body;
      
      // Delete existing weekly shift for this day of the week
      await prisma.shift.deleteMany({
        where: {
          userId,
          clinicId,
          dayOfWeek: Number(dayOfWeek),
        },
      });

      const newShift = await prisma.shift.create({
        data: {
          userId,
          clinicId,
          dayOfWeek: Number(dayOfWeek),
          startTime,
          endTime,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        },
      });

      return NextResponse.json(newShift);
    }

    if (mode === "bulk") {
      const { shifts } = body;
      if (!Array.isArray(shifts)) {
        return NextResponse.json({ error: "shifts debe ser un array" }, { status: 400 });
      }

      const daysToUpdate = shifts.map((s) => Number(s.dayOfWeek));
      
      // Delete existing weekly shifts for the days being updated
      await prisma.shift.deleteMany({
        where: {
          userId,
          clinicId,
          dayOfWeek: { in: daysToUpdate },
        },
      });

      const createdShifts = [];
      for (const s of shifts) {
        if (s.active) {
          const newShift = await prisma.shift.create({
            data: {
              userId,
              clinicId,
              dayOfWeek: Number(s.dayOfWeek),
              startTime: s.startTime || "09:00",
              endTime: s.endTime || "18:00",
              startDate: startDate ? new Date(startDate) : null,
              endDate: endDate ? new Date(endDate) : null,
            },
          });
          createdShifts.push(newShift);
        }
      }

      return NextResponse.json({ success: true, count: createdShifts.length });
    }

    return NextResponse.json({ error: "Modo no soportado" }, { status: 400 });
  } catch (error) {
    console.error("Error updating shifts:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
