require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const Database = require('better-sqlite3');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const sqliteDb = new Database('./prisma/dev.db');

const dateTimeFields = new Set([
  'createdAt', 'updatedAt', 'start', 'end', 'date', 'checkIn', 'checkOut',
  'birthDate', 'deletedAt', 'expirationDate', 'startDate', 'endDate'
]);

const booleanFields = new Set([
  'controlHorarioActivo', 'notifyAssignedUser', 'whatsappConnected',
  'showInAgenda', 'isSelfEmployed', 'isCompany', 'receivesReminders', 'allServices'
]);

// Implicit join tables for many-to-many relationships
const m2mTables = ['_ClinicToUser', '_ClientAllowedUsers'];

// Tables in topological or simple order
const tables = [
  'Clinic',
  'User',
  'Shift',
  'Service',
  'Client',
  'Appointment',
  'Sale',
  'DocumentTemplate',
  'SignedDocument',
  'Movement',
  'TimeBlock',
  'Voucher',
  'ClientVoucher',
  'ClientFile',
  'EpisodeFormTemplate',
  'ClientFormTemplate',
  'WhiteboardTemplate',
  'WaitlistEntry',
  'AppointmentLog',
  'WorkEntry',
  'Budget',
  'BudgetTemplate',
  'AppointmentReminder',
  'NotificationLog',
  'InventoryProduct',
  'ServiceProduct',
  'InventoryTransaction',
  'UserCommissionConfig',
  'Liquidation',
  'FiscalProfile'
];

async function runMigration() {
  console.log('Starting data migration from SQLite to PostgreSQL...');

  try {
    // 1. Disable constraints in PostgreSQL to avoid foreign key conflicts
    console.log('Disabling triggers and foreign keys in PostgreSQL...');
    await prisma.$executeRawUnsafe("SET session_replication_role = 'replica';");

    // 2. Clear existing tables in PostgreSQL to start clean
    console.log('Truncating tables in PostgreSQL...');
    for (const table of [...tables, ...m2mTables].reverse()) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }

    // 3. Migrate standard tables
    for (const table of tables) {
      console.log(`Migrating table: ${table}...`);
      const rows = sqliteDb.prepare(`SELECT * FROM "${table}"`).all();
      console.log(` - Read ${rows.length} rows from SQLite`);

      if (rows.length === 0) continue;

      // Clean up values
      const cleanedRows = rows.map(row => {
        const cleaned = { ...row };
        for (const key of Object.keys(cleaned)) {
          if (cleaned[key] === null || cleaned[key] === undefined) {
            continue;
          }
          if (dateTimeFields.has(key)) {
            cleaned[key] = new Date(cleaned[key]);
          } else if (booleanFields.has(key)) {
            cleaned[key] = cleaned[key] === 1 || cleaned[key] === 'true' || cleaned[key] === true;
          }
        }
        return cleaned;
      });

      // Insert into PostgreSQL using prisma model createMany
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      if (prisma[modelName]) {
        await prisma[modelName].createMany({
          data: cleanedRows,
        });
        console.log(` - Successfully inserted ${cleanedRows.length} rows into PostgreSQL`);
      } else {
        console.error(`Prisma model not found for table ${table} (property name: ${modelName})`);
      }
    }

    // 4. Migrate many-to-many join tables
    for (const table of m2mTables) {
      console.log(`Migrating many-to-many join table: ${table}...`);
      const rows = sqliteDb.prepare(`SELECT * FROM "${table}"`).all();
      console.log(` - Read ${rows.length} rows from SQLite`);

      for (const row of rows) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "${table}" ("A", "B") VALUES ($1, $2);`,
          row.A,
          row.B
        );
      }
      console.log(` - Successfully inserted ${rows.length} rows into PostgreSQL`);
    }

    console.log('\nMigration completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    // 5. Re-enable constraints
    console.log('Restoring triggers and foreign keys in PostgreSQL...');
    try {
      await prisma.$executeRawUnsafe("SET session_replication_role = 'origin';");
    } catch (e) {
      console.error('Error re-enabling constraints:', e.message);
    }
    await prisma.$disconnect();
    sqliteDb.close();
  }
}

runMigration();
