<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Subagentes Especializados del Sistema (CLIFAV / LlumSync)

Para optimizar el mantenimiento, escalabilidad y precisión en cada módulo clínico, se han definido 8 subagentes especializados dotados de permisos completos de lectura, escritura y herramientas avanzadas:

### 1. `sales_billing_agent`
* **Rol:** Especialista en Facturación, TPV, Pagos y Veri*Factu.
* **Ámbito:** `src/app/dashboard/sales/`, `src/app/api/invoices/`, `src/app/api/tickets/`, `src/app/api/payments/`, `src/app/api/credit-notes/`, `src/lib/services/verifactu.service.ts`.
* **Responsabilidades:**
  - Gestión de ventas, TPV clínico, presupuestos y arqueos de caja.
  - Cumplimiento normativo español Veri*Factu (RD 1619/2012, Ley 11/2021) y encadenamiento criptográfico con AEAT.
  - Emisión de facturas rectificativas, abonos y exportación fiscal para gestoría (Libro de Facturas).

### 2. `agenda_scheduling_agent`
* **Rol:** Especialista en Agenda, Calendario Clínico y Citas.
* **Ámbito:** `src/app/dashboard/agenda/`, `src/app/api/appointments/`, `src/app/api/whatsapp/`, `src/components/calendar/`.
* **Responsabilidades:**
  - Planificación médica multi-doctor, salas de tratamiento y cabinas.
  - Recordatorios automáticos por WhatsApp y SMS.
  - Gestión de estados de cita (Programada, En sala de espera, En consulta, Finalizada, No asistió).

### 3. `patients_clinical_agent`
* **Rol:** Especialista en Pacientes, Historias Clínicas y RGPD.
* **Ámbito:** `src/app/dashboard/patients/`, `src/app/api/patients/`, `src/app/api/consents/`, `src/components/patients/`.
* **Responsabilidades:**
  - Historias clínicas electrónicas, antecedentes, anamnesis y evolución médica.
  - Consentimientos informados con firma biométrica digital en tablet/móvil.
  - Cuaderno clínico interactivo (Whiteboard) y slider Antes/Después para tratamientos estéticos/dentales.
  - Cumplimiento estricto del RGPD y LOPDGDD para datos de salud protegidos.

### 4. `inventory_almacen_agent`
* **Rol:** Especialista en Inventario, Stock y Proveedores.
* **Ámbito:** `src/app/dashboard/inventory/`, `src/app/api/inventory/`, `src/app/api/suppliers/`.
* **Responsabilidades:**
  - Control de stock de consumibles, medicamentos y material clínico.
  - Trazabilidad por número de lote y fecha de caducidad.
  - Pedidos a proveedores y avisos automáticos de rotura de stock.

### 5. `loyalty_members_agent`
* **Rol:** Especialista en Fidelización, Bonos y Campañas.
* **Ámbito:** `src/app/dashboard/loyalty/`, `src/app/api/loyalty/`, `src/app/api/vouchers/`.
* **Responsabilidades:**
  - Club de fidelización, acumulación y canje de puntos.
  - Bonos multisesión (control de sesiones consumidas y pendientes).
  - Tarjetas de socio digitales para Apple Wallet y Google Wallet con código QR.
  - Campañas automatizadas de felicitación de cumpleaños y reactivación de pacientes.

### 6. `staff_timecontrol_agent`
* **Rol:** Especialista en RRHH, Turnos y Control Horario.
* **Ámbito:** `src/app/dashboard/staff/`, `src/app/api/time-control/`, `src/app/api/shifts/`.
* **Responsabilidades:**
  - Registro de jornada obligatorio (RD-ley 8/2019) con geolocalización o firma digital.
  - Gestión de turnos laborales, guardias y cuadrantes del equipo sanitario.
  - Solicitudes de vacaciones y ausencias justificadas.
  - Informes de horas ordinarias y extraordinarias auditables por Inspección de Trabajo.

### 7. `analytics_reports_agent`
* **Rol:** Especialista en Analítica Clínica, Rendimiento y KPIs.
* **Ámbito:** `src/app/dashboard/analytics/`, `src/app/api/analytics/`, `src/app/api/reports/`.
* **Responsabilidades:**
  - Cuadros de mando con métricas de facturación, ticket medio y tasa de aceptación de presupuestos.
  - Productividad y comisiones por facultativo/especialista.
  - Análisis de retención, cohortes y recurrencia de pacientes.
  - Generación automatizada de informes ejecutivos en Excel y PDF.

### 8. `settings_system_agent`
* **Rol:** Especialista en Configuración del Sistema, RBAC y Base de Datos.
* **Ámbito:** `src/app/dashboard/settings/`, `prisma/schema.prisma`, `src/app/api/clinics/`, `src/app/api/users/`, `src/lib/auth/`.
* **Responsabilidades:**
  - Gestión de sedes y clínicas múltiples (multitenant).
  - Configuración de perfiles fiscales, series de facturación y certificados digitales.
  - Roles y permisos granulares (RBAC) para doctores, recepcionistas, gestores y administradores.
  - Mantenimiento de modelos Prisma, migraciones de base de datos y auditoría de accesos.

### 9. `mobile_responsive_agent`
* **Rol:** Especialista en Experiencia Móvil, Diseño Adaptativo y Aislamiento UI/UX.
* **Ámbito:** `@media (max-width: 768px)`, `src/app/dashboard/**/*.module.css`, componentes táctiles y cajones modales.
* **Responsabilidades:**
  - Garantizar el aislamiento estricto entre la experiencia móvil y la versión de escritorio para evitar regresiones visuales en monitores de sobremesa.
  - Optimización táctil y ergonómica: áreas de toque mínimas de 44px (WCAG/Apple HIG), cajones inferiores de interacción rápida (*bottom sheets*), scroll táctil fluido.
  - Rejillas adaptativas a pantalla completa: eliminación de huecos vacíos y columnas encogidas en la agenda diaria y semanal móvil.
  - Legibilidad clínica móvil: formato enriquecido de tarjetas de cita (paciente, servicio, horario) legible sin requerir eventos *hover* de ratón.
  - Cumplimiento de áreas seguras (*safe-area-insets*) en iOS y Android.


