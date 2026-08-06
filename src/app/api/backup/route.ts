import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";
import { BACKUP_DIR, ensureBackupDir, generateBackupData, createDailyBackup } from "@/lib/backup";

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
      const result = await createDailyBackup(clinicId);
      return NextResponse.json(result);
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
