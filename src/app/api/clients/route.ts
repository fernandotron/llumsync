import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCountryConfig } from "@/lib/countries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const search = searchParams.get("search") || "";

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

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

    return NextResponse.json(clients);
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

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId }
    });
    const cConfig = getCountryConfig(clinic?.country || "ES");
    const resolvedCountry = country || cConfig.name;

    // Generate unique clientNumber (find max client number and add 1)
    const maxClient = await prisma.client.findFirst({
      orderBy: { clientNumber: "desc" },
    });
    const nextClientNumber = maxClient ? maxClient.clientNumber + 1 : 1001;

    const client = await prisma.client.create({
      data: {
        clientNumber: nextClientNumber,
        firstName,
        lastName,
        phone,
        email,
        dniNif,
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
        // Custom fields
        isSelfEmployed: isSelfEmployed ?? false,
        isCompany: isCompany ?? false,
        receivesReminders: receivesReminders ?? true,
        occupation,
        maritalStatus,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
