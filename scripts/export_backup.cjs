const fs = require('fs');
const path = require('path');

// Leer variables de .env manualmente
const envPath = path.join(process.cwd(), '.env');
let databaseUrl = process.env.DATABASE_URL;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key === 'DATABASE_URL') {
        databaseUrl = val;
      }
    }
  }
}

if (!databaseUrl) {
  console.error("ERROR: No se encontró DATABASE_URL en process.env ni en .env");
  process.exit(1);
}

const { Pool } = require(path.join(process.cwd(), 'node_modules', 'pg'));

async function createFullBackup() {
  console.log("Conectando a Railway PostgreSQL...");
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log("Conectado con éxito a Railway.");

    // 1. Obtener todas las tablas del esquema public
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tableNames = tablesRes.rows.map(r => r.table_name);
    console.log(`Tablas encontradas: ${tableNames.length}`);

    const backupData = {
      version: "2.0",
      source: "Railway PostgreSQL",
      database: "railway",
      timestamp: new Date().toISOString(),
      tableCount: tableNames.length,
      tables: {},
      summary: {}
    };

    let sqlDump = `-- BACKUP COMPLETO RAILWAY POSTGRESQL - CLIFAV\n`;
    sqlDump += `-- Generado: ${new Date().toISOString()}\n`;
    sqlDump += `-- Base de datos: railway\n\n`;
    sqlDump += `SET statement_timeout = 0;\nSET lock_timeout = 0;\nSET client_encoding = 'UTF8';\n\n`;

    let totalRows = 0;

    for (const table of tableNames) {
      // Obtener columnas
      const colsRes = await client.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [table]);

      const columns = colsRes.rows.map(c => c.column_name);

      // Obtener todos los registros
      const dataRes = await client.query(`SELECT * FROM "${table}"`);
      const rows = dataRes.rows;
      totalRows += rows.length;

      backupData.tables[table] = {
        rowCount: rows.length,
        columns: columns,
        rows: rows
      };
      backupData.summary[table] = rows.length;

      console.log(`Tabla [${table}]: ${rows.length} registros extraídos.`);

      // Generar sentencias SQL INSERT para cada fila
      if (rows.length > 0) {
        sqlDump += `\n-- Tabla: "${table}" (${rows.length} filas)\n`;
        const colList = columns.map(c => `"${c}"`).join(", ");

        for (const row of rows) {
          const values = columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return "NULL";
            if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
            if (typeof val === "number") return val;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === "object") {
              const jsonStr = JSON.stringify(val).replace(/'/g, "''");
              return `'${jsonStr}'`;
            }
            const strVal = String(val).replace(/'/g, "''");
            return `'${strVal}'`;
          }).join(", ");

          sqlDump += `INSERT INTO "${table}" (${colList}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
        }
      }
    }

    backupData.totalRows = totalRows;
    console.log(`\nExtracción completada. Total de registros: ${totalRows}`);

    // Asegurar carpetas de destino
    const projectBackupsDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(projectBackupsDir)) {
      fs.mkdirSync(projectBackupsDir, { recursive: true });
    }

    const desktopDir = "C:\\Users\\Fernando\\Desktop";

    const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const jsonFileName = `backup-railway-${dateStr}.json`;
    const sqlFileName = `backup-railway-${dateStr}.sql`;

    const projectJsonPath = path.join(projectBackupsDir, jsonFileName);
    const projectSqlPath = path.join(projectBackupsDir, sqlFileName);
    const desktopJsonPath = path.join(desktopDir, jsonFileName);
    const desktopSqlPath = path.join(desktopDir, sqlFileName);

    const jsonContent = JSON.stringify(backupData, null, 2);

    // Guardar en /backups
    fs.writeFileSync(projectJsonPath, jsonContent, "utf-8");
    fs.writeFileSync(projectSqlPath, sqlDump, "utf-8");

    // Guardar en el Escritorio (Desktop)
    fs.writeFileSync(desktopJsonPath, jsonContent, "utf-8");
    fs.writeFileSync(desktopSqlPath, sqlDump, "utf-8");

    client.release();
    await pool.end();

    const jsonStats = fs.statSync(desktopJsonPath);
    const sqlStats = fs.statSync(desktopSqlPath);

    console.log("\n==========================================");
    console.log("BACKUP GENERADO Y DESCARGADO CON ÉXITO");
    console.log("==========================================");
    console.log(`Total tablas respaldadas: ${tableNames.length}`);
    console.log(`Total registros respaldados: ${totalRows}`);
    console.log(`Archivo JSON en Escritorio: ${desktopJsonPath} (${(jsonStats.size / 1024).toFixed(2)} KB)`);
    console.log(`Archivo SQL en Escritorio:  ${desktopSqlPath} (${(sqlStats.size / 1024).toFixed(2)} KB)`);
    console.log(`Copia en proyecto:          ${projectJsonPath}`);
    console.log("==========================================");

  } catch (err) {
    console.error("Error al generar backup de Railway:", err);
    process.exit(1);
  }
}

createFullBackup();
