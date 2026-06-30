import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    const where: any = {};
    if (clinicId) {
      where.clinicId = clinicId;
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, price, duration, color, category, description, type, tax, total, allowedUserIds, clinicId } = body;

    if (!name || price === undefined || !duration || !color) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        name,
        price: parseFloat(price),
        duration: parseInt(duration),
        color,
        category,
        description,
        type: type || "Presencial",
        tax: tax !== undefined ? parseFloat(tax) : 0,
        total: total !== undefined ? parseFloat(total) : parseFloat(price),
        allowedUserIds: allowedUserIds || "",
        clinicId: clinicId || null,
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, price, duration, color, category, description, type, tax, total, allowedUserIds, clinicId } = body;

    if (!id) {
      return NextResponse.json({ error: "Falta ID de servicio a actualizar" }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (duration !== undefined) updateData.duration = parseInt(duration);
    if (color) updateData.color = color;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (type) updateData.type = type;
    if (tax !== undefined) updateData.tax = parseFloat(tax);
    if (total !== undefined) updateData.total = parseFloat(total);
    if (allowedUserIds !== undefined) updateData.allowedUserIds = allowedUserIds;
    if (clinicId !== undefined) updateData.clinicId = clinicId;

    const service = await prisma.service.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Falta ID de servicio a eliminar" }, { status: 400 });
    }

    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
