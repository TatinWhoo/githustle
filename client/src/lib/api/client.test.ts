import { describe, it, expect, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient, __resetRefreshState } from './client';

describe('apiClient interceptors', () => {
  let mock: MockAdapter;
  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    __resetRefreshState();
  });

  it('attaches an X-Correlation-ID header to requests', async () => {
    mock.onGet('/ping').reply((config) => {
      expect(config.headers?.['X-Correlation-ID']).toBeTruthy();
      return [200, { ok: true }];
    });
    const res = await apiClient.get('/ping');
    expect(res.data.ok).toBe(true);
  });

  it('on 401 refreshes once then retries the original request', async () => {
    let calls = 0;
    mock.onGet('/secure').reply(() => {
      calls += 1;
      return calls === 1 ? [401] : [200, { ok: true }];
    });
    mock.onPost('/auth/refresh').reply(200, { ok: true });

    const res = await apiClient.get('/secure');
    expect(res.data.ok).toBe(true);
    expect(calls).toBe(2);
  });

  it('does not loop when refresh itself fails', async () => {
    mock.onGet('/secure').reply(401);
    mock.onPost('/auth/refresh').reply(401);
    await expect(apiClient.get('/secure')).rejects.toBeTruthy();
  });
});
