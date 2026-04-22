import 'dotenv/config';
import { createServer } from 'http';
import app from './app.js';
import { initWebSocketServer } from './ws/wsServer.js';
import { connectRedis } from './services/redisService.js';

const PORT = process.env.PORT || 3001;

// Create HTTP server from Express app
const httpServer = createServer(app);

// Connect to Redis Pub/Sub
connectRedis();

// Initialize native WebSocket Server
initWebSocketServer(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
