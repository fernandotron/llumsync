import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCountryConfig } from "@/lib/countries";
import { authenticateApiRequest } from "@/lib/authGuard";
import { encrypt, decrypt } from "@/lib/crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const search = searchParams.get("search") || "";

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const auth = await authenticateApiRequest(clinicId);
    if ("errorResponse" in auth) return auth.errorResponse;

    const clients = await prisma.client.findMany({
      where: {
        clinicId: clinicId,
        deletedAt: null, // Exclude soft-deleted clients
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { dniNif: { contains: search } },
        ],
      },
      orderBy: { lastName: "asc" },
      include: {
        allowedUsers: {
          select: { id: true }
        },
        appointments: {
          select: { start: true },
          orderBy: { start: "desc" },
          take: 1
        }
      }
    });

    // Decrypt sensitive fields for response
    const decryptedClients = clients.map((c: any) => ({
      ...c,
      iban: c.iban ? decrypt(c.iban) : c.iban,
      dniNif: c.dniNif ? decrypt(c.dniNif) : c.dniNif,
    }));

    return NextResponse.json(decryptedClients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      email,
      dniNif,
      birthDate,
      gender,
      address,
      municipality,
      postalCode,
      country,
      province,
      landline,
      iban,
      bic,
      tags,
      clinicId,
      // Medical history
      aestheticTreatments,
      allergies,
      medication,
      medicalHistory,
      otherNotes,
      // Tutor details
      tutorName,
      tutorLastName,
      tutorDniNif,
      tutorPhone,
      tutorEmail,
      tutorAddress,
      tutorPostalCode,
      tutorMunicipality,
      // Custom toggles & fields
      isSelfEmployed,
      isCompany,
      receivesReminders,
      occupation,
      maritalStatus,
    } = body;

    if (!firstName || !lastName || !clinicId) {
      return NextResponse.json({ error: "Nombre, apellidos y clínica son obligatorios" }, { status: 400 });
    }

    const auth = await authenticateApiRequest(clinicId);
    if ("errorResponse" in auth) return auth.errorResponse;

    // Helper to normalize DNI/NIF (removing spaces, dots, hyphens)
    const normalizeDni = (s: string | null | undefined) => (s ? String(s).replace(/[\s\.\-\/]/g, "").toLowerCase() : "");

    // Validate DNI uniqueness within clinic if provided
    if (dniNif && typeof dniNif === "string" && dniNif.trim() !== "") {
      const cleanInputDni = normalizeDni(dniNif);
      if (cleanInputDni) {
        const existingClients = await prisma.client.findMany({
          where: { clinicId, deletedAt: null, dniNif: { not: null } },
          select: { id: true, dniNif: true },
        });
        const isDuplicate = existingClients.some((c: any) => {
          if (!c.dniNif) return false;
          const dec = decrypt(c.dniNif);
          return dec && normalizeDni(dec) === cleanInputDni;
        });
        if (isDuplicate) {
          return NextResponse.json(
            { error: `Ya existe un cliente registrado con el documento de identidad (${dniNif.trim().toUpperCase()})` },
            { status: 400 }
          );
        }
      }
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId }
    });
    const cConfig = getCountryConfig(clinic?.country || "ES");
    const resolvedCountry = country || cConfig.name;

    // Use transaction to ensure unique sequential clientNumber without race conditions
    const client = await prisma.$transaction(async (tx: any) => {
      const maxClient = await tx.client.findFirst({
        orderBy: { clientNumber: "desc" },
      });
      const nextClientNumber = maxClient ? maxClient.clientNumber + 1 : 1001;

      return await tx.client.create({
        data: {
          clientNumber: nextClientNumber,
          firstName,
          lastName,
          phone,
          email,
          dniNif: dniNif ? encrypt(dniNif) : null,
          birthDate: (() => {
            if (!birthDate) return null;
            if (typeof birthDate === "string" && birthDate.includes("/")) {
              const parts = birthDate.split("/");
              if (parts.length === 3) {
                const parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                return isNaN(parsedDate.getTime()) ? null : parsedDate;
              }
            }
            const d = new Date(birthDate);
            return isNaN(d.getTime()) ? null : d;
          })(),
          gender,
          address,
          municipality,
          postalCode,
          country: resolvedCountry,
          province,
          landline,
          iban: iban ? encrypt(iban) : null,
          bic,
          tags,
          clinicId,
          // Medical history
          aestheticTreatments,
          allergies,
          medication,
          medicalHistory,
          otherNotes,
          // Tutor details
          tutorName,
          tutorLastName,
          tutorDniNif,
          tutorPhone,
          tutorEmail,
          tutorAddress,
          tutorPostalCode,
          tutorMunicipality,
          // Custom fields
          isSelfEmployed: isSelfEmployed ?? false,
          isCompany: isCompany ?? false,
          receivesReminders: receivesReminders ?? true,
          occupation,
          maritalStatus,
        },
      });
    });

    return NextResponse.json({
      ...client,
      iban: client.iban ? decrypt(client.iban) : client.iban,
      dniNif: client.dniNif ? decrypt(client.dniNif) : client.dniNif,
    });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

