// Using native fetch in Node 18+

async function main() {
  try {
    const res = await fetch('http://localhost:3000/api/clinics/417590d5-1ec6-4ea3-bfa1-68947916d724/notifications-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metaAccessToken: "TEST_TOKEN_VALUE",
        metaPhoneNumberId: "403264476203207",
        metaTemplateName: "recordatorio_cita"
      })
    });

    const data = await res.json();
    console.log("PUT Response Status:", res.status);
    console.log("PUT Response Data:", data);
  } catch (err) {
    console.error("PUT Error:", err);
  }
}

main();
