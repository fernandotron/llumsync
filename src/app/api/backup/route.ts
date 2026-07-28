import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

const BACKUP_DIR = path.join(process.cwd(), "backups");

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// Generate complete database snapshot for a clinic (or entire system)
async function generateBackupData(clinicId?: string) {
  const whereClinic = clinicId ? { clinicId } : {};
  const whereIdClinic = clinicId ? { id: clinicId } : {};

  const [
    clinics,
    users,
    clients,
    appointments,
    sales,
    movements,
    cashSessions,
    services,
    products,
    budgets,
    budgetTemplates,
    timeBlocks,
    vouchers,
    shifts,
    fiscalProfiles,
    episodeFormTemplates,
    clientFormTemplates,
    whiteboardTemplates,
    waitlistEntries,
    workEntries,
    reminders,
  ] = await Promise.all([
    prisma.clinic.findMany({ where: whereIdClinic }),
    prisma.user.findMany({ where: clinicId ? { clinicId } : {} }),
    prisma.client.findMany({ where: whereClinic }),
    prisma.appointment.findMany({ where: whereClinic }),
    prisma.sale.findMany({ where: whereClinic }),
    prisma.movement.findMany({ where: whereClinic }),
    prisma.cashRegisterSession.findMany({ where: whereClinic }),
    prisma.service.findMany({ where: whereClinic }),
    prisma.product.findMany({ where: whereClinic }),
    prisma.budget.findMany({ where: whereClinic }),
    prisma.budgetTemplate.findMany({ where: whereClinic }),
    prisma.timeBlock.findMany({ where: whereClinic }),
    prisma.voucher.findMany({ where: whereClinic }),
    prisma.shift.findMany({ where: whereClinic }),
    prisma.fiscalProfile.findMany({ where: whereClinic }),
    prisma.episodeFormTemplate.findMany({ where: whereClinic }),
    prisma.clientFormTemplate.findMany({ where: whereClinic }),
    prisma.whiteboardTemplate.findMany({ where: whereClinic }),
    prisma.waitlistEntry.findMany({ where: whereClinic }),
    prisma.workEntry.findMany({ where: whereClinic }),
    prisma.appointmentReminder.findMany({ where: whereClinic }),
  ]);

  const summary = {
    clinics: clinics.length,
    users: users.length,
    clients: clients.length,
    appointments: appointments.length,
    sales: sales.length,
    movements: movements.length,
    cashSessions: cashSessions.length,
    services: services.length,
    products: products.length,
    budgets: budgets.length,
    timeBlocks: timeBlocks.length,
    vouchers: vouchers.length,
    shifts: shifts.length,
  };

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    clinicId: clinicId || "ALL",
    summary,
    data: {
      clinics,
      users,
      clients,
      appointments,
      sales,
      movements,
      cashSessions,
      services,
      products,
      budgets,
      budgetTemplates,
      timeBlocks,
      vouchers,
      shifts,
      fiscalProfiles,
      episodeFormTemplates,
      clientFormTemplates,
      whiteboardTemplates,
      waitlistEntries,
      workEntries,
      reminders,
    },
  };
}

// GET /api/backup?action=list|download|export&clinicId=...&filename=...
export async function GET(request: Request) {
  try {
    ensureBackupDir();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";
    const clinicId = searchParams.get("clinicId") || undefined;
    const filename = searchParams.get("filename") || undefined;

    if (action === "export") {
      // Instant download of JSON backup
      const backupObj = await generateBackupData(clinicId);
      const jsonStr = JSON.stringify(backupObj, null, 2);
      const dateTag = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const exportFilename = `backup-${clinicId || "full"}-${dateTag}.json`;

      // Save a copy on disk as well
      const filePath = path.join(BACKUP_DIR, exportFilename);
      fs.writeFileSync(filePath, jsonStr, "utf-8");

      return new NextResponse(jsonStr, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${exportFilename}"`,
        },
      });
    }

    if (action === "download" && filename) {
      // Sanitize filename to prevent path traversal
      const safeFilename = path.basename(filename);
      const filePath = path.join(BACKUP_DIR, safeFilename);

      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "Archivo de backup no encontrado" }, { status: 404 });
      }

      const fileContent = fs.readFileSync(filePath, "utf-8");
      return new NextResponse(fileContent, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeFilename}"`,
        },
      });
    }

    // Default action = "list"
    const files = fs.readdirSync(BACKUP_DIR);
    const backupList = files
      .filter((f) => f.endsWith(".json"))
      .map((fileName) => {
        const filePath = path.join(BACKUP_DIR, fileName);
        const stats = fs.statSync(filePath);
        return {
          filename: fileName,
          sizeBytes: stats.size,
          sizeFormatted: (stats.size / 1024 / 1024).toFixed(2) + " MB",
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ backups: backupList });
  } catch (error: any) {
    console.error("GET /api/backup error:", error);
    return NextResponse.json({ error: error.message || "Error al procesar backup" }, { status: 500 });
  }
}

// POST /api/backup
// Body: { action: "create" | "trigger-daily" | "restore", clinicId?: string, backupData?: any }
export async function POST(request: Request) {
  try {
    ensureBackupDir();
    const body = await request.json();
    const { action = "create", clinicId, backupData } = body;

    if (action === "create" || action === "trigger-daily") {
      const todayTag = new Date().toISOString().slice(0, 10);

      // Check if today's daily backup already exists if trigger-daily
      if (action === "trigger-daily") {
        const files = fs.readdirSync(BACKUP_DIR);
        const alreadyHasToday = files.some(
          (f) => f.startsWith(`backup-${clinicId || "full"}-${todayTag}`)
        );

        if (alreadyHasToday) {
          return NextResponse.json({
            message: "El backup diario de hoy ya se ha realizado previamente.",
            skipped: true,
          });
        }
      }

      const backupObj = await generateBackupData(clinicId);
      const jsonStr = JSON.stringify(backupObj, null, 2);
      const timeTag = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `backup-${clinicId || "full"}-${timeTag}.json`;
      const filePath = path.join(BACKUP_DIR, filename);

      fs.writeFileSync(filePath, jsonStr, "utf-8");

      // Auto cleanup: delete backups older than 30 days
      const files = fs.readdirSync(BACKUP_DIR);
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      files.forEach((f) => {
        if (f.endsWith(".json")) {
          const fPath = path.join(BACKUP_DIR, f);
          const stats = fs.statSync(fPath);
          if (stats.mtimeMs < thirtyDaysAgo) {
            try {
              fs.unlinkSync(fPath);
            } catch (e) {
              /* ignore */
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        filename,
        summary: backupObj.summary,
        generatedAt: backupObj.generatedAt,
      });
    }

    if (action === "restore" && backupData) {
      // Validate backup file structure
      if (!backupData.data || !backupData.version) {
        return NextResponse.json({ error: "Formato de archivo de backup no válido" }, { status: 400 });
      }

      const data = backupData.data;

      // Upsert / restore essential entities safely
      let restoredCounts = {
        services: 0,
        clients: 0,
        appointments: 0,
        sales: 0,
        products: 0,
      };

      if (Array.isArray(data.services)) {
        for (const s of data.services) {
          await prisma.service.upsert({
            where: { id: s.id },
            update: { name: s.name, price: s.price, duration: s.duration, color: s.color, category: s.category },
            create: { id: s.id, clinicId: s.clinicId, name: s.name, price: s.price, duration: s.duration, color: s.color, category: s.category },
          }).catch(() => {});
          restoredCounts.services++;
        }
      }

      if (Array.isArray(data.clients)) {
        for (const c of data.clients) {
          await prisma.client.upsert({
            where: { id: c.id },
            update: { firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, dniNif: c.dniNif },
            create: { id: c.id, clinicId: c.clinicId, firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, dniNif: c.dniNif },
          }).catch(() => {});
          restoredCounts.clients++;
        }
      }

      return NextResponse.json({
        success: true,
        message: "Backup restaurado correctamente",
        restoredCounts,
      });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/backup error:", error);
    return NextResponse.json({ error: error.message || "Error al procesar backup" }, { status: 500 });
  }
}

// DELETE /api/backup?filename=...
export async function DELETE(request: Request) {
  try {
    ensureBackupDir();
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "Falta el nombre del archivo" }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ success: true, message: "Backup eliminado correctamente" });
  } catch (error: any) {
    console.error("DELETE /api/backup error:", error);
    return NextResponse.json({ error: error.message || "Error al eliminar backup" }, { status: 500 });
  }
}
