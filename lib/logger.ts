type LogLevel = "debug" | "info" | "warn" | "error";

type LogFn = (message: string, ...metadata: unknown[]) => void;

const log = (level: LogLevel, message: string, ...metadata: unknown[]) => {
  const timestamp = new Date().toISOString();

  switch (level) {
    case "debug":
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[${timestamp}] ${message}`, ...metadata);
      }
      break;
    case "info":
      console.info(`[${timestamp}] ${message}`, ...metadata);
      break;
    case "warn":
      console.warn(`[${timestamp}] ${message}`, ...metadata);
      break;
    case "error":
      console.error(`[${timestamp}] ${message}`, ...metadata);
      break;
    default:
      console.log(`[${timestamp}] ${message}`, ...metadata);
      break;
  }
};

export const logger: Record<LogLevel, LogFn> = {
  debug: (message, ...metadata) => log("debug", message, ...metadata),
  info: (message, ...metadata) => log("info", message, ...metadata),
  warn: (message, ...metadata) => log("warn", message, ...metadata),
  error: (message, ...metadata) => log("error", message, ...metadata),
};
