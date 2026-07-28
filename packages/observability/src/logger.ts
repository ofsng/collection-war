import pino, { type Logger as PinoLogger } from 'pino';
import { REDACTED_PATHS, REDACTION_PLACEHOLDER } from './redaction';

/**
 * The application's logging interface.
 *
 * Deliberately narrower than pino's own: application code should not reach for pino
 * features that make logs harder to query, and a narrow interface keeps the option of
 * swapping the backend open without touching call sites.
 */
export interface Logger {
  trace(context: LogContext, message: string): void;
  debug(context: LogContext, message: string): void;
  info(context: LogContext, message: string): void;
  warn(context: LogContext, message: string): void;
  error(context: LogContext, message: string): void;
  fatal(context: LogContext, message: string): void;
  /** Derives a logger that stamps `bindings` onto every subsequent line. */
  child(bindings: LogContext): Logger;
}

/**
 * Structured fields only.
 *
 * Message strings must be constant so that logs can be grouped and alerted on. Put the
 * variable part in the context: `log.info({ playerId }, 'player registered')`, never
 * `log.info({}, \`player ${id} registered\`)`.
 */
export type LogContext = Record<string, unknown>;

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerOptions {
  readonly level: LogLevel;
  /** Appears on every line so logs from api, workers and admin can be told apart. */
  readonly service: string;
  readonly environment: string;
  /**
   * Human-readable colourised output. Local development only — pretty printing is slow
   * and produces logs that a log aggregator cannot parse.
   */
  readonly pretty?: boolean;
}

export function createLogger(options: LoggerOptions): Logger {
  const instance = pino({
    level: options.level,
    base: {
      service: options.service,
      environment: options.environment,
    },
    // ISO timestamps rather than epoch milliseconds: logs are read by humans during
    // incidents at least as often as they are parsed by machines.
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [...REDACTED_PATHS],
      censor: REDACTION_PLACEHOLDER,
    },
    formatters: {
      // Emit `"level":"info"` rather than `"level":30`. Costs a few bytes, saves everyone
      // from memorising pino's numeric levels.
      level: (label) => ({ level: label }),
    },
    ...(options.pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
          },
        }
      : {}),
  });

  return wrap(instance);
}

function wrap(instance: PinoLogger): Logger {
  return {
    trace: (context, message) => instance.trace(context, message),
    debug: (context, message) => instance.debug(context, message),
    info: (context, message) => instance.info(context, message),
    warn: (context, message) => instance.warn(context, message),
    error: (context, message) => instance.error(context, message),
    fatal: (context, message) => instance.fatal(context, message),
    child: (bindings) => wrap(instance.child(bindings)),
  };
}

/**
 * A logger that discards everything.
 *
 * For unit tests, so that a passing test run is not buried in log output and so that
 * asserting on logging is a deliberate act (use a spy) rather than an accident.
 */
export function createSilentLogger(): Logger {
  const noop = (): void => undefined;
  const silent: Logger = {
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: () => silent,
  };
  return silent;
}
