import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta ID de servicio" }, { status: 400 });
    }

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        consumibles: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    const auth = await authenticateApiRequest(service.clinicId);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error fetching service by id:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta ID de servicio" }, { status: 400 });
    }

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    const auth = await authenticateApiRequest(existing.clinicId);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const body = await request.json();
    const { name, price, duration, color, category, description, type, tax, total, allowedUserIds, clinicId } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (duration !== undefined) updateData.duration = parseInt(duration);
    if (color !== undefined) updateData.color = color;
    if (category !== undefined) updateData.category = category ? category.trim() : null;
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (type !== undefined) updateData.type = type;
    if (tax !== undefined) updateData.tax = parseFloat(tax);
    if (total !== undefined) updateData.total = parseFloat(total);
    if (allowedUserIds !== undefined) updateData.allowedUserIds = allowedUserIds;
    if (clinicId !== undefined) updateData.clinicId = clinicId;

    const updated = await prisma.service.update({
      where: { id },
      data: updateData,
      include: {
        consumibles: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating service by id:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta ID de servicio" }, { status: 400 });
    }

    const existing = await prisma.service.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    const auth = await authenticateApiRequest(existing.clinicId);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    if (existing._count.appointments > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar el servicio porque cuenta con ${existing._count.appointments} citas registradas en el historial clínico. Recomendamos cambiar su nombre o desasignar profesionales.`,
        },
        { status: 400 }
      );
    }

    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service by id:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
