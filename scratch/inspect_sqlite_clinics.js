const Database = require('better-sqlite3');

function checkClinics() {
  const db = new Database('./prisma/dev.db');
  try {
    const clinics = db.prepare("SELECT * FROM Clinic").all();
    console.log("Clinics in SQLite:");
    console.log(clinics);

    const reminders = db.prepare("SELECT * FROM AppointmentReminder").all();
    console.log("Reminders in SQLite:");
    console.log(reminders);
  } catch (err) {
    console.error("Error reading sqlite:", err);
  } finally {
    db.close();
  }
}

checkClinics();
