import { prisma } from "@/lib/db";

export interface LogEhrAccessParams {
  clientId: string;
  userId?: string | null;
  userName?: string | null;
  action: "VIEW" | "UPDATE" | "EXPORT" | "DELETE_ATTEMPT" | "ALLERGY_OVERRIDE";
  details?: string | null;
  clinicId?: string | null;
  ipAddress?: string | null;
}

/**
 * Standard RGPD & Ley 41/2002 compliant audit logging for medical records (EHR).
 * Records every access, modification, export, or deletion attempt of patient records.
 */
export async function logEhrAccess({
  clientId,
  userId,
  userName,
  action,
  details,
  clinicId,
  ipAddress,
}: LogEhrAccessParams) {
  try {
    await prisma.ehrAuditLog.create({
      data: {
        clientId,
        userId: userId || null,
        userName: userName || null,
        action,
        details: details || null,
        clinicId: clinicId || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Error writing EHR audit log:", error);
  }
}
