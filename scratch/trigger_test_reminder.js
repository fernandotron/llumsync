require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
// Native fetch is available in Node 18+

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: node scratch/trigger_test_reminder.js <clinicId> <recipientPhone> [metaAccessToken] [metaPhoneNumberId] [metaTemplateName]");
    console.log("Example: node scratch/trigger_test_reminder.js 417590d5-1ec6-4ea3-bfa1-68947916d724 34634021915 EAPAA... 10648215967 recordatorio_cita");
    process.exit(1);
  }

  const [clinicId, recipientPhone, metaAccessToken, metaPhoneNumberId, metaTemplateName = "recordatorio_cita"] = args;

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Update clinic credentials if provided
    if (metaAccessToken && metaPhoneNumberId) {
      console.log(`Updating credentials for clinic ${clinicId}...`);
      await prisma.clinic.update({
        where: { id: clinicId },
        data: {
          metaAccessToken,
          metaPhoneNumberId,
          metaTemplateName
        }
      });
      console.log("Clinic credentials updated successfully.");
    }

    // Verify clinic credentials are set
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic || !clinic.metaAccessToken || !clinic.metaPhoneNumberId) {
      console.error("ERROR: Clinic does not have Meta WhatsApp credentials configured in database.");
      console.log("Clinic data:", clinic);
      process.exit(1);
    }

    console.log("Using credentials:");
    console.log(`- Clinic: ${clinic.name}`);
    console.log(`- Token: ${clinic.metaAccessToken.slice(0, 10)}...`);
    console.log(`- Phone ID: ${clinic.metaPhoneNumberId}`);
    console.log(`- Template Name: ${clinic.metaTemplateName}`);

    // 2. Create or find a test client
    console.log("Creating/finding test client...");
    let clientRecord = await prisma.client.findFirst({
      where: {
        clinicId,
        phone: recipientPhone
      }
    });

    if (!clientRecord) {
      const maxClient = await prisma.client.findFirst({
        orderBy: { clientNumber: "desc" },
      });
      const nextClientNumber = maxClient ? maxClient.clientNumber + 1 : 1001;

      clientRecord = await prisma.client.create({
        data: {
          clinicId,
          clientNumber: nextClientNumber,
          firstName: "Paciente",
          lastName: "De Prueba",
          phone: recipientPhone,
          email: "test_whatsapp@clifav.com",
          receivesReminders: true,
          address: "Calle de Prueba 123"
        }
      });
      console.log(`Created new test client with ID: ${clientRecord.id}`);
    } else {
      // Ensure receivesReminders is true and phone is correct
      clientRecord = await prisma.client.update({
        where: { id: clientRecord.id },
        data: {
          receivesReminders: true,
          firstName: "Paciente",
          lastName: "De Prueba"
        }
      });
      console.log(`Using existing client with ID: ${clientRecord.id}`);
    }

    // 3. Find or create a service
    let serviceRecord = await prisma.service.findFirst({
      where: { clinicId }
    });

    if (!serviceRecord) {
      serviceRecord = await prisma.service.create({
        data: {
          clinicId,
          name: "Consulta General",
          duration: 30,
          price: 50,
          color: "#3b82f6",
          type: "Presencial"
        }
      });
      console.log(`Created test service: ${serviceRecord.name}`);
    }

    // 4. Find user and create an appointment in the next 24 hours
    console.log("Finding user for appointment...");
    const staffUser = await prisma.user.findFirst({
      where: {
        clinics: {
          some: { id: clinicId }
        }
      }
    }) || await prisma.user.findFirst();

    if (!staffUser) {
      console.error("ERROR: No user found in the database to assign to the appointment.");
      process.exit(1);
    }

    console.log(`Using user: ${staffUser.name} (${staffUser.email})`);
    console.log("Creating test appointment...");
    const appDate = new Date();
    appDate.setHours(appDate.getHours() + 24); // 24 hours in the future
    
    const appointmentRecord = await prisma.appointment.create({
      data: {
        start: appDate,
        end: new Date(appDate.getTime() + 30 * 60000), // 30 mins later
        status: "PENDING",
        notes: "Creada para probar recordatorio automático de WhatsApp",
        client: { connect: { id: clientRecord.id } },
        user: { connect: { id: staffUser.id } },
        service: { connect: { id: serviceRecord.id } },
        clinic: { connect: { id: clinicId } }
      }
    });
    console.log(`Created test appointment: ID: ${appointmentRecord.id}, Start: ${appointmentRecord.start}`);

    // 5. Ensure there is an active reminder for WHATSAPP
    console.log("Creating/ensuring active WHATSAPP reminder exists...");
    let reminderRecord = await prisma.appointmentReminder.findFirst({
      where: {
        clinicId,
        channel: "WHATSAPP",
        condition: "PENDING",
        isSystem: false
      }
    });

    if (!reminderRecord) {
      reminderRecord = await prisma.appointmentReminder.create({
        data: {
          clinicId,
          name: "Recordatorio de WhatsApp Auto",
          channel: "WHATSAPP",
          condition: "PENDING",
          hoursBefore: 24,
          minutesBefore: 0,
          message: "Hola {{Cliente:Nombre}}, te recordamos tu cita para {{Nombre_Servicio}} el {{Fecha_Hora_Cita}} en {{Nombre_Consulta}}.",
          allServices: true,
          enabled: true,
          isSystem: false,
          triggerWhen: "BOTH"
        }
      });
      console.log(`Created active appointment reminder: ID ${reminderRecord.id}`);
    } else {
      // Ensure it is enabled
      reminderRecord = await prisma.appointmentReminder.update({
        where: { id: reminderRecord.id },
        data: { enabled: true }
      });
      console.log(`Using active reminder: ID ${reminderRecord.id}`);
    }

    // 6. Delete any existing NotificationLog for this appointment to ensure it isn't skipped
    await prisma.notificationLog.deleteMany({
      where: {
        appointmentId: appointmentRecord.id,
        channel: "WHATSAPP"
      }
    });

    // 7. Invoke the API trigger route locally
    console.log("Triggering local reminders cron simulation via API endpoint...");
    const response = await global.fetch('http://localhost:3000/api/notifications/trigger-cron', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinicId })
    });

    const result = await response.json();
    console.log("\n--- SIMULATION RESPONSE ---");
    console.log(JSON.stringify(result, null, 2));
    console.log("----------------------------\n");

    // Clean up the test appointment and client so we don't pollute the calendar
    console.log("Cleaning up test appointment...");
    await prisma.appointment.delete({ where: { id: appointmentRecord.id } });
    console.log("Cleanup completed.");

  } catch (err) {
    console.error("Error during test reminder trigger:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
