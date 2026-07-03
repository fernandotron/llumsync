require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query('SELECT email, password FROM "User"');
    console.log("Users and passwords:");
    console.log(res.rows);
  } catch (err) {
    console.error("Error reading users:", err);
  } finally {
    await client.end();
  }
}

main();
