import { prisma } from "@/lib/db";

export interface AuditLogData {
  action: string;
  userId?: string | null;
  userName?: string | null;
  appointmentId?: string;
  previousValue?: string | null;
  newValue?: string | null;
}

/**
 * Creates an audit log entry in the system.
 */
export async function logAuditAction(data: AuditLogData): Promise<void> {
  try {
    await prisma.appointmentLog.create({
      data: {
        appointmentId: data.appointmentId || "SYSTEM",
        action: data.action,
        userId: data.userId || null,
        userName: data.userName || "Sistema",
        previousValue: data.previousValue ? String(data.previousValue) : null,
        newValue: data.newValue ? String(data.newValue) : null,
      },
    });
  } catch (error) {
    console.error("Error creating audit log entry:", error);
  }
}
