import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/rateLimit";

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

    const cookieStore = await cookies();
    const userId = cookieStore.get("session_user_id")?.value;

    const rateLimitKey = userId || 
                         request.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
                         request.headers.get("x-real-ip") || 
                         "127.0.0.1";
               
    const rate = checkRateLimit(rateLimitKey, "upload", 30, 300000); // 30 uploads per 5 minutes
    if (rate.limited) {
      const retryAfter = Math.ceil((rate.reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Límite de subidas excedido. Por favor, espere ${Math.ceil(retryAfter / 60)} minutos.` },
        { 
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(rate.limit),
            "X-RateLimit-Remaining": String(rate.remaining),
            "X-RateLimit-Reset": String(Math.ceil(rate.reset / 1000)),
          }
        }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), "private-uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique name
    const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    const fileUrl = `/api/uploads/${uniqueFilename}`;

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
      const fileFilename = path.basename(fileRecord.fileUrl);
      const filePath = path.join(process.cwd(), "private-uploads", fileFilename);
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
