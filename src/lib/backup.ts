import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

export const BACKUP_DIR = path.join(process.cwd(), "backups");

export function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export async function generateBackupData(clinicId?: string) {
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

export async function createDailyBackup(clinicId?: string) {
  ensureBackupDir();
  const todayTag = new Date().toISOString().slice(0, 10);
  const targetClinicTag = clinicId && clinicId !== "ALL" ? clinicId : "full";
  const files = fs.readdirSync(BACKUP_DIR);
  const alreadyHasToday = files.some((f) => f.startsWith(`backup-${targetClinicTag}-${todayTag}`));

  if (alreadyHasToday) {
    return { skipped: true, message: "El backup diario de hoy ya existe." };
  }

  const backupObj = await generateBackupData(clinicId);
  const jsonStr = JSON.stringify(backupObj, null, 2);
  const timeTag = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `backup-${targetClinicTag}-${timeTag}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  fs.writeFileSync(filePath, jsonStr, "utf-8");

  // Auto cleanup backups older than 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  files.forEach((f) => {
    if (f.endsWith(".json")) {
      const fPath = path.join(BACKUP_DIR, f);
      try {
        const stats = fs.statSync(fPath);
        if (stats.mtimeMs < thirtyDaysAgo) {
          fs.unlinkSync(fPath);
        }
      } catch (e) {
        /* ignore */
      }
    }
  });

  return { success: true, filename, summary: backupObj.summary, generatedAt: backupObj.generatedAt };
}
