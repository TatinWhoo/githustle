import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('emits the required structured fields', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info({ action: 'TEST_EVENT', message: 'hello', meta: { a: 1 } });
    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(arg).toMatchObject({ level: 'info', action: 'TEST_EVENT', message: 'hello' });
    expect(typeof arg.timestamp).toBe('string');
    expect('correlationId' in arg).toBe(true);
  });

  it('never emits secret keys', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn({ action: 'X', message: 'y', meta: { password: 'p', token: 't', ok: 1 } });
    const arg = spy.mock.calls[0][0] as { meta: Record<string, unknown> };
    expect(arg.meta.password).toBeUndefined();
    expect(arg.meta.token).toBeUndefined();
    expect(arg.meta.ok).toBe(1);
  });
});
