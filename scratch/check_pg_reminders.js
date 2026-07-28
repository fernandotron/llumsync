import "dotenv/config";
import { prisma } from "../src/lib/db.ts";

async function main() {
  console.log("=== REMINDERS (AppointmentReminder) ===");
  const reminders = await prisma.appointmentReminder.findMany();
  console.log(JSON.stringify(reminders, null, 2));
  process.exit(0);
}

main().catch(console.error);
