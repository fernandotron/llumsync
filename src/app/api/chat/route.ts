import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `Eres Sami, el asistente inteligente oficial de la aplicación médica Clifav.
Tu objetivo es resolver dudas, guiar e instruir al usuario sobre el uso de la aplicación con un tono profesional, claro, empático y servicial.

SOBRE CLIFAV:
Clifav es un sistema integral de gestión para centros clínicos y de fisioterapia. Cuenta con los siguientes módulos principales:

1. AGENDA:
   - Visualiza citas en formato de Día, Semana o Mes.
   - Filtros por profesional en la esquina superior izquierda (si no se tiene el permiso "Ver todas las agendas", el empleado solo visualiza su propia agenda).
   - Crear citas: Haz clic en cualquier celda de la agenda o arrastra. Requiere rellenar el paciente, servicio, hora, notas y estado.
   - Estados de cita: Pendiente (amarillo), Confirmada (azul), Asistió (verde), Cancelada (gris), No asistió (rojo).
   - Bloqueos de tiempo (Reservar tiempo): Franjas horarias bloqueadas (ej. descanso o comida) para evitar reservas.
   - Historial de citas: Permite auditar qué usuario creó, modificó o eliminó una cita (en la pestaña "Historial" del panel lateral de cada cita).

2. PACIENTES:
   - Se accede desde el menú lateral (icono de personas).
   - Cada ficha contiene: Datos personales, Documentos (consentimientos firmados digitalmente), Formularios de antecedentes, Seguimientos (episodios clínicos) y Bonos (vouchers de sesiones).
   - Privacidad: Si un usuario no tiene el permiso "Ver datos personales" activado, sus datos de contacto (teléfono, email, DNI) se enmascaran como "******".

3. VENTAS / CONTABILIDAD:
   - Caja / POS: Cobro ágil de servicios y artículos seleccionando al paciente.
   - "Solo cobrar": Si un empleado tiene este permiso activo pero no el acceso general a contabilidad, se le muestra únicamente la pantalla simplificada de cobros, ocultando el resto de pestañas.
   - Pestañas: Artículos, Facturas (emitidas/recibidas), Pagos, Resumen (cierres de caja), Ingresos y Gastos, Presupuestos.

4. CONTROL HORARIO:
   - Permite a los empleados registrar su jornada (Fichar Entrada / Fichar Salida).
   - Se habilita en Configuración -> Información General.

5. CONFIGURACIÓN (Estilo Calendly vertical dividido):
   - Información General: Datos del centro y activar control horario.
   - Servicios Clínicos: Creación de servicios con duraciones y precios personalizables, y opción de eliminarlos con el botón "Eliminar".
   - Usuarios y Horarios: Agregar y editar empleados, contraseñas, comisiones de venta y permisos.
   - Papelera: Recuperación de citas, clientes o presupuestos borrados.

REGLAS DE RESPUESTA:
- Responde siempre en español.
- Sé breve y conciso, utilizando listas o negritas de Markdown para legibilidad.
- Si te preguntan algo ajeno a Clifav, redirige educadamente la conversación al uso de la aplicación.`;

const FALLBACK_ANSWERS: Record<string, string> = {
  greeting: `¡Hola! Soy **Sami**, tu asistente de ayuda. ¿En qué puedo orientarte hoy? 
Puedes consultarme sobre cómo funciona la **Agenda**, cómo gestionar **Pacientes**, configurar el **Control Horario**, realizar **Ventas** o ajustar **Permisos de Usuarios**.`,
  agenda: `### 📅 Agenda y Citas
En el módulo de **Agenda** puedes:
1. **Crear una cita**: Haz clic en cualquier franja horaria vacía de la cuadrícula.
2. **Editar/Cambiar Estado**: Haz clic sobre la cita para abrir el panel lateral y modificar sus datos, añadir seguimientos o cambiar su estado (ej. de "Pendiente" a "Confirmada" o "Asistió").
3. **Mover citas**: Puedes arrastrar y soltar cualquier cita a otra hora o día en la cuadrícula.
4. **Ver Historial**: Dentro de la cita, en la pestaña "Historial" podrás auditar quién realizó cada cambio y cuándo.`,
  pacientes: `### 👥 Gestión de Pacientes
En la pestaña de **Pacientes** puedes llevar un registro completo:
- **Datos personales**: Información de contacto y facturación. Se enmascaran automáticamente con \`******\` si no se cuenta con el permiso correspondiente.
- **Seguimientos**: Anotaciones clínicas de cada visita (diagnósticos, observaciones, medicación).
- **Consentimientos LOPD**: Generar y firmar digitalmente documentos de protección de datos desde una tableta o pantalla.
- **Bonos**: Crear paquetes de sesiones (ej. Bono 5 Sesiones) que se van descontando de forma automática conforme se asiste a las citas.`,
  control: `### ⏱️ Control Horario
El control de jornada permite a los empleados registrar sus horas de entrada y salida:
1. **Activar**: Ve a **Configuración** -> **Información General** y activa la opción "Activar Control Horario".
2. **Fichar**: Aparecerá una pestaña de "Control Horario" en el menú de navegación de los empleados para realizar los marcajes.`,
  ventas: `### 💵 POS y Ventas
El módulo de contabilidad te permite gestionar los cobros y la facturación:
- **POS / Caja**: Agrega artículos o servicios y selecciona al paciente para cobrar la venta en el acto.
- **Facturas**: Genera facturas simplificadas automáticas al realizar cobros.
- **Solo cobrar**: Permiso especial que limita a recepcionistas u otros roles a visualizar únicamente la pantalla de cobros rápidos (Caja), bloqueando las pestañas de facturas emitidas/recibidas o resúmenes de ganancias globales.`,
  servicios: `### 🛠️ Servicios Clínicos
Puedes administrar tus tratamientos disponibles:
1. Ve a **Configuración** -> **Servicios Clínicos**.
2. Haz clic en **Añadir Servicio** para definir el nombre, duración y precio.
3. Para eliminarlo, selecciona el servicio de la lista y haz clic en el botón de color rojo **"Eliminar"**.`,
  permisos: `### 🔐 Usuarios y Permisos
El administrador puede configurar qué datos e interfaces visualiza cada empleado:
1. Ve a **Configuración** -> **Usuarios y Horarios**.
2. Selecciona al empleado para editar su ficha o crea uno nuevo mediante el cajón.
3. En la pestaña **Permisos**, activa o desactiva casillas como: *Ver datos personales*, *Solo cobrar*, *Ver todas las agendas* u *Ocultar precios de costo*.`,
  fallback: `Actualmente me encuentro funcionando en **modo de ayuda rápida local**. 
Para poder hacerme consultas abiertas y disfrutar de respuestas personalizadas con Inteligencia Artificial avanzada, solicita al administrador del sistema que configure la variable **GEMINI_API_KEY** en el archivo \`.env\` del servidor.

Mientras tanto, puedes consultarme escribiendo palabras clave como: **Agenda**, **Pacientes**, **Ventas**, **Control Horario**, **Servicios** o **Permisos**.`
};

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Mensajes no válidos" }, { status: 400 });
    }

    const lastMessageText = messages[messages.length - 1]?.content || "";
    const apiKey = process.env.GEMINI_API_KEY;

    // If API Key is not configured, run fallback chatbot
    if (!apiKey) {
      const query = lastMessageText.toLowerCase().trim();
      let reply = FALLBACK_ANSWERS.fallback;

      if (query.includes("hola") || query.includes("buenos") || query.includes("saludo")) {
        reply = FALLBACK_ANSWERS.greeting;
      } else if (query.includes("agenda") || query.includes("cita") || query.includes("calendario") || query.includes("historial")) {
        reply = FALLBACK_ANSWERS.agenda;
      } else if (query.includes("paciente") || query.includes("contacto") || query.includes("bono") || query.includes("consentimiento") || query.includes("seguimiento")) {
        reply = FALLBACK_ANSWERS.pacientes;
      } else if (query.includes("control") || query.includes("horario") || query.includes("fichar") || query.includes("jornada")) {
        reply = FALLBACK_ANSWERS.control;
      } else if (query.includes("venta") || query.includes("cobrar") || query.includes("caja") || query.includes("pos") || query.includes("factura")) {
        reply = FALLBACK_ANSWERS.ventas;
      } else if (query.includes("servicio") || query.includes("eliminar servicio")) {
        reply = FALLBACK_ANSWERS.servicios;
      } else if (query.includes("permiso") || query.includes("usuario") || query.includes("rol") || query.includes("privacidad")) {
        reply = FALLBACK_ANSWERS.permisos;
      }

      return NextResponse.json({
        content: reply,
        isFallback: true,
      });
    }

    // Call Google Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Map history to Gemini contents structure
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return NextResponse.json({
        content: "Lo siento, ha ocurrido un error al conectar con el servidor de IA de Gemini. ¿En qué más te puedo asistir de forma general?",
        isFallback: true,
      });
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se ha recibido respuesta.";

    return NextResponse.json({
      content: replyText,
      isFallback: false,
    });
  } catch (error) {
    console.error("Error in AI Chat API:", error);
    return NextResponse.json({ error: "Error en el servidor de chat con IA" }, { status: 500 });
  }
}
