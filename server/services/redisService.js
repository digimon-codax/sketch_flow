import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Publisher client
export const redisPub = new Redis(REDIS_URL, { lazyConnect: true });

// Subscriber client (needs its own connection)
export const redisSub = new Redis(REDIS_URL, { lazyConnect: true });

redisPub.on('connect', () => console.log('[Redis Pub] Connected'));
redisSub.on('connect', () => console.log('[Redis Sub] Connected'));

redisPub.on('error', (err) => console.warn('[Redis Pub] Error:', err.message));
redisSub.on('error', (err) => console.warn('[Redis Sub] Error:', err.message));

/**
 * Connect both clients explicitly (useful at startup)
 */
export const connectRedis = async () => {
  try {
    await Promise.all([redisPub.connect(), redisSub.connect()]);
  } catch (err) {
    console.error('Failed to connect to Redis. Running without Pub/Sub.');
  }
};
