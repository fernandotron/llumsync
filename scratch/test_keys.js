const apiUrl = 'https://evolution-api-production-e0d9.up.railway.app';
const keys = [
  'REqEhXOdaSjlNvqqRKbssSVhnPyEdSzN',
  'GLOBAL_API_KEY',
  '417590d5-1ec6-4ea3-bfa1-68947916d724',
  'c0172310-7113-475b-bdee-29fe502c7fa7'
];

async function main() {
  for (const apiToken of keys) {
    try {
      console.log(`Testing token: ${apiToken}...`);
      const res = await fetch(`${apiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': apiToken
        }
      });
      console.log("Status:", res.status);
      if (res.status === 200) {
        console.log("SUCCESS! Key found:", apiToken);
        const text = await res.text();
        console.log("Response:", text);
        break;
      }
    } catch (err) {
      console.error("Error with key:", apiToken, err.message);
    }
  }
}

main();
