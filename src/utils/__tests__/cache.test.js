import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock ioredis
vi.mock('ioredis', () => {
  const store = new Map();
  return {
    default: class MockRedis {
      constructor() { this.connected = false; this.handlers = {}; }
      on(event, fn) { this.handlers[event] = fn; }
      connect() { this.connected = true; if (this.handlers.connect) this.handlers.connect(); return Promise.resolve(); }
      quit() { this.connected = false; return Promise.resolve(); }
      get(key) { return Promise.resolve(store.has(key) ? store.get(key) : null); }
      setex(key, ttl, val) { store.set(key, val); return Promise.resolve('OK'); }
      set(key, val) { store.set(key, val); return Promise.resolve('OK'); }
      del(...keys) { keys.forEach(k => store.delete(k)); return Promise.resolve(keys.length); }
      keys(pattern) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        const matched = [...store.keys()].filter(k => regex.test(k));
        return Promise.resolve(matched);
      }
    }
  };
});

describe('cache module (graceful degradation)', () => {
  let cache;

  beforeEach(async () => {
    vi.resetModules();
    cache = await import('@/utils/cache.js');
  });

  it('wrap() calls fn and caches result when Redis is connected', async () => {
    cache.init('redis://localhost:6379');
    await new Promise(r => setTimeout(r, 50));

    const fn = vi.fn().mockResolvedValue({ data: 'test' });
    const result = await cache.wrap('test-key', 60, fn);
    expect(result).toEqual({ data: 'test' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('wrap() falls back to fn when Redis is not connected', async () => {
    const fn = vi.fn().mockResolvedValue({ fallback: true });
    const result = await cache.wrap('test-key', 60, fn);
    expect(result).toEqual({ fallback: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('get/set/del return safe defaults when disconnected', async () => {
    expect(await cache.get('key')).toBe(null);
    await cache.set('key', 'value', 60);
    await cache.del('key');
    expect(cache.isConnected()).toBe(false);
  });

  it('disconnect() cleans up', async () => {
    cache.init('redis://localhost:6379');
    await new Promise(r => setTimeout(r, 50));
    await cache.disconnect();
    expect(cache.isConnected()).toBe(false);
  });
});
