import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { name, fields, isMain, clinicId } = body;

  // If marking as main, unset all others first
  if (isMain && clinicId) {
    await prisma.clientFormTemplate.updateMany({
      where: { clinicId },
      data: { isMain: false },
    });
  }

  const form = await prisma.clientFormTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(fields !== undefined && { fields: JSON.stringify(fields) }),
      ...(isMain !== undefined && { isMain }),
    },
  });
  return NextResponse.json(form);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.clientFormTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
