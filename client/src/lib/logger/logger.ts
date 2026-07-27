import { getCorrelationId } from './correlation';

type Level = 'debug' | 'info' | 'warn' | 'error';

interface LogInput {
  action: string;
  message: string;
  meta?: Record<string, unknown>;
}

const SECRET_KEYS = new Set(['password', 'token', 'accessToken', 'refreshToken', 'authorization', 'cookie', 'secret']);

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: Level = import.meta.env.DEV ? 'debug' : 'info';

function scrub(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SECRET_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

function emit(level: Level, input: LogInput): void {
  if (ORDER[level] < ORDER[MIN_LEVEL]) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId: getCorrelationId(),
    action: input.action,
    message: input.message,
    meta: scrub(input.meta),
  };
  const fn = level === 'debug' ? console.debug : console[level];
  fn(entry);
}

export const logger = {
  debug: (i: LogInput) => emit('debug', i),
  info: (i: LogInput) => emit('info', i),
  warn: (i: LogInput) => emit('warn', i),
  error: (i: LogInput) => emit('error', i),
};
