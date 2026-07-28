import "dotenv/config";
import { prisma } from "../src/lib/db.ts";

async function main() {
  const clinicId = "c0172310-7113-475b-bdee-29fe502c7fa7";
  console.log("=================== DEBUGGING TRIGGER CRON LIVE ===================");

  const activeReminders = await prisma.appointmentReminder.findMany({
    where: {
      clinicId,
      enabled: true,
      channel: { in: ["EMAIL", "WHATSAPP", "SMS"] },
      isSystem: false,
    },
  });

  console.log("ACTIVE REMINDERS:", JSON.stringify(activeReminders, null, 2));

  const now = new Date();
  const pastLimit = new Date();
  pastLimit.setDate(now.getDate() - 7);
  const futureLimit = new Date();
  futureLimit.setDate(now.getDate() + 7);

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      deletedAt: null,
      start: {
        gte: pastLimit,
        lte: futureLimit,
      },
    },
    include: { client: true, service: true, clinic: true },
  });

  console.log(`\nFound ${appointments.length} appointments in window (-7d to +7d). Current time (UTC): ${now.toISOString()}`);

  for (const app of appointments) {
    console.log(`\n--- Appointment [ID: ${app.id}] ---`);
    console.log(`Client: ${app.client?.firstName} ${app.client?.lastName} (${app.client?.phone}) | receivesReminders: ${app.client?.receivesReminders}`);
    console.log(`Start: ${app.start.toISOString()} | Status: ${app.status} | Service: ${app.service?.name} (ID: ${app.serviceId})`);

    if (app.client && app.client.receivesReminders === false) {
      console.log("  -> SKIPPED: Client receivesReminders is FALSE");
      continue;
    }

    for (const reminder of activeReminders) {
      console.log(`  > Reminder [${reminder.name}] | Channel: ${reminder.channel} | Condition: ${reminder.condition} | Timing: ${reminder.timing} | hBefore: ${reminder.hoursBefore} | mBefore: ${reminder.minutesBefore}`);

      const isStatusMatch =
        reminder.condition === app.status ||
        (reminder.timing === "BEFORE" && (app.status === "PENDING" || app.status === "CONFIRMED")) ||
        (reminder.timing === "AFTER" && reminder.condition === "COMPLETED" && app.status === "COMPLETED");

      if (!isStatusMatch) {
        console.log(`     SKIPPED: Status mismatch (Reminder expects "${reminder.condition}", App is "${app.status}")`);
        continue;
      }

      const serviceMatch =
        reminder.allServices ||
        (reminder.serviceIds ? reminder.serviceIds.split(",").includes(app.serviceId) : false);

      if (!serviceMatch) {
        console.log(`     SKIPPED: Service mismatch (Reminder serviceIds="${reminder.serviceIds}", App serviceId="${app.serviceId}")`);
        continue;
      }

      const startD = new Date(app.start);
      const hoursBefore = reminder.hoursBefore || 0;
      const minutesBefore = reminder.minutesBefore || 0;
      const triggerTimeOffset = (hoursBefore * 60 * 60 * 1000) + (minutesBefore * 60 * 1000);

      if (reminder.timing === "AFTER") {
        const timeToSend = startD.getTime() + triggerTimeOffset;
        if (now.getTime() < timeToSend) {
          console.log(`     SKIPPED: Not time yet (now ${now.toISOString()} < timeToSend ${new Date(timeToSend).toISOString()})`);
          continue;
        }
      } else {
        const timeToSend = startD.getTime() - triggerTimeOffset;
        if (now.getTime() < timeToSend) {
          console.log(`     SKIPPED: Not time yet (now ${now.toISOString()} < timeToSend ${new Date(timeToSend).toISOString()})`);
          continue;
        }
      }

      console.log(`     MATCHED! Checking deduplication existingLog...`);

      const dateFormatted = startD.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
      const timeFormatted = startD.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

      const vars = {
        "{{Cliente:Nombre}}": app.client?.firstName || "",
        "{{Cliente:Apellidos}}": app.client?.lastName || "",
        "{{Nombre_Consulta}}": app.clinic?.name || "Clifav",
        "{{Fecha_Hora_Cita}}": `${dateFormatted} a las ${timeFormatted}`,
        "{{Fecha_Cita}}": dateFormatted,
        "{{Hora_Cita}}": timeFormatted,
        "{{Nombre_Servicio}}": app.service?.name || "",
      };

      let message = reminder.message;
      for (const [key, val] of Object.entries(vars)) {
        message = message.replaceAll(key, val);
      }

      const existingLog = await prisma.notificationLog.findFirst({
        where: {
          appointmentId: app.id,
          channel: reminder.channel,
          message: message,
        },
      });

      if (existingLog) {
        console.log(`     SKIPPED: Log already exists in DB! (Log ID: ${existingLog.id}, Status: ${existingLog.status}, SentAt: ${existingLog.sentAt})`);
      } else {
        console.log(`     🔥 READY TO SEND! No existing log found for appointment ${app.id}`);
      }
    }
  }

  process.exit(0);
}

main().catch(console.error);
