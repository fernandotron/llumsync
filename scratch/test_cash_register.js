import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/lib/db.ts";

async function main() {
  console.log("Testing cash register database queries with app prisma instance...");
  try {
    const clinics = await prisma.clinic.findMany();
    console.log("Clinics in DB:", clinics.map(c => ({ id: c.id, name: c.name })));

    if (clinics.length === 0) {
      console.log("No clinics found!");
      return;
    }

    const testClinicId = clinics[0].id;
    console.log("Testing with Clinic ID:", testClinicId);

    // Test creating a session
    const session = await prisma.cashRegisterSession.create({
      data: {
        clinicId: testClinicId,
        initialCash: 300.0,
        notes: "Test session from script",
        status: "OPEN",
        openedAt: new Date(),
      },
    });

    console.log("Successfully created session ID:", session.id);

    // Test finding active session
    const active = await prisma.cashRegisterSession.findFirst({
      where: { clinicId: testClinicId, status: "OPEN" },
    });
    console.log("Active session found:", active?.id);

    // Cleanup test session
    await prisma.cashRegisterSession.delete({ where: { id: session.id } });
    console.log("Test session deleted successfully.");
  } catch (err) {
    console.error("DB Test Error:", err);
  } finally {
    process.exit(0);
  }
}

main();
