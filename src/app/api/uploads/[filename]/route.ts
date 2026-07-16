import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // 1. Verify user session from cookies
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Validate user exists in DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 3. Prevent Path Traversal by extracting basename
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), "private-uploads", safeFilename);

    // 4. Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    // 5. Read file
    const fileBuffer = fs.readFileSync(filePath);

    // 6. Resolve correct mime type
    const ext = path.extname(safeFilename).toLowerCase();
    let contentType = "application/octet-stream";
    
    if (ext === ".jpg" || ext === ".jpeg") {
      contentType = "image/jpeg";
    } else if (ext === ".png") {
      contentType = "image/png";
    } else if (ext === ".gif") {
      contentType = "image/gif";
    } else if (ext === ".webp") {
      contentType = "image/webp";
    } else if (ext === ".svg") {
      contentType = "image/svg+xml";
    } else if (ext === ".pdf") {
      contentType = "application/pdf";
    } else if (ext === ".docx") {
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (ext === ".xlsx") {
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else if (ext === ".txt") {
      contentType = "text/plain";
    }

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error serving private file:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
