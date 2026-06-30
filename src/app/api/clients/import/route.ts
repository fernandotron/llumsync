import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

    // Retrieve maximum clientNumber to generate new numbers if needed
    const maxClient = await prisma.client.findFirst({
      orderBy: { clientNumber: "desc" },
    });
    let nextClientNumber = maxClient ? maxClient.clientNumber + 1 : 1001;

    let createdCount = 0;
    let updatedCount = 0;

    for (const client of clients) {
      // Validate that at least first name or last name is present
      const firstName = (client.firstName || "").trim();
      const lastName = (client.lastName || "").trim();

      // If the row is totally empty or lacks both names, skip it
      if (!firstName && !lastName) {
        continue;
      }

      // Check if client number is provided and valid
      let clientNumVal: number | null = null;
      if (client.clientNumber !== undefined && client.clientNumber !== "") {
        const parsedNum = Number(client.clientNumber);
        if (!isNaN(parsedNum) && parsedNum > 0) {
          clientNumVal = parsedNum;
        }
      }

      let existingClient = null;

      // 1. Try to find by ID
      if (client.id && typeof client.id === "string" && client.id.trim() !== "") {
        try {
          existingClient = await prisma.client.findUnique({
            where: { id: client.id.trim() },
          });
        } catch (e) {
          // Ignore invalid uuid formats
        }
      }

      // 2. Try to find by clientNumber
      if (!existingClient && clientNumVal !== null) {
        existingClient = await prisma.client.findUnique({
          where: { clientNumber: clientNumVal },
        });
      }

      const clientData = {
        firstName: firstName || "Contacto",
        lastName: lastName || "Importado",
        phone: client.phone ? String(client.phone).trim() : null,
        email: client.email ? String(client.email).trim() : null,
        dniNif: client.dniNif ? String(client.dniNif).trim() : null,
        birthDate: parseDate(client.birthDate),
        gender: client.gender ? String(client.gender).trim() : null,
        address: client.address ? String(client.address).trim() : null,
        municipality: client.municipality ? String(client.municipality).trim() : null,
        postalCode: client.postalCode ? String(client.postalCode).trim() : null,
        country: client.country ? String(client.country).trim() : null,
        iban: client.iban ? String(client.iban).trim() : null,
        bic: client.bic ? String(client.bic).trim() : null,
        tags: client.tags ? String(client.tags).trim() : null,
      };

      if (existingClient) {
        // Update existing client
        await prisma.client.update({
          where: { id: existingClient.id },
          data: {
            ...clientData,
            updatedAt: new Date(),
          },
        });
        updatedCount++;
      } else {
        // Insert new client
        let finalClientNumber = clientNumVal;

        if (finalClientNumber === null) {
          // Loop until we find a unique clientNumber
          let unique = false;
          while (!unique) {
            const check = await prisma.client.findUnique({
              where: { clientNumber: nextClientNumber },
            });
            if (!check) {
              finalClientNumber = nextClientNumber;
              unique = true;
            }
            nextClientNumber++;
          }
        } else {
          // Verify that clientNumVal isn't duplicate in db, if it is, assign a new one
          const check = await prisma.client.findUnique({
            where: { clientNumber: finalClientNumber },
          });
          if (check) {
            let unique = false;
            while (!unique) {
              const checkSub = await prisma.client.findUnique({
                where: { clientNumber: nextClientNumber },
              });
              if (!checkSub) {
                finalClientNumber = nextClientNumber;
                unique = true;
              }
              nextClientNumber++;
            }
          }
        }

        const createdAtVal = parseDate(client.createdAt) || new Date();

        await prisma.client.create({
          data: {
            id: client.id && typeof client.id === "string" && client.id.trim().length > 10 ? client.id.trim() : undefined,
            clientNumber: finalClientNumber!,
            clinicId,
            createdAt: createdAtVal,
            updatedAt: new Date(),
            ...clientData,
          },
        });
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      message: `Importación completada: ${createdCount} creados, ${updatedCount} actualizados.`,
    });
  } catch (error) {
    console.error("Error importing clients:", error);
    return NextResponse.json({ error: "Error en el servidor al realizar la importación" }, { status: 500 });
  }
}
