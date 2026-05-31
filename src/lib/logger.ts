// Structured JSON logger — emits one JSON object per line to stdout/stderr.
// Vercel captures these as structured log entries; any log aggregator (Datadog,
// Grafana Loki, CloudWatch) can ingest them without additional instrumentation.

type LogLevel = "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
  const entry = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

export const logger = {
  info:  (event: string, fields?: LogFields) => emit("info",  event, fields),
  warn:  (event: string, fields?: LogFields) => emit("warn",  event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};
