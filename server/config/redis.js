import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 5) {
      console.warn('Redis: max retries reached. Running without persistence.');
      return null; // Stop retrying — app still works, just no persistence
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on('connect', () => console.log('[Redis] Connected'));
redis.on('error', (err) => console.warn('[Redis] Error:', err.message));

export default redis;
