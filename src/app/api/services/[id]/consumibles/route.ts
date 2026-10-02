import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";

// GET /api/services/[id]/consumibles
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serviceId } = await params;
    
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { clinicId: true },
    });

    if (service?.clinicId) {
      const auth = await authenticateApiRequest(service.clinicId);
      if ("errorResponse" in auth) {
        return auth.errorResponse;
      }
    }

    const consumibles = await prisma.serviceProduct.findMany({
      where: { serviceId },
      include: {
        product: true,
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
    });
    return NextResponse.json(consumibles);
  } catch (error) {
    console.error("Error fetching service consumibles:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST /api/services/[id]/consumibles
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serviceId } = await params;
    const body = await request.json();
    const { productId, quantity, clinicId } = body;

    if (!productId || !quantity || !clinicId) {
      return NextResponse.json({ error: "Faltan datos obligatorios (productId, cantidad y clinicId)" }, { status: 400 });
    }

    const auth = await authenticateApiRequest(clinicId);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      return NextResponse.json({ error: "La cantidad debe ser mayor a cero" }, { status: 400 });
    }

    const serviceProduct = await prisma.serviceProduct.upsert({
      where: {
        serviceId_productId: {
          serviceId,
          productId,
        },
      },
      update: {
        quantity: qty,
      },
      create: {
        serviceId,
        productId,
        quantity: qty,
        clinicId,
      },
      include: {
        product: true,
      },
    });

    return NextResponse.json(serviceProduct);
  } catch (error) {
    console.error("Error linking service consumible:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// DELETE /api/services/[id]/consumibles?productId=...
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serviceId } = await params;
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "Falta productId" }, { status: 400 });
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { clinicId: true },
    });

    if (service?.clinicId) {
      const auth = await authenticateApiRequest(service.clinicId);
      if ("errorResponse" in auth) {
        return auth.errorResponse;
      }
    }

    await prisma.serviceProduct.delete({
      where: {
        serviceId_productId: {
          serviceId,
          productId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking service consumible:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
