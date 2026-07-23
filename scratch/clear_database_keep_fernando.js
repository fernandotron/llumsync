require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const m2mTables = ['_ClinicToUser', '_ClientAllowedUsers'];

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

async function main() {
  console.log('Starting total database clean up (keeping only user Fernando)...');

  try {
    // 1. Disable constraints
    console.log('Disabling triggers and foreign keys...');
    await prisma.$executeRawUnsafe("SET session_replication_role = 'replica';");

    // 2. Truncate all tables
    console.log('Truncating all tables...');
    for (const table of [...tables, ...m2mTables].reverse()) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      console.log(` - Truncated ${table}`);
    }

    // 3. Create the Google user Fernando
    console.log('Recreating user Fernando Montilla...');
    await prisma.user.create({
      data: {
        id: '87b4d2d0-0e05-4285-98c9-1497c3daccc4',
        name: 'Fernando Montilla',
        email: 'fernando19.asj@gmail.com',
        password: 'google-auth',
        role: 'ADMIN',
        permissionsJson: JSON.stringify({
          agenda: ["Sus agendas", "Agendas del centro"],
          clientes: ["Ver clientes", "Ver datos personales", "Crear clientes", "Editar clientes", "Eliminar clientes"],
          configuracion: ["Ver configuración", "Configurar servicios", "Editar su propio horario", "Configurar notificaciones", "Importar datos"],
          contabilidad: ["Ver contabilidad", "Facturas - Ver listado", "Facturas - Crear facturas", "Facturas - Descargar PDF", "Caja - Ver movimientos", "Caja - Crear movimientos"],
          estadisticas: ["Ver estadísticas"],
          otros: []
        })
      }
    });
    console.log('Successfully created user Fernando Montilla.');

    console.log('\nDatabase cleared and reset successfully!');
  } catch (err) {
    console.error('Reset failed:', err);
  } finally {
    // 4. Restore constraints
    console.log('Restoring triggers and foreign keys...');
    try {
      await prisma.$executeRawUnsafe("SET session_replication_role = 'origin';");
    } catch (e) {
      console.error('Error re-enabling constraints:', e.message);
    }
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
