import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";
import { logEhrAccess } from "@/lib/auditLogger";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await authenticateApiRequest();
    if ("errorResponse" in auth) return auth.errorResponse;
    if (auth.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere rol de Administrador para solicitar la supresión de registros." },
        { status: 403 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, clinicId: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // Check Legal Retention Requirements:
    // 1. Ley 58/2003 General Tributaria & Ley 11/2021 (Tax Invoices retention: 4-6 years minimum)
    const saleCount = await prisma.sale.count({ where: { clientId: id } });
    if (saleCount > 0) {
      await logEhrAccess({
        clientId: id,
        userId: auth.user.id,
        userName: auth.user.name,
        action: "DELETE_ATTEMPT",
        details: `Bloqueada eliminación física: Existen ${saleCount} facturas emitidas bajo Ley 58/2003`,
        clinicId: client.clinicId,
      });

      return NextResponse.json(
        {
          error: "LEGAL_RETENTION_INVOICES",
          message: `Imposible eliminar permanentemente el cliente: Existen ${saleCount} facturas o ventas emitidas. Según la Ley 58/2003 General Tributaria y el RD 1007/2023 (Veri*Factu), las facturas deben conservarse de forma inalterable durante un mínimo de 4 a 6 años. Aplique bloqueo o anonimización RGPD sin destruir registros contables.`,
        },
        { status: 409 }
      );
    }

    // 2. Ley 41/2002 de Autonomía del Paciente (Medical consents & EHR retention: 5 years minimum)
    const signedDocCount = await prisma.signedDocument.count({ where: { clientId: id } });
    if (signedDocCount > 0) {
      await logEhrAccess({
        clientId: id,
        userId: auth.user.id,
        userName: auth.user.name,
        action: "DELETE_ATTEMPT",
        details: `Bloqueada eliminación física: Existen ${signedDocCount} consentimientos clínicos bajo Ley 41/2002`,
        clinicId: client.clinicId,
      });

      return NextResponse.json(
        {
          error: "LEGAL_RETENTION_CLINICAL",
          message: `Imposible eliminar permanentemente el cliente: Existen ${signedDocCount} documentos clínicos o consentimientos informados firmados. Conforme al artículo 17 de la Ley 41/2002, los centros sanitarios tienen la obligación legal de conservar la historia clínica durante al menos 5 años.`,
        },
        { status: 409 }
      );
    }

    // Audit log before physical deletion
    await logEhrAccess({
      clientId: id,
      userId: auth.user.id,
      userName: auth.user.name,
      action: "DELETE_ATTEMPT",
      details: `Eliminación física definitiva autorizada y ejecutada para el paciente ${client.firstName} ${client.lastName} (sin historial médico ni facturas vinculadas).`,
      clinicId: client.clinicId,
    });

    // Hard delete is safe only when no fiscal or clinical records are attached
    await prisma.client.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error permanently deleting client:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
