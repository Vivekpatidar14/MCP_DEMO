type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = process.env.NODE_ENV === "development";

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = meta ? `${message} ${JSON.stringify(meta)}` : message;
  if (!isDev) {
    if (level === "error") {
      // eslint-disable-next-line no-restricted-syntax -- centralized error sink
      console.error(`[${level}]`, payload);
    } else if (level === "warn") {
      // eslint-disable-next-line no-restricted-syntax
      console.warn(`[${level}]`, payload);
    }
    return;
  }
  if (level === "error") {
    // eslint-disable-next-line no-restricted-syntax
    console.error(`[${level}]`, payload);
    return;
  }
  if (level === "warn") {
    // eslint-disable-next-line no-restricted-syntax
    console.warn(`[${level}]`, payload);
    return;
  }
  // eslint-disable-next-line no-restricted-syntax -- dev-only tracing
  console.log(`[${level}]`, payload);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) =>
    write("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    write("error", message, meta),
};
