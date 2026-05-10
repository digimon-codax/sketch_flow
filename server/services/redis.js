import Redis from "ioredis";

const redisConfig = {
  host: "redis-14549.crce286.ap-south-1-1.ec2.cloud.redislabs.com",
  port: 14549,
  username: "default",
  password: "R5XJfG3px5sSmq1lBZiS8a00G4Iz6iUD",
  retryStrategy: (times) => Math.min(times * 500, 5000),
  enableOfflineQueue: true,
};

export const pub = new Redis(redisConfig);
export const sub = new Redis(redisConfig);

pub.on("connect", () => console.log("✅ Redis pub connected"));
pub.on("error", (err) => console.error("❌ Redis pub error:", err.message));

sub.on("connect", () => console.log("✅ Redis sub connected"));
sub.on("error", (err) => console.error("❌ Redis sub error:", err.message));
