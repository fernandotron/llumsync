import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const current = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: true,
        service: true,
      },
    });

    // If it was completed and not previously soft-deleted, restore consumables
    if (current && current.status === "COMPLETED" && !current.deletedAt) {
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
              notes: `Devolución de existencias por eliminación definitiva de cita completada (${pacienteName})`,
              clinicId: current.clinicId,
            },
          });
        }
      } catch (e) {
        console.error("Error restoring consumables on permanent appointment deletion:", e);
      }
    }

    // Hard delete — permanently removes from DB
    await prisma.appointment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error permanently deleting appointment:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
