require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query('SELECT * FROM "Clinic"');
    console.log("Full Clinics in Postgres:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Error reading clinics:", err);
  } finally {
    await client.end();
  }
}

main();
