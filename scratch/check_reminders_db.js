const Database = require('better-sqlite3');

function checkReminders() {
  const db = new Database('./prisma/dev.db');
  try {
    const rows = db.prepare("SELECT * FROM AppointmentReminder").all();
    console.log(`Found ${rows.length} rows in AppointmentReminder table:`);
    rows.forEach(r => {
      console.log(`- ID: ${r.id}, Name: ${r.name}, Channel: ${r.channel}, Message:`);
      console.log(JSON.stringify(r.message));
    });
  } catch (err) {
    console.error("Error reading database:", err);
  } finally {
    db.close();
  }
}

checkReminders();
