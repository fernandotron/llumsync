const apiToken = 'e96c7870e7a0b5031b530b43b9119b42cd58b4bcc6968096205e6a1e2f3d94a1';
const apiUrl = 'https://evolution-api-production-e0d9.up.railway.app';

async function main() {
  try {
    console.log(`Checking Evolution API at: ${apiUrl}...`);
    const res = await fetch(`${apiUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': apiToken
      }
    });

    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

main();
