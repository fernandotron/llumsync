require('dotenv').config();
// Node 18+ has native fetch, so no require needed.

async function sendTestMessage(accessToken, phoneNumberId, templateName, recipientPhone, patientName, clinicName, serviceName) {
  const targetUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  const today = new Date();
  const dateText = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  const timeText = today.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const body = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: "es" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: patientName },   // {{1}}
            { type: "text", text: dateText },      // {{2}}
            { type: "text", text: timeText },      // {{3}}
            { type: "text", text: serviceName },   // {{4}}
            { type: "text", text: clinicName }     // {{5}}
          ]
        }
      ]
    }
  };

  console.log("Sending request to Meta WhatsApp API...");
  console.log("URL:", targetUrl);
  console.log("Body:", JSON.stringify(body, null, 2));

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (res.ok) {
      console.log("SUCCESS! Message sent successfully.");
      console.log("Meta Response:", data);
      return { success: true, data };
    } else {
      console.error(`FAILED! Meta API Error (${res.status}):`, data);
      return { success: false, error: data };
    }
  } catch (err) {
    console.error("CONNECTION ERROR:", err);
    return { success: false, error: err.message };
  }
}

// Example usage:
// node scratch/test_whatsapp_direct.js <token> <phoneNumberId> <templateName> <recipientPhone> <patientName> <clinicName> <serviceName>
const args = process.argv.slice(2);
if (args.length < 4) {
  console.log("Usage: node scratch/test_whatsapp_direct.js <token> <phoneNumberId> <templateName> <recipientPhone> [patientName] [clinicName] [serviceName]");
} else {
  const [token, phoneId, template, recipient, patient = "Paciente de Prueba", clinic = "Clínica Test", service = "Fisioterapia"] = args;
  sendTestMessage(token, phoneId, template, recipient, patient, clinic, service);
}
