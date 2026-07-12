import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueFilename = `upload-${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    const fileUrl = `/uploads/${uniqueFilename}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ url: fileUrl });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: `Error en el servidor: ${error.message || error}` }, { status: 500 });
  }
}
