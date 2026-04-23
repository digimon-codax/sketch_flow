import Redis from "ioredis";

// IMPORTANT: pub and sub MUST be separate ioredis instances.
// A client in subscriber mode cannot issue any other commands.

function createClient(name) {
  const url = process.env.REDIS_URL || "redis://localhost:6379";

  const client = new Redis(url, {
    // Retry with backoff — stops after 3 failed attempts in dev
    retryStrategy(times) {
      if (times > 3) {
        console.warn(`[Redis:${name}] Could not connect — running without Redis.`);
        return null; // stop retrying
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  client.on("connect",  () => console.log(`✅  Redis (${name}) connected`));
  client.on("error",    (e) => console.warn(`⚠️   Redis (${name}) error: ${e.message}`));

  return client;
}

export const pub = createClient("pub");
export const sub = createClient("sub");

// Connect both clients
pub.connect().catch(() => {});
sub.connect().catch(() => {});
