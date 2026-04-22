import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Add a retry strategy so it doesn't spam the console forever if Redis is down
const redisConfig = {
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) {
      console.warn('[Redis] Max retries reached. Giving up on Redis connection.');
      return null; // Stop retrying
    }
    return Math.min(times * 50, 2000);
  }
};

// Publisher client
export const redisPub = new Redis(REDIS_URL, redisConfig);

// Subscriber client (needs its own connection)
export const redisSub = new Redis(REDIS_URL, redisConfig);

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
