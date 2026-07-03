const Database = require('better-sqlite3');

function inspectSqlite(dbPath) {
  console.log(`\n=== INSPECTING SQLITE: ${dbPath} ===`);
  try {
    const db = new Database(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log(`Tables found: ${tables.length}`);
    for (const table of tables) {
      const name = table.name;
      if (name.startsWith('_') || name === 'sqlite_sequence') continue;
      const countResult = db.prepare(`SELECT count(*) as count FROM "${name}"`).get();
      console.log(` - Table: ${name}, Rows: ${countResult.count}`);
      if (name === 'User') {
        const rows = db.prepare(`SELECT * FROM "User" LIMIT 5`).all();
        console.log(`   Sample Users:`, rows.map(r => ({ id: r.id, email: r.email, name: r.name })));
      }
      if (name === 'Clinic') {
        const rows = db.prepare(`SELECT * FROM "Clinic" LIMIT 5`).all();
        console.log(`   Sample Clinics:`, rows.map(r => ({ id: r.id, name: r.name })));
      }
    }
    db.close();
  } catch (err) {
    console.error(`Error inspecting ${dbPath}:`, err.message);
  }
}

inspectSqlite('./dev.db');
inspectSqlite('./prisma/dev.db');
