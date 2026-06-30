import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: "file:./dev.db",
  }),
});

async function main() {
  // Clear database
  await prisma.appointment.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.signedDocument.deleteMany();
  await prisma.client.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinic.deleteMany();

  // Create two clinics
  const clinic1 = await prisma.clinic.create({
    data: {
      name: "Clínica Fisioterapia Clifav Central",
      address: "Calle Mayor 12, Madrid",
      phone: "+34 912 345 678",
      email: "central@clifav.com",
    }
  });

  const clinic2 = await prisma.clinic.create({
    data: {
      name: "Clínica Fisioterapia Clifav Norte",
      address: "Av. de la Ilustración 45, Madrid",
      phone: "+34 913 987 654",
      email: "norte@clifav.com",
    }
  });

  // Create users
  const admin = await prisma.user.create({
    data: {
      email: "admin@clifav.com",
      password: "admin", // in a demo app we use simple plain passwords
      name: "Dra. María García",
      role: "ADMIN",
      phone: "+34 600 111 222",
      clinics: { connect: [{ id: clinic1.id }, { id: clinic2.id }] }
    }
  });

  const doctor1 = await prisma.user.create({
    data: {
      email: "dr.sanz@clifav.com",
      password: "doctor",
      name: "Dr. Alberto Sanz",
      role: "DOCTOR",
      phone: "+34 600 333 444",
      clinics: { connect: [{ id: clinic1.id }] },
      permissionsJson: JSON.stringify({
        agenda: ["Sus agendas", "No eliminar citas"],
        clientes: ["Ver clientes", "Ver datos personales", "Ver documentos", "Formularios", "Seguimientos", "Editar clientes"],
        configuracion: ["Editar su propio horario"],
        contabilidad: ["Solo cobrar", `Facturas - ${clinic1.name}`],
        estadisticas: [],
        otros: ["Mostrar precio servicios"]
      })
    }
  });

  const therapist = await prisma.user.create({
    data: {
      email: "laura.gomez@clifav.com",
      password: "therapist",
      name: "Laura Gómez (Osteópata)",
      role: "THERAPIST",
      phone: "+34 600 555 666",
      clinics: { connect: [{ id: clinic1.id }, { id: clinic2.id }] },
      permissionsJson: JSON.stringify({
        agenda: ["Sus agendas", "Sólo lectura"],
        clientes: ["Ver clientes", "Ver datos personales"],
        configuracion: [],
        contabilidad: [],
        estadisticas: [],
        otros: []
      })
    }
  });

  // Shifts for users
  // 1 is Monday, 5 is Friday
  for (let day = 1; day <= 5; day++) {
    await prisma.shift.create({
      data: {
        userId: admin.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "17:00",
        clinicId: clinic1.id,
      }
    });
    await prisma.shift.create({
      data: {
        userId: doctor1.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "18:00",
        clinicId: clinic1.id,
      }
    });
    await prisma.shift.create({
      data: {
        userId: therapist.id,
        dayOfWeek: day,
        startTime: "10:00",
        endTime: "19:00",
        clinicId: clinic2.id,
      }
    });
  }

  // Services
  const serv1 = await prisma.service.create({
    data: {
      name: "Fisioterapia General",
      price: 50.0,
      duration: 45,
      color: "#3b82f6", // Blue
      category: "Fisioterapia",
      description: "Sesión de fisioterapia general para tratamiento de dolores musculares y articulares.",
    }
  });

  const serv2 = await prisma.service.create({
    data: {
      name: "Osteopatía Estructural",
      price: 65.0,
      duration: 60,
      color: "#8b5cf6", // Purple
      category: "Osteopatía",
      description: "Tratamiento de osteopatía estructural integral.",
    }
  });

  const serv3 = await prisma.service.create({
    data: {
      name: "Drenaje Linfático",
      price: 55.0,
      duration: 45,
      color: "#ec4899", // Pink
      category: "Estética / Terapia",
      description: "Drenaje linfático manual corporal.",
    }
  });

  const serv4 = await prisma.service.create({
    data: {
      name: "Evaluación Inicial + Tratamiento",
      price: 70.0,
      duration: 75,
      color: "#10b981", // Green
      category: "Diagnóstico",
      description: "Primera consulta de diagnóstico, historia clínica y tratamiento inicial.",
    }
  });

  // Clients
  const client1 = await prisma.client.create({
    data: {
      clientNumber: 1001,
      firstName: "Carlos",
      lastName: "Rodríguez Ruiz",
      phone: "+34 622 333 444",
      email: "carlos.rod@gmail.com",
      dniNif: "12345678A",
      birthDate: new Date("1985-05-15"),
      gender: "Masculino",
      address: "Gran Vía 45, 4º B",
      municipality: "Madrid",
      postalCode: "28013",
      country: "España",
      tags: "Frecuente, Espalda",
      clinicId: clinic1.id,
      aestheticTreatments: "Ninguno",
      allergies: "Polen",
      medication: "Ninguna",
      medicalHistory: "Operación de rodilla en 2018. Dolor lumbar crónico.",
    }
  });

  const client2 = await prisma.client.create({
    data: {
      clientNumber: 1002,
      firstName: "Ana",
      lastName: "Martínez López",
      phone: "+34 655 444 333",
      email: "ana.martinez@hotmail.com",
      dniNif: "87654321B",
      birthDate: new Date("1992-09-22"),
      gender: "Femenino",
      address: "Calle de Alcalá 120, 2º A",
      municipality: "Madrid",
      postalCode: "28009",
      country: "España",
      tags: "Deportista, Cuello",
      clinicId: clinic1.id,
      aestheticTreatments: "Peeling facial (2025)",
      allergies: "Penicilina",
      medication: "Ibuprofeno ocasional",
      medicalHistory: "Contractura cervical por postura de oficina. Práctica de running regular.",
    }
  });

  const client3 = await prisma.client.create({
    data: {
      clientNumber: 1003,
      firstName: "Juan",
      lastName: "Pérez Gómez",
      phone: "+34 688 999 000",
      email: "juan.perez@yahoo.es",
      dniNif: "56781234C",
      birthDate: new Date("2000-01-10"),
      gender: "Masculino",
      address: "Paseo de la Castellana 200",
      municipality: "Madrid",
      postalCode: "28046",
      country: "España",
      tags: "Nuevo",
      clinicId: clinic2.id,
      aestheticTreatments: "Ninguno",
      allergies: "Ninguna",
      medication: "Ninguna",
      medicalHistory: "Esguince de tobillo izquierdo hace 2 semanas jugando fútbol.",
    }
  });

  // Appointments
  const today = new Date();
  
  // Set times
  const app1Start = new Date(today);
  app1Start.setHours(10, 0, 0, 0);
  const app1End = new Date(today);
  app1End.setHours(10, 45, 0, 0);

  const app2Start = new Date(today);
  app2Start.setHours(11, 30, 0, 0);
  const app2End = new Date(today);
  app2End.setHours(12, 30, 0, 0);

  const app3Start = new Date(today);
  app3Start.setHours(15, 0, 0, 0);
  const app3End = new Date(today);
  app3End.setHours(15, 45, 0, 0);

  // Tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const appTomorrowStart = new Date(tomorrow);
  appTomorrowStart.setHours(10, 0, 0, 0);
  const appTomorrowEnd = new Date(tomorrow);
  appTomorrowEnd.setHours(11, 15, 0, 0);

  await prisma.appointment.create({
    data: {
      clientId: client1.id,
      userId: doctor1.id,
      serviceId: serv1.id,
      clinicId: clinic1.id,
      start: app1Start,
      end: app1End,
      notes: "Sesión de seguimiento de lumbalgia. Calor y masoterapia.",
      status: "CONFIRMED",
    }
  });

  await prisma.appointment.create({
    data: {
      clientId: client2.id,
      userId: doctor1.id,
      serviceId: serv2.id,
      clinicId: clinic1.id,
      start: app2Start,
      end: app2End,
      notes: "Dolor cervical irradiado. Manipulación osteopática.",
      status: "CONFIRMED",
    }
  });

  await prisma.appointment.create({
    data: {
      clientId: client3.id,
      userId: therapist.id,
      serviceId: serv3.id,
      clinicId: clinic2.id,
      start: app3Start,
      end: app3End,
      notes: "Tratamiento circulatorio post-esguince.",
      status: "PENDING",
    }
  });

  await prisma.appointment.create({
    data: {
      clientId: client1.id,
      userId: therapist.id,
      serviceId: serv4.id,
      clinicId: clinic1.id,
      start: appTomorrowStart,
      end: appTomorrowEnd,
      notes: "Primera cita para valoración osteopática.",
      status: "CONFIRMED",
    }
  });

  // Sales
  await prisma.sale.create({
    data: {
      invoiceNumber: "INV-2026-0001",
      clientId: client1.id,
      clinicId: clinic1.id,
      total: 50.0,
      paymentMethod: "CARD",
      itemsJson: JSON.stringify([{ type: "service", id: serv1.id, name: serv1.name, quantity: 1, price: serv1.price }]),
      createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    }
  });

  await prisma.sale.create({
    data: {
      invoiceNumber: "INV-2026-0002",
      clientId: client2.id,
      clinicId: clinic1.id,
      total: 65.0,
      paymentMethod: "CASH",
      itemsJson: JSON.stringify([{ type: "service", id: serv2.id, name: serv2.name, quantity: 1, price: serv2.price }]),
      createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    }
  });

  // Document templates
  await prisma.documentTemplate.create({
    data: {
      name: "Consentimiento Informado General",
      content: `<h1>Consentimiento Informado de Tratamiento</h1>
<p>Yo, <strong>{{client.firstName}} {{client.lastName}}</strong>, con DNI/NIF <strong>{{client.dniNif}}</strong>, autorizo a la clínica <strong>{{clinic.name}}</strong> a realizar el tratamiento prescrito.</p>
<p>He sido informado sobre las indicaciones, riesgos y beneficios del tratamiento.</p>
<p>Firmado en {{clinic.municipality}} el {{document.date}}.</p>
<p>{{signature.client}}</p>`
    }
  });

  await prisma.documentTemplate.create({
    data: {
      name: "Consentimiento de Tratamiento Estético",
      content: `<h1>Consentimiento Informado para Tratamiento Estético</h1>
<p>Yo, <strong>{{client.firstName}} {{client.lastName}}</strong>, con fecha de nacimiento <strong>{{client.birthDate}}</strong>, entiendo el procedimiento estético y los antecedentes explicados por el especialista.</p>
<p>Declaro no tener alergias a los productos excepto: <strong>{{client.allergies}}</strong>.</p>
<p>Firmado:</p>
<p>{{signature.client}}</p>`
    }
  });

  console.log("Seeding complete! Database populated.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
