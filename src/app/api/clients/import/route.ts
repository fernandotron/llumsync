import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { authenticateApiRequest } from "@/lib/authGuard";
import { getCountryConfig } from "@/lib/countries";

/**
 * Normalizes an identity document (DNI, NIE, NIF, CIF, Passport)
 * by removing spaces, dashes, dots, slashes, underscores and converting to uppercase.
 */
function normalizeDni(val: any): string {
  if (!val) return "";
  return String(val)
    .toUpperCase()
    .replace(/[\s\.\-\/\_]/g, "")
    .trim();
}

/**
 * Normalizes phone numbers by stripping whitespace, hyphens, parentheses, and dots.
 * Strips leading Spanish country codes (+34, 0034, or 34 prefix).
 */
function normalizePhone(val: any): string {
  if (!val) return "";
  let s = String(val).replace(/[\s\-\.\(\)\+]/g, "").trim();
  if (s.startsWith("0034")) {
    s = s.slice(4);
  } else if (s.length === 11 && s.startsWith("34")) {
    s = s.slice(2);
  }
  return s;
}

/**
 * Validates that a string looks like a valid human name:
 * - Minimum 2 characters
 * - Must contain at least one letter (including Spanish accents/ñ)
 * - Must not be pure digits/symbols
 * - Must not be a UUID, hash, or DNI/NIE
 */
function isValidPersonName(name: string | null | undefined): boolean {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  if (uuidRegex.test(trimmed) || hex32Regex.test(trimmed)) return false;
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑçÇàèìòùÀÈÌÒÙäëïöüÄËÏÖÜ]/.test(trimmed)) return false;
  if (/^[\d\s\-_./\\#,:;]+$/.test(trimmed)) return false;
  if (/^[XYZxyz]?\d{6,8}[A-Za-z]$/.test(trimmed)) return false;
  return true;
}

/**
 * Robust date parser supporting Excel numerical serial numbers,
 * DD/MM/YYYY, YYYY-MM-DD, ISO strings, and Date objects.
 */
function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === "number") {
    // Excel serial dates: e.g. 25569 = 1970-01-01
    if (val > 0 && val < 100000) {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(date.getTime()) ? null : date;
    }
  }
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return null;
    // Format DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    // Format YYYY/MM/DD, YYYY-MM-DD
    const ymdMatch = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hex32Regex = /^[0-9a-f]{32}$/i;

/**
 * Intelligent helper to extract a field value from an arbitrary spreadsheet row object.
 * Checks:
 * 1. Direct key match (case sensitive)
 * 2. Case-insensitive, accent-insensitive, whitespace/punctuation-stripped key match
 * 3. Substring match (key contains candidate, never candidate contains key)
 * Explicitly ignores system metadata keys like "id", "uuid", etc.
 */
function extractFieldValue(row: Record<string, any>, candidateKeys: string[]): string | null {
  if (!row || typeof row !== "object") return null;

  // Reserved internal system keys that MUST NEVER be mapped to user profile fields
  const EXCLUDED_SYSTEM_KEYS = new Set([
    "id", "_id", "uuid", "uid", "key", "createdat", "updatedat", "deletedat",
    "clinicid", "clientnumber", "patientid", "idcliente", "idpaciente", "clientid",
    "numerodecliente", "numerocliente", "numcliente", "ncliente", "ndecliente",
    "codigocliente", "codigodecliente", "codcliente", "nocliente", "nrodecliente",
    "numdecliente", "num", "numero", "nro", "no", "indice", "index", "fila", "row",
    "numerodepaciente", "numeropaciente", "numpaciente", "npaciente", "ndepaciente",
    "codigopaciente", "codigodepaciente", "codpaciente", "nrodepaciente",
    "tipocliente", "tipodecliente", "estadocliente", "grupocliente"
  ]);

  // 1. Direct match
  for (const k of candidateKeys) {
    const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (EXCLUDED_SYSTEM_KEYS.has(cleanK)) continue;
    if (row[k] !== undefined && row[k] !== null) {
      const val = String(row[k]).trim();
      if (val !== "" && !uuidRegex.test(val)) return val;
    }
  }

  // 2. Normalized dictionary of row keys
  const normalizedRow: { [cleanKey: string]: string } = {};
  for (const rawKey of Object.keys(row)) {
    if (row[rawKey] === undefined || row[rawKey] === null) continue;
    const val = String(row[rawKey]).trim();
    if (val === "") continue;

    const cleanKey = rawKey
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

    if (cleanKey && !EXCLUDED_SYSTEM_KEYS.has(cleanKey) && normalizedRow[cleanKey] === undefined) {
      normalizedRow[cleanKey] = val;
    }
  }

  for (const candidate of candidateKeys) {
    const cleanCandidate = candidate
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

    if (EXCLUDED_SYSTEM_KEYS.has(cleanCandidate)) continue;

    if (normalizedRow[cleanCandidate] !== undefined) {
      const val = normalizedRow[cleanCandidate];
      if (!uuidRegex.test(val)) return val;
    }
  }

  // 3. Fallback: ONLY if candidate has at least 4 letters, and the spreadsheet key contains the candidate
  // e.g. key "nombredelpaciente" contains candidate "nombre". NEVER the reverse!
  for (const candidate of candidateKeys) {
    const cleanCandidate = candidate
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

    if (cleanCandidate.length < 4 || EXCLUDED_SYSTEM_KEYS.has(cleanCandidate)) continue;

    for (const [key, val] of Object.entries(normalizedRow)) {
      if (key.length >= 4 && key.includes(cleanCandidate) && !EXCLUDED_SYSTEM_KEYS.has(key)) {
        // Prevent key containing "numero", "codigo", "id", "num", "cod" from matching name candidates
        if (cleanCandidate.includes("nombre") || cleanCandidate.includes("apellido") || cleanCandidate.includes("paciente") || cleanCandidate.includes("cliente")) {
          if (key.includes("numero") || key.includes("num") || key.includes("codigo") || key.includes("cod") || key.includes("id")) {
            continue;
          }
        }
        if (!uuidRegex.test(val)) return val;
      }
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clients, clinicId } = body;

    if (!clinicId) {
      return NextResponse.json({ error: "Falta el identificador de la clínica (clinicId)" }, { status: 400 });
    }

    if (!Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json({ error: "El archivo no contiene filas con datos de pacientes para importar" }, { status: 400 });
    }

    const auth = await authenticateApiRequest(clinicId);
    if ("errorResponse" in auth) return auth.errorResponse;

    // Fetch clinic country default
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { country: true },
    });
    const defaultCountry = clinic?.country ? getCountryConfig(clinic.country).name : "España";

    // Retrieve maximum clientNumber to generate new sequential numbers without race conditions or collision
    const maxClient = await prisma.client.findFirst({
      orderBy: { clientNumber: "desc" },
      select: { clientNumber: true },
    });
    let nextClientNumber = maxClient ? maxClient.clientNumber + 1 : 1001;

    // Fetch existing active clients for this clinic to check duplicates by DNI/Document, Phone, or Email
    const existingClients = await prisma.client.findMany({
      where: { clinicId, deletedAt: null },
      select: {
        id: true,
        dniNif: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    // Lookup structures for fast and accurate duplicate detection
    const existingDnis = new Map<string, string>(); // cleanDni -> client.id
    // One phone or email can be legitimately shared by multiple clients (e.g. family members)
    const existingPhones = new Map<string, Array<{ id: string; firstName: string; lastName: string; normFullName: string }>>();
    const existingEmails = new Map<string, Array<{ id: string; firstName: string; lastName: string; normFullName: string }>>();
    const existingNamesSet = new Set<string>(); // normFullName -> exists
    const existingSingleNamesWithoutContact = new Set<string>(); // single name when no phone/dni/email

    for (const c of existingClients) {
      if (c.dniNif) {
        const dec = decrypt(c.dniNif);
        const norm = normalizeDni(dec);
        if (norm) existingDnis.set(norm, c.id);
      }

      const normFirst = (c.firstName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const normLast = (c.lastName && c.lastName !== "-" ? c.lastName : "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const normFull = `${normFirst} ${normLast}`.trim().replace(/\s+/g, "");

      const clientInfo = {
        id: c.id,
        firstName: normFirst,
        lastName: normLast,
        normFullName: normFull,
      };

      if (c.phone) {
        const cleanP = normalizePhone(c.phone);
        if (cleanP.length >= 7) {
          if (!existingPhones.has(cleanP)) existingPhones.set(cleanP, []);
          existingPhones.get(cleanP)!.push(clientInfo);
        }
      }

      if (c.email) {
        const cleanE = c.email.trim().toLowerCase();
        if (cleanE.includes("@")) {
          if (!existingEmails.has(cleanE)) existingEmails.set(cleanE, []);
          existingEmails.get(cleanE)!.push(clientInfo);
        }
      }

      if (normFull && normFull.length >= 4 && normFull !== "paciente") {
        existingNamesSet.add(normFull);
      }

      if (normFirst && (!normLast || normLast === "-") && !c.phone && !c.dniNif && !c.email && normFirst.length >= 3) {
        existingSingleNamesWithoutContact.add(normFirst);
      }
    }


    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let idx = 0; idx < clients.length; idx++) {
      const client = clients[idx];
      if (!client || typeof client !== "object") continue;

      // 1. Extract DNI / Document
      let dniRaw = extractFieldValue(client, [
        "dniNif", "DNI", "NIF", "NIE", "CIF", "Dni/nif", "DNI/NIF", "Documento",
        "Nº Documento", "Num Documento", "Identificación", "Identificacion",
        "Pasaporte", "Cedula", "Cédula", "Numero Documento", "Num_Documento"
      ]);
      if (dniRaw && (uuidRegex.test(dniRaw) || hex32Regex.test(dniRaw))) {
        dniRaw = null;
      }
      let cleanDni = normalizeDni(dniRaw);
      if (cleanDni && (uuidRegex.test(cleanDni) || hex32Regex.test(cleanDni))) {
        cleanDni = "";
        dniRaw = null;
      }

      // 2. Extract Phone & Email
      const phoneRaw = extractFieldValue(client, [
        "phone", "Teléfono", "Telefono", "phone_number", "celular", "Móvil", "Movil",
        "Tlf", "WhatsApp", "Teléfono Móvil", "Telefono Movil", "Tel"
      ]);
      const cleanPhone = normalizePhone(phoneRaw);

      const emailRaw = extractFieldValue(client, [
        "email", "Email", "correo", "e-mail", "Correo Electrónico", "Correo", "Mail"
      ]);
      const cleanEmail = emailRaw ? emailRaw.trim().toLowerCase() : "";

      // 3. Extract Name fields
      let firstName = extractFieldValue(client, [
        "firstName", "Nombres", "nombres", "Nombre", "first_name", "firstname", "Primer Nombre",
        "Nombre Paciente", "Nombre del Paciente", "Nombre_Paciente"
      ]) || "";

      let lastName = extractFieldValue(client, [
        "lastName", "Apellidos", "apellidos", "last_name", "lastname", "Primer Apellido",
        "Segundo Apellido", "Apellidos Paciente", "Apellido", "apellido", "Apellidos_Paciente"
      ]) || "";

      const fullNameCandidate = extractFieldValue(client, [
        "Nombre y Apellidos", "Nombre y apellidos", "Nombre Completo", "nombreyapellidos",
        "nombrecompleto", "Nombre del Paciente", "Nombre y Apellidos del Paciente",
        "Paciente / Nombre", "Nombre del cliente", "Titular"
      ]);

      // Sanitize names against numbers/UUIDs
      if (!isValidPersonName(firstName)) firstName = "";
      if (!isValidPersonName(lastName)) lastName = "";
      const validFullName = isValidPersonName(fullNameCandidate) ? fullNameCandidate! : "";

      // Smart splitting if full name is provided or if firstName contains both
      if (validFullName && (!firstName || (firstName && !lastName))) {
        const source = (firstName && (firstName.includes(" ") || firstName.includes(",")))
          ? firstName
          : (validFullName || firstName).trim();

        if (source.includes(",")) {
          // Format: "Apellidos, Nombre"
          const [apell, ...rest] = source.split(",");
          lastName = apell.trim();
          firstName = rest.join(" ").trim();
        } else {
          // Format: "Nombre Apellidos"
          const tokens = source.split(/\s+/).filter(Boolean);
          if (tokens.length === 1) {
            firstName = tokens[0];
            if (!lastName) lastName = "-";
          } else if (tokens.length === 2) {
            firstName = tokens[0];
            lastName = tokens[1];
          } else if (tokens.length === 3) {
            firstName = tokens[0];
            lastName = `${tokens[1]} ${tokens[2]}`;
          } else if (tokens.length >= 4) {
            firstName = tokens.slice(0, tokens.length - 2).join(" ");
            lastName = tokens.slice(tokens.length - 2).join(" ");
          }
        }
      } else if (firstName && !lastName && (firstName.includes(" ") || firstName.includes(","))) {
        const source = firstName.trim();
        if (source.includes(",")) {
          const [apell, ...rest] = source.split(",");
          lastName = apell.trim();
          firstName = rest.join(" ").trim();
        } else {
          const tokens = source.split(/\s+/).filter(Boolean);
          if (tokens.length === 1) {
            firstName = tokens[0];
            lastName = "-";
          } else if (tokens.length === 2) {
            firstName = tokens[0];
            lastName = tokens[1];
          } else if (tokens.length === 3) {
            firstName = tokens[0];
            lastName = `${tokens[1]} ${tokens[2]}`;
          } else if (tokens.length >= 4) {
            firstName = tokens.slice(0, tokens.length - 2).join(" ");
            lastName = tokens.slice(tokens.length - 2).join(" ");
          }
        }
      }

      // Final validation of names
      if (!isValidPersonName(firstName)) firstName = "";
      if (!isValidPersonName(lastName) || lastName === "-") lastName = "-";

      // If both are empty or invalid, check if we have any other identifying info
      if (!firstName && (!lastName || lastName === "-")) {
        if (cleanDni || cleanPhone || cleanEmail) {
          firstName = "Paciente";
          lastName = cleanDni || cleanPhone || `Importado-${idx + 1}`;
        } else {
          // Empty or invalid row: skip completely (prevents phantom records like 93, 94, 97, 610)
          continue;
        }
      }

      // 4. CHECK IF PATIENT ALREADY EXISTS (DNI / DOCUMENT CHECK)
      let isDuplicate = false;

      // Primary check: Identity Document (DNI / NIE / NIF / Passport)
      if (cleanDni && cleanDni.length >= 5) {
        if (existingDnis.has(cleanDni)) {
          isDuplicate = true;
        }
      }

      const incomingFirst = firstName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const incomingLast = (lastName !== "-" ? lastName : "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const incomingFullName = `${incomingFirst} ${incomingLast}`.trim().replace(/\s+/g, "");

      // Secondary check: Phone match + Name confirmation
      if (!isDuplicate && cleanPhone && cleanPhone.length >= 7) {
        const clientsWithPhone = existingPhones.get(cleanPhone);
        if (clientsWithPhone && clientsWithPhone.length > 0) {
          for (const ec of clientsWithPhone) {
            // Exact full name match
            if (incomingFullName && ec.normFullName && incomingFullName === ec.normFullName) {
              isDuplicate = true;
              break;
            }
            // First + Last name both match
            if (incomingFirst && incomingLast && ec.firstName && ec.lastName && ec.lastName !== "-" && incomingLast !== "-") {
              if (incomingFirst === ec.firstName && (incomingLast === ec.lastName || ec.lastName.includes(incomingLast) || incomingLast.includes(ec.lastName))) {
                isDuplicate = true;
                break;
              }
            }
          }
        }
      }

      // Tertiary check: Email match + Name confirmation
      if (!isDuplicate && cleanEmail && cleanEmail.includes("@")) {
        const clientsWithEmail = existingEmails.get(cleanEmail);
        if (clientsWithEmail && clientsWithEmail.length > 0) {
          for (const ec of clientsWithEmail) {
            if (incomingFullName && ec.normFullName && incomingFullName === ec.normFullName) {
              isDuplicate = true;
              break;
            }
            if (incomingFirst && incomingLast && ec.firstName && ec.lastName && ec.lastName !== "-" && incomingLast !== "-") {
              if (incomingFirst === ec.firstName && incomingLast === ec.lastName) {
                isDuplicate = true;
                break;
              }
            }
          }
        }
      }

      // Quaternary check: Exact full name match (only if both first and last names are valid and non-empty)
      if (!isDuplicate && incomingFirst && incomingLast && incomingLast !== "-" && incomingFullName.length >= 5) {
        if (existingNamesSet.has(incomingFullName)) {
          if (!cleanPhone || cleanPhone.length < 7) {
            isDuplicate = true;
          }
        }
      }

      // Also match if client has only a single name without phone/dni/email
      if (!isDuplicate && incomingFirst && (!incomingLast || incomingLast === "-") && !cleanDni && !cleanPhone && !cleanEmail && incomingFirst.length >= 3) {
        if (existingSingleNamesWithoutContact.has(incomingFirst)) {
          isDuplicate = true;
        }
      }


      // If patient already exists, skip to prevent duplicates
      if (isDuplicate) {
        skippedCount++;
        continue;
      }

      // 5. EXTRACT REMAINING FIELDS
      const birthDateRaw = extractFieldValue(client, [
        "birthDate", "Fecha De Nacimiento", "Fecha de nacimiento", "Fecha Nacimiento",
        "birth_date", "Cumpleaños", "F. Nacimiento", "FNacimiento", "F_Nacimiento"
      ]);
      const birthDate = parseDate(birthDateRaw);

      let gender = extractFieldValue(client, ["gender", "Género", "Genero", "sexo", "Sexo"]) || null;
      if (gender) {
        const gLow = gender.toLowerCase().trim();
        if (gLow.startsWith("m") && !gLow.startsWith("mu")) gender = "Masculino";
        else if (gLow.startsWith("f") || gLow.startsWith("mu")) gender = "Femenino";
        else gender = "Otro";
      }

      const address = extractFieldValue(client, ["address", "Dirección", "Direccion", "Calle", "Domicilio"]);
      const municipality = extractFieldValue(client, ["municipality", "Municipio", "Ciudad", "Población", "Poblacion", "Localidad"]);
      const postalCode = extractFieldValue(client, ["postalCode", "Código Postal", "Codigo Postal", "CP", "C.P."]);
      const country = extractFieldValue(client, ["country", "País", "Pais"]) || defaultCountry;
      const iban = extractFieldValue(client, ["iban", "Iban", "IBAN", "Cuenta", "Cuenta Bancaria"]);
      const bic = extractFieldValue(client, ["bic", "Bic", "BIC", "SWIFT"]);
      const tags = extractFieldValue(client, ["tags", "Etiquetas", "Tags"]);

      // Medical & Clinical notes
      const aestheticTreatments = extractFieldValue(client, ["aestheticTreatments", "Tratamientos Estéticos Previos", "Tratamientos Previos", "Tratamientos"]);
      const allergies = extractFieldValue(client, ["allergies", "Alergias", "Alergia"]);
      const medication = extractFieldValue(client, ["medication", "Medicación", "Medicacion", "Tratamiento actual"]);
      const medicalHistory = extractFieldValue(client, ["medicalHistory", "Antecedentes Médicos", "Antecedentes Medicos", "Historial Médico", "Patologías", "Patologias"]);
      const otherNotes = extractFieldValue(client, ["otherNotes", "Otros", "Notas", "Observaciones"]);

      // Tutor details
      const tutorName = extractFieldValue(client, ["tutorName", "Nombre Tutor", "Nombre_Tutor"]);
      const tutorLastName = extractFieldValue(client, ["tutorLastName", "Apellidos Tutor", "Apellidos_Tutor"]);
      const tutorDniNif = extractFieldValue(client, ["tutorDniNif", "DNI Tutor", "NIF Tutor", "DNI_Tutor"]);
      const tutorPhone = extractFieldValue(client, ["tutorPhone", "Teléfono Tutor", "Telefono Tutor", "Telefono_Tutor"]);
      const tutorEmail = extractFieldValue(client, ["tutorEmail", "Email Tutor", "Correo Tutor", "Email_Tutor"]);
      const tutorAddress = extractFieldValue(client, ["tutorAddress", "Dirección Tutor", "Direccion Tutor", "Calle_Tutor"]);
      const tutorPostalCode = extractFieldValue(client, ["tutorPostalCode", "Código Postal Tutor", "Codigo Postal Tutor", "Codigo_Postal_Tutor"]);
      const tutorMunicipality = extractFieldValue(client, ["tutorMunicipality", "Municipio Tutor", "Ciudad Tutor", "Municipio_Tutor"]);

      // Assign sequential clientNumber
      const assignedClientNumber = nextClientNumber++;

      try {
        const createdClient = await prisma.client.create({
          data: {
            clientNumber: assignedClientNumber,
            clinicId,
            firstName,
            lastName,
            phone: phoneRaw ? String(phoneRaw).trim() : null,
            email: cleanEmail || null,
            dniNif: cleanDni || dniRaw || null,
            birthDate,
            gender,
            address,
            municipality,
            postalCode,
            country,
            iban,
            bic,
            tags,
            aestheticTreatments,
            allergies,
            medication,
            medicalHistory,
            otherNotes,
            tutorName,
            tutorLastName,
            tutorDniNif,
            tutorPhone,
            tutorEmail,
            tutorAddress,
            tutorPostalCode,
            tutorMunicipality,
            isSelfEmployed: false,
            isCompany: false,
            receivesReminders: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        createdCount++;

        // Add to in-memory index to prevent intra-file duplicates
        if (cleanDni) existingDnis.set(cleanDni, createdClient.id);
        const newClientInfo = {
          id: createdClient.id,
          firstName: incomingFirst,
          lastName: incomingLast,
          normFullName: incomingFullName,
        };
        if (cleanPhone && cleanPhone.length >= 7) {
          if (!existingPhones.has(cleanPhone)) existingPhones.set(cleanPhone, []);
          existingPhones.get(cleanPhone)!.push(newClientInfo);
        }
        if (cleanEmail && cleanEmail.includes("@")) {
          if (!existingEmails.has(cleanEmail)) existingEmails.set(cleanEmail, []);
          existingEmails.get(cleanEmail)!.push(newClientInfo);
        }
        if (incomingFullName && incomingFullName.length >= 4) {
          existingNamesSet.add(incomingFullName);
        }
        if (incomingFirst && (!incomingLast || incomingLast === "-") && !cleanDni && !cleanPhone && !cleanEmail && incomingFirst.length >= 3) {
          existingSingleNamesWithoutContact.add(incomingFirst);
        }

      } catch (rowErr) {
        console.error(`Error creating client on row ${idx + 1}:`, rowErr);
        errorCount++;
      }
    }

    let message = `Importación completada: ${createdCount} nuevos pacientes añadidos correctamente.`;
    if (skippedCount > 0) {
      message += ` ${skippedCount} pacientes omitidos porque ya estaban registrados en la clínica (por DNI, teléfono o nombre ya existentes).`;
    }
    if (errorCount > 0) {
      message += ` (${errorCount} filas no se pudieron procesar por formato no válido).`;
    }

    return NextResponse.json({
      success: true,
      createdCount,
      skippedCount,
      errorCount,
      totalRows: clients.length,
      message,
    });
  } catch (error) {
    console.error("Error importing clients:", error);
    return NextResponse.json({ error: "Error en el servidor al realizar la importación" }, { status: 500 });
  }
}
