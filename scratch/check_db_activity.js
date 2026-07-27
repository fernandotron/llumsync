require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function checkActivity() {
  const isLocal = connectionString?.includes("localhost") || connectionString?.includes("127.0.0.1");
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });

  console.log("Conectando a la BD de PostgreSQL en Railway...\n");

  try {
    // 1. Fichajes / Control Horario (WorkEntry)
    console.log("=== 1. CONTROL HORARIO (WorkEntry - Últimos 30 días) ===");
    const workEntries = await pool.query(`
      SELECT w.id, w."userId", u.name, u.email, w."clockIn", w."clockOut", w."createdAt", w."updatedAt"
      FROM "WorkEntry" w
      LEFT JOIN "User" u ON w."userId" = u.id
      ORDER BY w."createdAt" DESC
      LIMIT 50;
    `);
    console.log(`Encontrados: ${workEntries.rows.length} registros`);
    workEntries.rows.forEach(r => {
      console.log(`  - [${r.createdAt?.toISOString()}] Usuario: ${r.name || r.email} | Entrada: ${r.clockIn?.toISOString()} | Salida: ${r.clockOut?.toISOString() || 'ACTIVO'}`);
    });

    // 2. Logs de Citas (AppointmentLog)
    console.log("\n=== 2. LOGS DE CITAS (AppointmentLog) ===");
    const appLogs = await pool.query(`
      SELECT id, action, "userName", "createdAt", "previousValue", "newValue"
      FROM "AppointmentLog"
      ORDER BY "createdAt" DESC
      LIMIT 50;
    `);
    console.log(`Encontrados: ${appLogs.rows.length} registros`);
    appLogs.rows.forEach(r => {
      console.log(`  - [${r.createdAt?.toISOString()}] ${r.userName || 'Sistema'}: ${r.action}`);
    });

    // 3. Citas Creadas / Modificadas (Appointment)
    console.log("\n=== 3. CITAS (Últimas citas creadas/modificadas) ===");
    const appointments = await pool.query(`
      SELECT a.id, a."createdAt", a."updatedAt", a.status, u.name as "userName"
      FROM "Appointment" a
      LEFT JOIN "User" u ON a."userId" = u.id
      ORDER BY a."updatedAt" DESC
      LIMIT 30;
    `);
    console.log(`Encontradas: ${appointments.rows.length} citas`);
    appointments.rows.forEach(r => {
      console.log(`  - Creada: ${r.createdAt?.toISOString()} | Actualizada: ${r.updatedAt?.toISOString()} | Estado: ${r.status} | Prof: ${r.userName}`);
    });

    // 4. Clientes Creados / Modificados (Client)
    console.log("\n=== 4. CLIENTES (Últimos clientes creados/modificados) ===");
    const clients = await pool.query(`
      SELECT id, "firstName", "lastName", "createdAt", "updatedAt"
      FROM "Client"
      ORDER BY "updatedAt" DESC
      LIMIT 20;
    `);
    console.log(`Encontrados: ${clients.rows.length} clientes`);
    clients.rows.forEach(r => {
      console.log(`  - Creado: ${r.createdAt?.toISOString()} | Actualizado: ${r.updatedAt?.toISOString()} | Cliente: ${r.firstName} ${r.lastName}`);
    });

    // 5. Ventas / Cobros (Sale)
    console.log("\n=== 5. VENTAS / FACTURAS (Sale) ===");
    const sales = await pool.query(`
      SELECT id, "invoiceNumber", total, "paymentMethod", "createdAt"
      FROM "Sale"
      ORDER BY "createdAt" DESC
      LIMIT 20;
    `);
    console.log(`Encontradas: ${sales.rows.length} ventas`);
    sales.rows.forEach(r => {
      console.log(`  - [${r.createdAt?.toISOString()}] Factura: ${r.invoiceNumber} | Total: ${r.total}€ | Método: ${r.paymentMethod}`);
    });

    // 6. Logs de Notificaciones (NotificationLog)
    console.log("\n=== 6. LOGS DE NOTIFICACIONES (NotificationLog) ===");
    const notifLogs = await pool.query(`
      SELECT id, "clientName", channel, recipient, status, "sentAt"
      FROM "NotificationLog"
      ORDER BY "sentAt" DESC
      LIMIT 20;
    `);
    console.log(`Encontrados: ${notifLogs.rows.length} logs de notificación`);
    notifLogs.rows.forEach(r => {
      console.log(`  - [${r.sentAt?.toISOString()}] Canal: ${r.channel} | Recipiente: ${r.recipient} | Estado: ${r.status}`);
    });

    // 7. Usuarios registrados y última modificación
    console.log("\n=== 7. USUARIOS DEL SISTEMA ===");
    const users = await pool.query(`
      SELECT id, email, name, role, "createdAt", "updatedAt"
      FROM "User";
    `);
    users.rows.forEach(r => {
      console.log(`  - Usuario: ${r.name} (${r.email}) | Rol: ${r.role} | Creado: ${r.createdAt?.toISOString()} | Actualizado: ${r.updatedAt?.toISOString()}`);
    });

    // 8. Resumen global de fechas por tabla
    console.log("\n=== 8. FECHA MÁS RECIENTE REGISTRADA POR TABLA ===");
    const tables = ["WorkEntry", "AppointmentLog", "Appointment", "Client", "Sale", "Movement", "NotificationLog", "SignedDocument"];
    for (const table of tables) {
      try {
        const dateCol = table === "NotificationLog" ? "sentAt" : (table === "Sale" || table === "Movement" || table === "SignedDocument" ? "createdAt" : "updatedAt");
        const res = await pool.query(`SELECT MAX("${dateCol}") as max_date, COUNT(*) as total FROM "${table}"`);
        console.log(`  - Tabla ${table.padEnd(20)}: Total registros: ${res.rows[0].total.toString().padEnd(5)} | Registro más reciente: ${res.rows[0].max_date ? res.rows[0].max_date.toISOString() : 'Sin registros'}`);
      } catch (err) {
        console.log(`  - Tabla ${table.padEnd(20)}: ${err.message}`);
      }
    }

  } catch (err) {
    console.error("Error al consultar la base de datos:", err);
  } finally {
    await pool.end();
  }
}

checkActivity();
