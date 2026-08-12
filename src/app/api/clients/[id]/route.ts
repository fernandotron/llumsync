import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Falta ID de cliente" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        appointments: {
          where: { deletedAt: null },
          include: {
            user: true,
            service: true,
          },
          orderBy: { start: "desc" },
        },
        sales: {
          orderBy: { createdAt: "desc" },
        },
        documents: {
          orderBy: { createdAt: "desc" },
        },
        vouchers: {
          orderBy: { createdAt: "desc" },
        },
        files: {
          orderBy: { createdAt: "desc" },
        },
        photos: {
          orderBy: { takenAt: "desc" },
        },
        clinic: true,
        allowedUsers: {
          select: { id: true },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // Fetch signed documents using Prisma
    let rawDocs: any[] = [];
    try {
      rawDocs = await prisma.signedDocument.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: "desc" },
      });
    } catch (docErr) {
      console.error("Error fetching signed documents:", docErr);
    }
    (client as any).documents = rawDocs;

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error fetching client details:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Falta ID de cliente" }, { status: 400 });
    }

    // Helper to normalize DNI/NIF
    const normalizeDni = (s: string | null | undefined) => (s ? String(s).replace(/[\s\.\-\/]/g, "").toLowerCase() : "");

    // Check DNI uniqueness if body.dniNif is being updated
    if (body.dniNif && typeof body.dniNif === "string" && body.dniNif.trim() !== "") {
      const plainDni = decrypt(body.dniNif) || body.dniNif;
      const cleanInputDni = normalizeDni(plainDni);
      
      if (cleanInputDni) {
        const currentClient = await prisma.client.findUnique({
          where: { id },
          select: { clinicId: true },
        });

        if (currentClient) {
          const otherClients = await prisma.client.findMany({
            where: {
              clinicId: currentClient.clinicId,
              deletedAt: null,
              id: { not: id },
              dniNif: { not: null },
            },
            select: { id: true, dniNif: true },
          });

          const isDuplicate = otherClients.some((c: any) => {
            if (!c.dniNif) return false;
            const dec = decrypt(c.dniNif);
            return dec && normalizeDni(dec) === cleanInputDni;
          });

          if (isDuplicate) {
            return NextResponse.json(
              { error: `Ya existe otro cliente registrado con el documento de identidad (${plainDni.trim().toUpperCase()})` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Formatted DNI & IBAN encrypted
    const finalDniNif = body.dniNif !== undefined 
      ? (body.dniNif ? (typeof body.dniNif === "string" && body.dniNif.includes(":") ? body.dniNif : encrypt(body.dniNif)) : null)
      : undefined;

    const finalIban = body.iban !== undefined
      ? (body.iban ? (typeof body.iban === "string" && body.iban.includes(":") ? body.iban : encrypt(body.iban)) : null)
      : undefined;

    const client = await prisma.client.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        email: body.email,
        ...(finalDniNif !== undefined && { dniNif: finalDniNif }),
        birthDate: (() => {
          if (!body.birthDate) return null;
          if (typeof body.birthDate === "string" && body.birthDate.includes("/")) {
            const parts = body.birthDate.split("/");
            if (parts.length === 3) {
              const parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              return isNaN(parsedDate.getTime()) ? null : parsedDate;
            }
          }
          const d = new Date(body.birthDate);
          return isNaN(d.getTime()) ? null : d;
        })(),
        gender: body.gender,
        address: body.address,
        municipality: body.municipality,
        postalCode: body.postalCode,
        country: body.country,
        province: body.province,
        landline: body.landline,
        ...(finalIban !== undefined && { iban: finalIban }),
        bic: body.bic,
        tags: body.tags,
        
        // Medical history
        aestheticTreatments: body.aestheticTreatments,
        allergies: body.allergies,
        medication: body.medication,
        medicalHistory: body.medicalHistory,
        otherNotes: body.otherNotes,
        
        // Tutor details
        tutorName: body.tutorName,
        tutorLastName: body.tutorLastName,
        tutorDniNif: body.tutorDniNif,
        tutorPhone: body.tutorPhone,
        tutorEmail: body.tutorEmail,
        tutorAddress: body.tutorAddress,
        tutorPostalCode: body.tutorPostalCode,
        tutorMunicipality: body.tutorMunicipality,

        // Custom fields from Docfav
        isSelfEmployed: body.isSelfEmployed,
        isCompany: body.isCompany,
        receivesReminders: body.receivesReminders,
        occupation: body.occupation,
        maritalStatus: body.maritalStatus,
        formResponses: body.formResponses,
        followUps: body.followUps,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Falta ID de cliente" }, { status: 400 });
    }

    // Soft delete — move to trash
    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json({ error: "Error en el servidor al eliminar cliente" }, { status: 500 });
  }
}
