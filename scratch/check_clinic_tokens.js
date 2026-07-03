const Database = require('better-sqlite3');

function checkClinics() {
  const db = new Database('./prisma/dev.db');
  try {
    const rows = db.prepare("SELECT id, name, metaAccessToken, metaPhoneNumberId, metaTemplateName, whatsappApiUrl, whatsappInstanceName, whatsappApiToken FROM Clinic").all();
    console.log(`Found ${rows.length} clinics:`);
    rows.forEach(r => {
      console.log(`- Clinic: ${r.name} (ID: ${r.id})`);
      console.log(`  metaAccessToken: ${r.metaAccessToken ? 'SET (length ' + r.metaAccessToken.length + ')' : 'NULL'}`);
      console.log(`  metaPhoneNumberId: ${r.metaPhoneNumberId || 'NULL'}`);
      console.log(`  metaTemplateName: ${r.metaTemplateName || 'NULL'}`);
      console.log(`  whatsappApiUrl: ${r.whatsappApiUrl || 'NULL'}`);
      console.log(`  whatsappInstanceName: ${r.whatsappInstanceName || 'NULL'}`);
      console.log(`  whatsappApiToken: ${r.whatsappApiToken ? 'SET' : 'NULL'}`);
    });
  } catch (err) {
    console.error("Error reading database:", err);
  } finally {
    db.close();
  }
}

checkClinics();
