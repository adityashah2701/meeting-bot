/**
 * Vendor-neutral structured logging + metrics.
 *
 * Emits single-line JSON to stdout/console so any log drain (Vercel, Datadog,
 * Loki, CloudWatch) can parse it without an SDK. Swap `emit` for a real
 * transport later without touching call sites.
 *
 * Design goals:
 * - No secrets ever logged (callers pass explicit fields).
 * - `requestId` correlates a single request across log lines and metrics.
 * - Cheap: one object spread + JSON.stringify per line, no allocation in the
 *   hot path beyond that.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

type LogRecord = {
  ts: string;
  level: LogLevel;
  event: string;
} & LogFields;

function emit(record: LogRecord) {
  const line = JSON.stringify(record);
  if (record.level === "error") {
    console.error(line);
  } else if (record.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export type Logger = {
  debug: (event: string, fields?: LogFields) => void;
  info: (event: string, fields?: LogFields) => void;
  warn: (event: string, fields?: LogFields) => void;
  error: (event: string, fields?: LogFields) => void;
  /** Returns a child logger whose fields are merged into every record. */
  child: (fields: LogFields) => Logger;
};

function createRecord(
  level: LogLevel,
  event: string,
  base: LogFields,
  fields?: LogFields,
): LogRecord {
  return {
    ts: new Date().toISOString(),
    level,
    event,
    ...base,
    ...fields,
  };
}

export function createLogger(base: LogFields = {}): Logger {
  const at = (level: LogLevel) => (event: string, fields?: LogFields) =>
    emit(createRecord(level, event, base, fields));

  return {
    debug: at("debug"),
    info: at("info"),
    warn: at("warn"),
    error: at("error"),
    child: (fields: LogFields) => createLogger({ ...base, ...fields }),
  };
}

/**
 * Emits a metric as a structured log line (`level: "metric"` semantics via the
 * `metric` field). A metrics pipeline can key off `metric`/`value`/`tags`.
 */
export function metric(
  name: string,
  value: number,
  tags: LogFields = {},
) {
  emit({
    ts: new Date().toISOString(),
    level: "info",
    event: "metric",
    metric: name,
    value,
    ...tags,
  });
}

/**
 * Generates a short, URL-safe correlation id. Uses `crypto.randomUUID` where
 * available (Edge, Node 19+, modern browsers), falling back to a timestamped
 * random string.
 */
export function newRequestId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) {
    return c.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
