import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/rateLimit";
import sharp from "sharp";

export async function POST(request: Request) {
  try {
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

    const uploadDir = path.join(process.cwd(), "private-uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueFilename = `upload-${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    const fileUrl = `/api/uploads/${uniqueFilename}`;

    let buffer = Buffer.from(await file.arrayBuffer());
    let mimeType = file.type || "image/png";

    // Auto-compress high resolution images to max 1200px JPEG to prevent HTTP 413 Payload Too Large in Evolution API
    if (mimeType.startsWith("image/") && !mimeType.includes("svg")) {
      try {
        const compressed = await sharp(buffer)
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer();
        buffer = Buffer.from(compressed);
        mimeType = "image/jpeg";
      } catch (sharpErr) {
        console.error("Error compressing upload with sharp:", sharpErr);
      }
    }

    fs.writeFileSync(filePath, buffer);

    if (file.size <= 15 * 1024 * 1024) {
      const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
      return NextResponse.json({ url: dataUrl, fallbackUrl: fileUrl });
    }

    return NextResponse.json({ url: fileUrl });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: `Error en el servidor: ${error.message || error}` }, { status: 500 });
  }
}
