require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL.replace(/\/railway$/, '/postgres'); // Connect to default postgres db
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false');
    console.log("Databases in Postgres server:");
    console.log(res.rows.map(r => r.datname));
  } catch (err) {
    console.error("Error listing databases:", err.message);
  } finally {
    await client.end();
  }
}

main();
