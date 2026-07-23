const Database = require('better-sqlite3');

function listUsers(dbPath) {
  console.log(`\n=== USERS IN ${dbPath} ===`);
  try {
    const db = new Database(dbPath);
    const users = db.prepare("SELECT id, email, name FROM User").all();
    users.forEach(u => {
      console.log(`- Email: ${u.email}, Name: ${u.name}, ID: ${u.id}`);
    });
    db.close();
  } catch (err) {
    console.error(`Error reading ${dbPath}:`, err.message);
  }
}

listUsers('./dev.db');
listUsers('./prisma/dev.db');
