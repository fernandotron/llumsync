import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

const parseDate = (val: any) => {
  if (!val) return null;
  if (typeof val === "number") {
    // Convert Excel date serial number to JS Date
    const date = new Date((val - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(val);
  return isNaN(date.getTime()) ? null : date;
};

const normalizeDni = (s: string | null | undefined) => (s ? String(s).replace(/[\s\.\-\/]/g, "").toLowerCase() : "");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clients, clinicId } = body;

    if (!clinicId) {
      return NextResponse.json({ error: "Falta el identificador de la clínica (clinicId)" }, { status: 400 });
    }

    if (!Array.isArray(clients)) {
      return NextResponse.json({ error: "El cuerpo de la solicitud debe contener un arreglo de clientes" }, { status: 400 });
    }

    // Retrieve maximum clientNumber to generate new sequential numbers
    const maxClient = await prisma.client.findFirst({
      orderBy: { clientNumber: "desc" },
    });
    let nextClientNumber = maxClient ? maxClient.clientNumber + 1 : 1001;

    // Build Set of existing DNI/NIF values for this clinic
    const existingDniClients = await prisma.client.findMany({
      where: { clinicId, deletedAt: null, dniNif: { not: null } },
      select: { id: true, dniNif: true },
    });

    const existingDnis = new Set<string>();
    for (const c of existingDniClients) {
      if (c.dniNif) {
        const dec = decrypt(c.dniNif);
        const norm = normalizeDni(dec);
        if (norm) existingDnis.add(norm);
      }
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const client of clients) {
      // Validate that at least first name or last name is present
      const firstName = (client.firstName || "").trim();
      const lastName = (client.lastName || "").trim();

      // If the row is totally empty or lacks both names, skip it
      if (!firstName && !lastName) {
        continue;
      }

      let existingClient = null;

      // Try to find existing client ONLY by explicit system UUID id (if present)
      if (client.id && typeof client.id === "string" && client.id.trim().length > 10) {
        try {
          existingClient = await prisma.client.findUnique({
            where: { id: client.id.trim() },
          });
        } catch (e) {
          // Ignore invalid uuid formats
        }
      }

      const dniVal = client.dniNif ? String(client.dniNif).trim() : null;
      const cleanDni = normalizeDni(dniVal);
      const ibanVal = client.iban ? String(client.iban).trim() : null;

      // If creating a NEW client (not updating by ID) and DNI is provided, skip if DNI already exists
      if (!existingClient && cleanDni) {
        if (existingDnis.has(cleanDni)) {
          skippedCount++;
          continue; // Omit client with duplicate DNI
        }
      }

      const clientData = {
        firstName: firstName || "Contacto",
        lastName: lastName || "Importado",
        phone: client.phone ? String(client.phone).trim() : null,
        email: client.email ? String(client.email).trim() : null,
        dniNif: dniVal ? encrypt(dniVal) : null,
        birthDate: parseDate(client.birthDate),
        gender: client.gender ? String(client.gender).trim() : null,
        address: client.address ? String(client.address).trim() : null,
        municipality: client.municipality ? String(client.municipality).trim() : null,
        postalCode: client.postalCode ? String(client.postalCode).trim() : null,
        country: client.country ? String(client.country).trim() : null,
        iban: ibanVal ? encrypt(ibanVal) : null,
        bic: client.bic ? String(client.bic).trim() : null,
        tags: client.tags ? String(client.tags).trim() : null,
      };

      if (existingClient) {
        // Update existing client (preserving system clientNumber)
        await prisma.client.update({
          where: { id: existingClient.id },
          data: {
            ...clientData,
            updatedAt: new Date(),
          },
        });
        updatedCount++;
      } else {
        // Always assign a new sequential clientNumber for imported contacts
        let assignedClientNumber = nextClientNumber;
        let unique = false;
        while (!unique) {
          const check = await prisma.client.findUnique({
            where: { clientNumber: assignedClientNumber },
          });
          if (!check) {
            unique = true;
          } else {
            assignedClientNumber++;
          }
        }
        nextClientNumber = assignedClientNumber + 1;

        const createdAtVal = parseDate(client.createdAt) || new Date();

        await prisma.client.create({
          data: {
            id: client.id && typeof client.id === "string" && client.id.trim().length > 10 ? client.id.trim() : undefined,
            clientNumber: assignedClientNumber,
            clinicId,
            createdAt: createdAtVal,
            updatedAt: new Date(),
            ...clientData,
          },
        });
        createdCount++;
        if (cleanDni) {
          existingDnis.add(cleanDni);
        }
      }
    }

    const skippedText = skippedCount > 0 ? `, ${skippedCount} omitidos por DNI/NIF duplicado` : "";

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      skippedCount,
      message: `Importación completada: ${createdCount} creados, ${updatedCount} actualizados${skippedText}.`,
    });
  } catch (error) {
    console.error("Error importing clients:", error);
    return NextResponse.json({ error: "Error en el servidor al realizar la importación" }, { status: 500 });
  }
}
