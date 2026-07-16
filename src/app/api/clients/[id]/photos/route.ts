import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/rateLimit";

// GET: Obtener fotos de un cliente (y opcionalmente por cita)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get("appointmentId");

    if (!clientId) {
      return NextResponse.json({ error: "Falta ID de cliente" }, { status: 400 });
    }

    const whereClause: any = { clientId };
    if (appointmentId) {
      whereClause.appointmentId = appointmentId;
    }

    const photos = await prisma.clientPhoto.findMany({
      where: whereClause,
      orderBy: { takenAt: "desc" },
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error("Error fetching client photos:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST: Subir foto y guardar en DB
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
    const type = formData.get("type") as string | null; // "BEFORE" | "AFTER"
    const appointmentId = formData.get("appointmentId") as string | null;
    const description = formData.get("description") as string | null;
    const pairId = formData.get("pairId") as string | null;
    const angle = formData.get("angle") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    if (!type || (type !== "BEFORE" && type !== "AFTER")) {
      return NextResponse.json({ error: "Tipo de foto inválido (debe ser BEFORE o AFTER)" }, { status: 400 });
    }

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), "private-uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique name
    const uniqueFilename = `photo-${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    const photoUrl = `/api/uploads/${uniqueFilename}`;

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Save to database
    const clientPhoto = await prisma.clientPhoto.create({
      data: {
        clientId,
        appointmentId: appointmentId || null,
        photoUrl,
        type,
        description: description || null,
        pairId: pairId || null,
        angle: angle || "Frente",
        takenAt: new Date(),
      },
    });

    return NextResponse.json(clientPhoto);
  } catch (error: any) {
    console.error("Error uploading photo:", error);
    return NextResponse.json({ error: `Error en el servidor: ${error?.message || error || "Desconocido"}` }, { status: 500 });
  }
}

// DELETE: Eliminar foto
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!clientId) {
      return NextResponse.json({ error: "Falta ID de cliente" }, { status: 400 });
    }

    if (!photoId) {
      return NextResponse.json({ error: "Falta ID de foto" }, { status: 400 });
    }

    // Find photo in DB
    const photoRecord = await prisma.clientPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photoRecord) {
      return NextResponse.json({ error: "Foto no encontrada en la base de datos" }, { status: 404 });
    }

    // Double check client matches
    if (photoRecord.clientId !== clientId) {
      return NextResponse.json({ error: "La foto no pertenece a este cliente" }, { status: 403 });
    }

    // Delete file from disk
    const photoFilename = path.basename(photoRecord.photoUrl);
    const filePath = path.join(process.cwd(), "private-uploads", photoFilename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.error("Error deleting physical file:", unlinkErr);
      }
    }

    // Delete from DB
    await prisma.clientPhoto.delete({
      where: { id: photoId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json({ error: "Error en el servidor al eliminar la foto" }, { status: 500 });
  }
}
