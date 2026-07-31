import { getCorrelationId } from './correlation';

type Level = 'debug' | 'info' | 'warn' | 'error';

interface LogInput {
  action: string;
  message: string;
  meta?: Record<string, unknown>;
}

interface LogEntry {
  timestamp: string;
  level: Level;
  correlationId: string;
  action: string;
  message: string;
  meta?: Record<string, unknown>;
}

const SECRET_KEYS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'secret',
]);

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: Level = import.meta.env.DEV ? 'debug' : 'info';

// Levels shipped to the server terminal. Debug/info would flood; only surface
// warn/error there so both terminals share one meaningful stream.
const SHIP_LEVELS: ReadonlySet<Level> = new Set<Level>(['warn', 'error']);

const LOGS_ENDPOINT = '/logs/client';
const LOG_API_URL = `${import.meta.env.VITE_API_URL}${LOGS_ENDPOINT}`;

// Batch outbound log entries so a burst of errors doesn't create N requests.
// Flush on: (a) 15 entries pending, (b) 2s tick, (c) an error level entry.
const shipQueue: LogEntry[] = [];
const FLUSH_INTERVAL_MS = 2000;
const MAX_BATCH = 15;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scrub(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SECRET_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

async function flushShipQueue(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (shipQueue.length === 0) return;
  const entries = shipQueue.splice(0, shipQueue.length);

  try {
    // sendBeacon works on unload; fetch used the rest of the time. Both are
    // fire-and-forget so a failed ship never blocks the app or loops back into
    // the logger.
    const payload = JSON.stringify({ entries });
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(LOG_API_URL, blob);
      return;
    }
    await fetch(LOG_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': getCorrelationId() },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Never re-throw or re-log — that would infinite-loop the logger.
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    void flushShipQueue();
  }, FLUSH_INTERVAL_MS);
}

function ship(entry: LogEntry): void {
  // Never ship logs about the log endpoint itself — prevents feedback loops
  // when the server is down (e.g. axios HTTP_ERROR for /logs/client).
  const path = (entry.meta?.path as string | undefined) ?? '';
  if (path.includes(LOGS_ENDPOINT)) return;

  shipQueue.push(entry);
  if (entry.level === 'error' || shipQueue.length >= MAX_BATCH) {
    void flushShipQueue();
  } else {
    scheduleFlush();
  }
}

function emit(level: Level, input: LogInput): void {
  if (ORDER[level] < ORDER[MIN_LEVEL]) return;
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId: getCorrelationId(),
    action: input.action,
    message: input.message,
    meta: scrub(input.meta),
  };
  const fn = level === 'debug' ? console.debug : console[level];
  fn(entry);

  if (SHIP_LEVELS.has(level)) ship(entry);
}

// Best-effort flush on page hide/unload so buffered errors aren't lost.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => void flushShipQueue());
  window.addEventListener('beforeunload', () => void flushShipQueue());
}

export const logger = {
  debug: (i: LogInput) => emit('debug', i),
  info: (i: LogInput) => emit('info', i),
  warn: (i: LogInput) => emit('warn', i),
  error: (i: LogInput) => emit('error', i),
};
