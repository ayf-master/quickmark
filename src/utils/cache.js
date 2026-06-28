const Redis = require('ioredis');

let client = null;
let connected = false;

async function init(redisUrl) {
  if (client) return client;
  try {
    client = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true
    });
    client.on('connect', () => { connected = true; });
    client.on('error', () => { connected = false; });
    client.on('close', () => { connected = false; });
    // 3s 超时连接, 失败不阻塞启动
    try {
      await Promise.race([
        client.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connect timeout')), 3000))
      ]);
    } catch {
      connected = false;
    }
  } catch (e) {
    connected = false;
  }
  return client;
}

function getClient() { return connected ? client : null; }
function isConnected() { return connected; }

async function get(key) {
  const c = getClient();
  if (!c) return null;
  try {
    const val = await c.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function set(key, value, ttlSeconds) {
  const c = getClient();
  if (!c) return;
  try {
    if (ttlSeconds) {
      await c.setex(key, ttlSeconds, JSON.stringify(value));
    } else {
      await c.set(key, JSON.stringify(value));
    }
  } catch {}
}

async function del(...keys) {
  const c = getClient();
  if (!c) return;
  try { await c.del(...keys); } catch {}
}

async function delPattern(pattern) {
  const c = getClient();
  if (!c) return;
  try {
    const keys = await c.keys(pattern);
    if (keys.length > 0) await c.del(...keys);
  } catch {}
}

async function wrap(key, ttlSeconds, fn) {
  const cached = await get(key);
  if (cached !== null) return cached;
  const result = await fn();
  await set(key, result, ttlSeconds);
  return result;
}

async function disconnect() {
  if (client) {
    await client.quit().catch(() => {});
    client = null;
    connected = false;
  }
}

module.exports = { init, getClient, isConnected, get, set, del, delPattern, wrap, disconnect };
