import "dotenv/config";
import { prisma } from "../src/lib/db.ts";

async function main() {
  const clinic = await prisma.clinic.findUnique({
    where: { id: "c0172310-7113-475b-bdee-29fe502c7fa7" }
  });

  const clinicApiUrl = clinic?.whatsappApiUrl;
  const clinicInstance = clinic?.whatsappInstanceName;
  const clinicToken = clinic?.whatsappApiToken;
  const phone = "34634021915";

  console.log("Sending test WhatsApp message to:", phone);
  console.log("API URL:", clinicApiUrl);
  console.log("Instance:", clinicInstance);

  const targetUrl = `${clinicApiUrl}/message/sendText/${clinicInstance}`;
  const message = "Prueba de envío automático desde Clifav.";

  const requestBody = {
    number: phone,
    text: message,
    textMessage: {
      text: message
    },
    options: {
      delay: 1200,
      presence: "composing",
      linkPreview: false
    }
  };

  const res = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": clinicToken || "",
    },
    body: JSON.stringify(requestBody),
  });

  console.log("Response HTTP Status:", res.status);
  const text = await res.text();
  console.log("Response text:", text);

  process.exit(0);
}

main().catch(console.error);
