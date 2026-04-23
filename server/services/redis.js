import Redis from "ioredis";

const redisOptions = {
  lazyConnect: false,
  // Retry with backoff, max 5s between attempts
  retryStrategy: (times) => Math.min(times * 500, 5000),
  // Don't throw on failed commands when disconnected
  enableOfflineQueue: true,
};

export const pub = new Redis(process.env.REDIS_URL, redisOptions);
export const sub = new Redis(process.env.REDIS_URL, redisOptions);

// Log connect/error once — suppress repeated retry noise
let pubErrLogged = false;
let subErrLogged = false;

pub.on("connect", () => { pubErrLogged = false; console.log("✅ Redis pub connected"); });
pub.on("error", (err) => {
  if (!pubErrLogged) {
    console.warn("⚠️  Redis pub unavailable — will retry in background:", err.message);
    pubErrLogged = true;
  }
});

sub.on("connect", () => { subErrLogged = false; console.log("✅ Redis sub connected"); });
sub.on("error", (err) => {
  if (!subErrLogged) {
    console.warn("⚠️  Redis sub unavailable — will retry in background:", err.message);
    subErrLogged = true;
  }
});
