import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const clinicId = request.nextUrl.searchParams.get("clinicId");
  if (!clinicId) return NextResponse.json({ error: "clinicId required" }, { status: 400 });
  const forms = await prisma.clientFormTemplate.findMany({
    where: { clinicId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(forms);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, fields, clinicId } = body;
  if (!name || !clinicId) return NextResponse.json({ error: "name and clinicId required" }, { status: 400 });
  const form = await prisma.clientFormTemplate.create({
    data: {
      name,
      fields: JSON.stringify(fields || []),
      clinicId,
    },
  });
  return NextResponse.json(form, { status: 201 });
}
