import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getCorrelationId, setCorrelationId } from '@/lib/logger/correlation';
import { logger } from '@/lib/logger/logger';

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean; _startedAt?: number };

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

let refreshInFlight: Promise<void> | null = null;

export function __resetRefreshState(): void {
  refreshInFlight = null;
}

async function runRefresh(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = apiClient
      .post('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

apiClient.interceptors.request.use((config: RetriableConfig) => {
  config.headers.set('X-Correlation-ID', getCorrelationId());
  config._startedAt = Date.now();
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const cid = response.headers['x-correlation-id'];
    if (cid) setCorrelationId(cid);
    const cfg = response.config as RetriableConfig;
    const durationMs = cfg._startedAt ? Date.now() - cfg._startedAt : undefined;
    logger.info({
      action: 'HTTP_REQUEST',
      message: `${cfg.method?.toUpperCase()} ${cfg.url} -> ${response.status}`,
      meta: { method: cfg.method, path: cfg.url, statusCode: response.status, durationMs },
    });
    return response;
  },
  async (error: AxiosError) => {
    const cfg = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const isRefreshCall = cfg?.url?.includes('/auth/refresh');

    if (status === 401 && cfg && !cfg._retried && !isRefreshCall) {
      cfg._retried = true;
      try {
        await runRefresh();
        return apiClient(cfg);
      } catch {
        logger.warn({ action: 'SESSION_EXPIRED', message: 'Refresh failed; clearing session' });
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
        return Promise.reject(error);
      }
    }

    const level = status && status >= 500 ? 'error' : 'warn';
    logger[level]({
      action: 'HTTP_ERROR',
      message: `${cfg?.method?.toUpperCase()} ${cfg?.url} -> ${status ?? 'network'}`,
      meta: { method: cfg?.method, path: cfg?.url, statusCode: status },
    });
    return Promise.reject(error);
  },
);
