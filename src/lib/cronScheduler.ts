import { processCronReminders } from "@/app/api/notifications/trigger-cron/route";

const globalForCron = globalThis as unknown as { cronSchedulerStarted?: boolean };

export function initCronScheduler() {
  if (globalForCron.cronSchedulerStarted) {
    return;
  }

  globalForCron.cronSchedulerStarted = true;
  console.log("[CLIFAV CRON] Planificador de recordatorios 24/7 iniciado en el servidor Node.js (Intervalo: 15 min).");

  // Primera ejecución 10 segundos después del arranque
  setTimeout(async () => {
    try {
      console.log("[CLIFAV CRON] Ejecutando comprobación inicial de recordatorios en segundo plano...");
      const res = await processCronReminders();
      console.log(`[CLIFAV CRON] Inicial completada: ${res.processedCount} envíos procesados.`);
    } catch (err) {
      console.error("[CLIFAV CRON] Error en ejecución inicial de recordatorios:", err);
    }
  }, 10000);

  // Ejecución periódica cada 15 minutos (15 * 60 * 1000 ms)
  setInterval(async () => {
    try {
      console.log("[CLIFAV CRON] Ejecutando comprobación periódica de recordatorios 24/7...");
      const res = await processCronReminders();
      console.log(`[CLIFAV CRON] Comprobación periódica completada: ${res.processedCount} envíos procesados.`);
    } catch (err) {
      console.error("[CLIFAV CRON] Error en comprobación periódica de recordatorios:", err);
    }
  }, 15 * 60 * 1000);
}
