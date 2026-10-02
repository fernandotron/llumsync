import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get("userName") || "Sistema";
    const userId = searchParams.get("userId") || undefined;

    if (!id) {
      return NextResponse.json({ error: "Falta ID de cita" }, { status: 400 });
    }

    // Read current appointment before deleting
    const current = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: true,
        service: true,
      },
    });

    if (current && current.status === "COMPLETED") {
      // Revert consumables if completed appointment is soft deleted
      try {
        const consumibles = await prisma.serviceProduct.findMany({
          where: { serviceId: current.serviceId },
          include: { product: true },
        });

        for (const item of consumibles) {
          const currentStock = item.product.stock;
          const updatedStock = currentStock + item.quantity;

          await prisma.inventoryProduct.update({
            where: { id: item.productId },
            data: { stock: updatedStock },
          });

          const pacienteName = `${current.client?.firstName || ""} ${current.client?.lastName || ""}`.trim();
          await prisma.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: "DEVOLUCION",
              quantity: item.quantity,
              previousStock: currentStock,
              newStock: updatedStock,
              batchNumber: item.product.batchNumber,
              expirationDate: item.product.expirationDate,
              costPrice: item.product.costPrice,
              notes: `Devolución de existencias por envío a papelera de cita completada de ${pacienteName}`,
              clinicId: current.clinicId,
              userId: userId || null,
            },
          });
        }
      } catch (err) {
        console.error("Error reverting consumables on appointment delete:", err);
      }
    }

    // Soft delete — move to trash
    await prisma.appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Log the deletion
    await prisma.appointmentLog.create({
      data: {
        appointmentId: id,
        action: "DELETED",
        userId: userId || null,
        userName,
        previousValue: "Activa",
        newValue: "En papelera",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
