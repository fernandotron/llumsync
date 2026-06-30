import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { name, fields } = body;
  const form = await prisma.episodeFormTemplate.update({
    where: { id },
    data: {
      name,
      fields: JSON.stringify(fields || []),
    },
  });
  return NextResponse.json(form);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.episodeFormTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
