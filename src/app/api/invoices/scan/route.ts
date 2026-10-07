import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getSessionUser } from "@/lib/authGuard";
import sharp from "sharp";

interface InvoiceExtractedData {
  supplierName: string;
  supplierNif: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  concept: string;
  baseAmount: number;
  taxRate: number;
  taxAmount: number;
  retentionRate: number;
  retentionAmount: number;
  total: number;
  paymentMethod: "TRANSFER" | "CARD" | "CASH" | "DIRECT_DEBIT" | "OTHER";
  category: "MATERIAL_CLINICO" | "LABORATORIO" | "SUMINISTROS" | "ALQUILER" | "SERVICIOS_PROFESIONALES" | "OTROS";
  confidence: number;
  lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado. Inicie sesión para escanear facturas." }, { status: 401 });
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

    // Sanitize filename & generate unique path
    const sanitizedName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFilename = `invoice-${crypto.randomUUID()}-${sanitizedName}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    const fileUrl = `/api/uploads/${uniqueFilename}`;

    const originalBuffer = Buffer.from(await file.arrayBuffer());
    let bufferToAnalyze = originalBuffer;
    let mimeType = file.type || "application/pdf";

    // Auto-detect extension if mimeType is generic
    const ext = path.extname(sanitizedName).toLowerCase();
    if (!mimeType || mimeType === "application/octet-stream") {
      if (ext === ".pdf") mimeType = "application/pdf";
      else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
      else if (ext === ".png") mimeType = "image/png";
      else if (ext === ".webp") mimeType = "image/webp";
    }

    // Save the original file to disk
    fs.writeFileSync(filePath, originalBuffer);

    // If image, optimize for faster upload to Gemini if huge
    if (mimeType.startsWith("image/") && !mimeType.includes("svg")) {
      try {
        const compressed = await sharp(originalBuffer)
          .resize(1800, 1800, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        bufferToAnalyze = Buffer.from(compressed);
        mimeType = "image/jpeg";
      } catch (sharpErr) {
        console.warn("Could not optimize image with sharp:", sharpErr);
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let extractedData: InvoiceExtractedData | null = null;
    let aiEnabled = false;
    let aiError: string | null = null;

    if (apiKey) {
      aiEnabled = true;
      try {
        const base64Data = bufferToAnalyze.toString("base64");
        
        const systemInstruction = `Eres un auditor fiscal y contable experto en el sistema tributario español (AEAT, Ley 11/2021, RD 1619/2012) especializado en clínicas médicas y odontológicas.
Tu tarea es analizar el documento adjunto (factura recibida, ticket o albarán) y extraer todos sus datos fiscales con máxima fidelidad.

Devuelve ÚNICAMENTE un objeto JSON válido (sin formato Markdown, sin texto alrededor) con los siguientes campos:
{
  "supplierName": string (Razón social o nombre comercial del emisor/proveedor),
  "supplierNif": string (NIF/CIF del emisor en mayúsculas, ej: B12345678, A87654321, 12345678Z),
  "invoiceNumber": string (Número y serie de la factura),
  "issueDate": string (Fecha de emisión en formato YYYY-MM-DD),
  "dueDate": string (Fecha de vencimiento en YYYY-MM-DD, si no hay pon la misma de emisión o +30 días),
  "concept": string (Resumen breve de los bienes o servicios facturados, máx 80 caracteres),
  "baseAmount": number (Base imponible total antes de impuestos, ej 100.00),
  "taxRate": number (Porcentaje de IVA general aplicado, ej 21, 10, 4 o 0),
  "taxAmount": number (Importe de la cuota de IVA, ej 21.00),
  "retentionRate": number (Porcentaje de retención IRPF si es profesional autónomo, ej 15, 7 o 0 si no aplica),
  "retentionAmount": number (Importe retenido de IRPF a restar, ej 0.00),
  "total": number (Importe total neto a pagar de la factura),
  "paymentMethod": "TRANSFER" | "CARD" | "CASH" | "DIRECT_DEBIT" | "OTHER",
  "category": "MATERIAL_CLINICO" | "LABORATORIO" | "SUMINISTROS" | "ALQUILER" | "SERVICIOS_PROFESIONALES" | "OTROS",
  "confidence": number (entre 0.0 y 1.0),
  "lineItems": [
    { "description": string, "quantity": number, "unitPrice": number, "total": number }
  ]
}

Reglas críticas:
- Si el documento contiene desgloses de IVA múltiples, pon la base imponible sumada y el tipo de IVA predominante.
- Si no encuentras el CIF/NIF exacto, intenta extraerlo del encabezado o pie de página.
- Asegúrate de que: baseAmount + taxAmount - retentionAmount ≈ total. Corrige incoherencias matemáticas leves si es por redondeo de céntimos.
- Devuelve única y exclusivamente el JSON puro.`;

        // Intentar con modelo flash moderno
        const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.8-flash"];
        let rawResponseText = "";

        for (const modelName of modelsToTry) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            const apiRes = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [
                      {
                        inlineData: {
                          mimeType: mimeType,
                          data: base64Data,
                        },
                      },
                      {
                        text: "Extrae todos los campos fiscales de esta factura según las instrucciones del sistema en JSON puro.",
                      },
                    ],
                  },
                ],
                systemInstruction: {
                  parts: [{ text: systemInstruction }],
                },
                generationConfig: {
                  temperature: 0.1,
                  maxOutputTokens: 1200,
                  responseMimeType: "application/json",
                },
              }),
            });

            if (apiRes.ok) {
              const data = await apiRes.json();
              rawResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (rawResponseText) break;
            } else {
              const errBody = await apiRes.text();
              console.warn(`Gemini model ${modelName} returned status ${apiRes.status}:`, errBody);
            }
          } catch (modelErr) {
            console.warn(`Attempt with ${modelName} failed:`, modelErr);
          }
        }

        if (rawResponseText) {
          // Limpiar posibles delimitadores markdown ```json ... ```
          let cleanJson = rawResponseText.trim();
          if (cleanJson.startsWith("```json")) {
            cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
          } else if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
          }

          const parsed = JSON.parse(cleanJson);
          extractedData = {
            supplierName: parsed.supplierName || "Proveedor desconocido",
            supplierNif: (parsed.supplierNif || "").toUpperCase().trim(),
            invoiceNumber: parsed.invoiceNumber || "",
            issueDate: parsed.issueDate || new Date().toISOString().substring(0, 10),
            dueDate: parsed.dueDate || parsed.issueDate || new Date().toISOString().substring(0, 10),
            concept: parsed.concept || "Suministros o servicios clínicos",
            baseAmount: typeof parsed.baseAmount === "number" ? parsed.baseAmount : parseFloat(parsed.baseAmount || 0),
            taxRate: typeof parsed.taxRate === "number" ? parsed.taxRate : parseFloat(parsed.taxRate || 21),
            taxAmount: typeof parsed.taxAmount === "number" ? parsed.taxAmount : parseFloat(parsed.taxAmount || 0),
            retentionRate: typeof parsed.retentionRate === "number" ? parsed.retentionRate : parseFloat(parsed.retentionRate || 0),
            retentionAmount: typeof parsed.retentionAmount === "number" ? parsed.retentionAmount : parseFloat(parsed.retentionAmount || 0),
            total: typeof parsed.total === "number" ? parsed.total : parseFloat(parsed.total || 0),
            paymentMethod: parsed.paymentMethod || "TRANSFER",
            category: parsed.category || "MATERIAL_CLINICO",
            confidence: parsed.confidence || 0.9,
            lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
          };
        }
      } catch (err: any) {
        console.error("Error invoking Gemini Vision:", err);
        aiError = err.message || "Error al procesar el archivo con Gemini";
      }
    }

    // Si la IA no está configurada o falló, proporcionar plantilla de datos asistida
    if (!extractedData) {
      const todayStr = new Date().toISOString().substring(0, 10);
      const cleanBaseName = path.parse(sanitizedName).name.replace(/[_-]/g, " ");

      extractedData = {
        supplierName: cleanBaseName.length > 3 ? cleanBaseName.substring(0, 30) : "",
        supplierNif: "",
        invoiceNumber: "",
        issueDate: todayStr,
        dueDate: todayStr,
        concept: "Gasto de clínica",
        baseAmount: 0,
        taxRate: 21,
        taxAmount: 0,
        retentionRate: 0,
        retentionAmount: 0,
        total: 0,
        paymentMethod: "TRANSFER",
        category: "MATERIAL_CLINICO",
        confidence: 0,
        lineItems: [],
      };
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      extractedData,
      aiEnabled,
      aiError,
    });
  } catch (error: any) {
    console.error("Error in scan endpoint:", error);
    return NextResponse.json({ error: "Error en el servidor: " + (error?.message || error) }, { status: 500 });
  }
}
