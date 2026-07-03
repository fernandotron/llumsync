require('dotenv').config();
const Database = require('better-sqlite3');
const { Client } = require('pg');

async function checkSqlite(path) {
  console.log(`Checking SQLite at: ${path}`);
  try {
    const db = new Database(path);
    const clinics = db.prepare("SELECT id, name, metaAccessToken, metaPhoneNumberId, metaTemplateName FROM Clinic").all();
    clinics.forEach(c => {
      if (c.metaAccessToken || c.metaPhoneNumberId) {
        console.log(`  [FOUND in SQLite ${path}] Clinic: ${c.name} (ID: ${c.id})`);
        console.log(`    metaAccessToken: ${c.metaAccessToken ? 'SET' : 'NULL'}`);
        console.log(`    metaPhoneNumberId: ${c.metaPhoneNumberId || 'NULL'}`);
        console.log(`    metaTemplateName: ${c.metaTemplateName || 'NULL'}`);
      }
    });
    db.close();
  } catch (err) {
    console.error(`  Error checking SQLite ${path}:`, err.message);
  }
}

async function checkPostgres() {
  console.log(`Checking PostgreSQL...`);
  if (!process.env.DATABASE_URL) {
    console.log("  No DATABASE_URL in environment.");
    return;
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query('SELECT id, name, "metaAccessToken", "metaPhoneNumberId", "metaTemplateName" FROM "Clinic"');
    res.rows.forEach(c => {
      if (c.metaAccessToken || c.metaPhoneNumberId) {
        console.log(`  [FOUND in PostgreSQL] Clinic: ${c.name} (ID: ${c.id})`);
        console.log(`    metaAccessToken: ${c.metaAccessToken ? 'SET' : 'NULL'}`);
        console.log(`    metaPhoneNumberId: ${c.metaPhoneNumberId || 'NULL'}`);
        console.log(`    metaTemplateName: ${c.metaTemplateName || 'NULL'}`);
      }
    });
  } catch (err) {
    console.error(`  Error checking PostgreSQL:`, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await checkSqlite('./prisma/dev.db');
  await checkSqlite('./dev.db');
  await checkPostgres();
}

run();
