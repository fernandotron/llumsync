require('dotenv').config();
const { Client } = require('pg');

async function checkRecent() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    
    // Check all clinics
    const clinics = await client.query('SELECT id, name, "metaAccessToken", "metaPhoneNumberId", "metaTemplateName" FROM "Clinic"');
    console.log("Clinics in Postgres:");
    console.log(clinics.rows);

    // Check last logs
    const logs = await client.query('SELECT * FROM "NotificationLog" ORDER BY "sentAt" DESC LIMIT 5');
    console.log("Last 5 logs in Postgres:");
    console.log(logs.rows);

    // Check reminders
    const reminders = await client.query('SELECT * FROM "AppointmentReminder"');
    console.log("Reminders in Postgres:");
    console.log(reminders.rows);
  } catch (err) {
    console.error("Error checking recent PG data:", err);
  } finally {
    await client.end();
  }
}

checkRecent();
