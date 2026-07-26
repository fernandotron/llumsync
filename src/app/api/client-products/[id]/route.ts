import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientProductId } = await params;
    await prisma.clientProduct.delete({
      where: { id: clientProductId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client product:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
