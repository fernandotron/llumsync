import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/clinics/[id]/whatsapp
// Maneja acciones de WhatsApp: "get-qr", "check-status", "disconnect"
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, whatsappApiUrl, whatsappInstanceName, whatsappApiToken } = body;

    // Obtener los datos de la clínica de la base de datos
    const clinic = await prisma.clinic.findUnique({
      where: { id },
    });

    if (!clinic) {
      return NextResponse.json({ error: "Clínica no encontrada" }, { status: 404 });
    }

    // Usar parámetros enviados o los que ya están en la base de datos o fallbacks globales
    const apiUrl = whatsappApiUrl || clinic.whatsappApiUrl || process.env.WHATSAPP_API_URL;
    const instanceName = whatsappInstanceName || clinic.whatsappInstanceName || `clinic-${id.slice(0, 8)}`;
    const apiToken = whatsappApiToken || clinic.whatsappApiToken || process.env.WHATSAPP_API_TOKEN;

    if (!apiUrl || !apiToken) {
      return NextResponse.json(
        { error: "La URL y el Token de la API de WhatsApp deben estar configurados." },
        { status: 400 }
      );
    }

    // Asegurarse de que la URL no termine en barra diagonal
    const cleanApiUrl = apiUrl.replace(/\/$/, "");

    // ──────────────────────────────────────────────────────────
    // ACCIÓN: OBTENER CÓDIGO QR ("get-qr")
    // ──────────────────────────────────────────────────────────
    if (action === "get-qr") {
      try {
        console.log(`Intentando conectar/crear instancia ${instanceName} en ${cleanApiUrl}`);
        
        // 1. Crear la instancia en Evolution API
        const createRes = await fetch(`${cleanApiUrl}/instance/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apiToken,
          },
          body: JSON.stringify({
            instanceName: instanceName,
            token: apiToken,
            qrcode: true,
          }),
        });

        // Nota: Si la instancia ya existe, Evolution API devolverá un error de tipo "instance already exists" (código 400).
        // Si ya existe, podemos continuar directamente a pedir el QR de conexión.
        if (!createRes.ok) {
          const createData = await createRes.json().catch(() => ({}));
          console.log("Creación de instancia retornó:", createData);
        }

        // 2. Solicitar el QR o estado de conexión actual
        const connectRes = await fetch(`${cleanApiUrl}/instance/connect/${instanceName}`, {
          method: "GET",
          headers: {
            "apikey": apiToken,
          },
        });

        if (!connectRes.ok) {
          const errText = await connectRes.text();
          return NextResponse.json(
            { error: `Error al conectar instancia (${connectRes.status}): ${errText}` },
            { status: connectRes.status }
          );
        }

        const connectData = await connectRes.json();
        
        // Retornamos el QR base64 o estado que nos de Evolution API
        return NextResponse.json({
          instanceName,
          base64: connectData.base64 || connectData.qrcode?.base64 || null,
          code: connectData.code || null,
          status: connectData.status || "PENDING",
        });

      } catch (err: any) {
        console.error("Error al obtener QR de Evolution API:", err);
        return NextResponse.json({ error: `Error de red: ${err.message}` }, { status: 500 });
      }
    }

    // ──────────────────────────────────────────────────────────
    // ACCIÓN: COMPROBAR ESTADO ("check-status")
    // ──────────────────────────────────────────────────────────
    if (action === "check-status") {
      try {
        const statusRes = await fetch(`${cleanApiUrl}/instance/connectionState/${instanceName}`, {
          method: "GET",
          headers: {
            "apikey": apiToken,
          },
        });

        if (!statusRes.ok) {
          // Si da un 404, significa que la instancia no existe
          if (statusRes.status === 404) {
            return NextResponse.json({ state: "DISCONNECTED", message: "La instancia no existe." });
          }
          const errText = await statusRes.text();
          return NextResponse.json({ error: `Error al comprobar estado: ${errText}` }, { status: statusRes.status });
        }

        const statusData = await statusRes.json();
        const connectionState = statusData.instance?.state || statusData.state || "DISCONNECTED";
        const isConnected = connectionState === "open" || connectionState === "CONNECTED";

        // Actualizar base de datos de la clínica con el estado real
        await prisma.clinic.update({
          where: { id },
          data: {
            whatsappConnected: isConnected,
            whatsappInstanceName: instanceName,
            whatsappApiUrl: apiUrl,
            whatsappApiToken: apiToken,
          },
        });

        return NextResponse.json({
          state: isConnected ? "CONNECTED" : "DISCONNECTED",
          rawState: connectionState,
        });

      } catch (err: any) {
        console.error("Error al comprobar estado en Evolution API:", err);
        return NextResponse.json({ error: `Error de conexión: ${err.message}` }, { status: 500 });
      }
    }

    // ──────────────────────────────────────────────────────────
    // ACCIÓN: DESCONECTAR / ELIMINAR INSTANCIA ("disconnect")
    // ──────────────────────────────────────────────────────────
    if (action === "disconnect") {
      try {
        // Intentar cerrar sesión (logout)
        await fetch(`${cleanApiUrl}/instance/logout/${instanceName}`, {
          method: "POST",
          headers: {
            "apikey": apiToken,
          },
        }).catch(() => {});

        // Intentar eliminar la instancia en Evolution API
        const deleteRes = await fetch(`${cleanApiUrl}/instance/delete/${instanceName}`, {
          method: "DELETE",
          headers: {
            "apikey": apiToken,
          },
        });

        // Actualizar clínica en base de datos
        const updatedClinic = await prisma.clinic.update({
          where: { id },
          data: {
            whatsappConnected: false,
            // Conservar las claves pero marcarlas como no conectadas
          },
        });

        return NextResponse.json({
          success: true,
          clinic: updatedClinic,
        });

      } catch (err: any) {
        console.error("Error al desconectar de Evolution API:", err);
        // Marcamos como desconectado de todos modos en nuestra base de datos local
        await prisma.clinic.update({
          where: { id },
          data: { whatsappConnected: false },
        });
        return NextResponse.json({ success: true, warning: `Desconectado localmente. Error de red: ${err.message}` });
      }
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });

  } catch (error) {
    console.error("Error general en el endpoint de WhatsApp:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
