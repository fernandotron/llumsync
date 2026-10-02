import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCountryConfig } from "@/lib/countries";
import { authenticateApiRequest } from "@/lib/authGuard";
import { encrypt, decrypt } from "@/lib/crypto";
import { logEhrAccess } from "@/lib/auditLogger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const search = (searchParams.get("search") || "").trim();

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const auth = await authenticateApiRequest(clinicId);
    if ("errorResponse" in auth) return auth.errorResponse;

    // Fetch clients for clinic (Prisma extension automatically decrypts sensitive fields)
    const clients = await prisma.client.findMany({
      where: {
        clinicId: clinicId,
        deletedAt: null, // Exclude soft-deleted clients
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
        },
        _count: {
          select: {
            documents: true,
            files: true,
          }
        }
      }
    });

    let results = clients;
    if (search) {
      const searchLower = search.toLowerCase();
      const cleanSearch = searchLower.replace(/[^a-z0-9]/g, "");

      results = clients.filter((c: any) => {
        const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
        const email = (c.email || "").toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        const dni = (c.dniNif || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const clientNum = String(c.clientNumber || "");
        const tags = (c.tags || "").toLowerCase();
        const tutor = `${c.tutorName || ""} ${c.tutorLastName || ""}`.toLowerCase();

        return (
          fullName.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower) ||
          clientNum.includes(searchLower) ||
          tags.includes(searchLower) ||
          tutor.includes(searchLower) ||
          (cleanSearch.length > 0 && dni.includes(cleanSearch))
        );
      });
    }

    return NextResponse.json(results);
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
          dniNif: dniNif || null,
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
          iban: iban || null,
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

    // Record EHR creation audit log
    await logEhrAccess({
      clientId: client.id,
      userId: auth?.user?.id || null,
      userName: auth?.user?.name || null,
      action: "UPDATE",
      details: "Apertura de historia clínica / Alta de paciente",
      clinicId,
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

