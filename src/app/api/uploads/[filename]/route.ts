import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // 1. Prevent Path Traversal by extracting basename
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), "private-uploads", safeFilename);
    const publicFilePath = path.join(process.cwd(), "public", "uploads", safeFilename);

    let targetPath = "";
    if (fs.existsSync(filePath)) {
      targetPath = filePath;
    } else if (fs.existsSync(publicFilePath)) {
      targetPath = publicFilePath;
    }

    // 2. Check if file exists
    if (!targetPath) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    // 3. Read file
    const fileBuffer = fs.readFileSync(targetPath);

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
