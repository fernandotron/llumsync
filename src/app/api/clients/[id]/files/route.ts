import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;

    if (!clientId) {
      return NextResponse.json({ error: "Falta ID de cliente" }, { status: 400 });
    }

    const files = await prisma.clientFile.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error("Error fetching client files:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;

    if (!clientId) {
      return NextResponse.json({ error: "Falta ID de cliente" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique name
    const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    const fileUrl = `/uploads/${uniqueFilename}`;

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Save to database
    const clientFile = await prisma.clientFile.create({
      data: {
        clientId,
        name: file.name,
        fileUrl,
        fileSize: file.size,
      },
    });

    return NextResponse.json(clientFile);
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Error en el servidor al subir el archivo" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "Falta ID de archivo" }, { status: 400 });
    }

    // Find file to delete from disk
    const fileRecord = await prisma.clientFile.findUnique({
      where: { id: fileId },
    });

    if (fileRecord) {
      const filePath = path.join(process.cwd(), "public", fileRecord.fileUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error("Failed to delete file from disk:", err);
        }
      }
      
      await prisma.clientFile.delete({
        where: { id: fileId },
      });
    }

    return NextResponse.json({ success: true, deletedId: fileId });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json({ error: "Error en el servidor al eliminar el archivo" }, { status: 500 });
  }
}
