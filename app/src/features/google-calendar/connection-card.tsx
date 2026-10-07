import Link from "next/link";

import {
  disconnectGoogleCalendarAction,
  syncGoogleCalendarAction,
} from "./actions";

type Connection = {
  connected_at: string;
  connection_status: "active" | "reauthorization_required" | "error";
  last_busy_sync_at: string | null;
  last_error_code: string | null;
  last_event_sync_at: string | null;
  pending_job_count: number;
};

const dateTime = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Guatemala",
});

export function GoogleCalendarConnectionCard({
  configured,
  connection,
}: {
  configured: boolean;
  connection: Connection | null;
}) {
  return (
    <section className="panel p-5 sm:p-6">
      <p className="eyebrow">Integración externa</p>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Google Calendar</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            Envía eventos genéricos a tu calendario principal y usa únicamente
            sus períodos ocupados para proteger horarios. No se comparte el
            nombre ni información clínica del paciente.
          </p>
        </div>
        <span className="w-fit rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold">
          {connection?.connection_status === "active"
            ? "Conectado"
            : connection
              ? "Requiere atención"
              : "Sin conectar"}
        </span>
      </div>
      {!configured ? (
        <div className="form-error mt-5">
          Falta configurar las credenciales de Google Calendar en el servidor.
        </div>
      ) : connection ? (
        <div className="mt-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-[var(--text-faint)]">
                Últimos eventos
              </dt>
              <dd className="mt-1 font-medium">
                {connection.last_event_sync_at
                  ? dateTime.format(new Date(connection.last_event_sync_at))
                  : "Pendiente"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-faint)]">
                Disponibilidad
              </dt>
              <dd className="mt-1 font-medium">
                {connection.last_busy_sync_at
                  ? dateTime.format(new Date(connection.last_busy_sync_at))
                  : "Pendiente"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-faint)]">
                Pendientes o con error
              </dt>
              <dd className="mt-1 font-medium">
                {connection.pending_job_count}
              </dd>
            </div>
          </dl>
          {connection.last_error_code && (
            <div className="form-error mt-4">
              La conexión necesita atención. Vuelve a conectar tu cuenta si el
              problema continúa.
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {connection.connection_status === "active" ? (
              <form action={syncGoogleCalendarAction}>
                <button className="button-secondary">Sincronizar ahora</button>
              </form>
            ) : (
              <Link
                className="button-primary"
                href="/api/integrations/google-calendar/connect"
              >
                Volver a conectar
              </Link>
            )}
            <form action={disconnectGoogleCalendarAction}>
              <button className="button-secondary text-[var(--danger)]">
                Desconectar
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <Link
            className="button-primary"
            href="/api/integrations/google-calendar/connect"
          >
            Conectar Google Calendar
          </Link>
          <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
            Google solicitará permiso para administrar eventos propios y
            consultar disponibilidad. Nutri360 nunca solicita acceso a correos
            ni archivos.
          </p>
        </div>
      )}
    </section>
  );
}
