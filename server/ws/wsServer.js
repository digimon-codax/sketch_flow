import { WebSocketServer } from 'ws';
import { redisPub, redisSub } from '../services/redisService.js';
import { joinRoom, leaveRoom, broadcastToRoomLocal } from './roomManager.js';
import prisma from '../config/prisma.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

export const initWebSocketServer = (server) => {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Handle incoming connections
  wss.on('connection', (ws, req) => {
    // 1. Authenticate via token in query string: ws://localhost:3001/ws?token=XYZ
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.close(4001, 'Unauthorized: No token provided');
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      ws.user = decoded; // { userId, email }
    } catch (err) {
      ws.close(4001, 'Unauthorized: Invalid token');
      return;
    }

    // 2. Handle messages
    ws.on('message', async (data) => {
      try {
        const messageStr = data.toString();
        const msg = JSON.parse(messageStr);
        const { type, roomId, payload } = msg;

        if (!roomId) return;

        switch (type) {
          case 'JOIN_ROOM':
            joinRoom(ws, roomId);
            // Fetch initial state and send directly back to the user
            const diagram = await prisma.diagram.findUnique({
              where: { id: roomId },
              select: { canvasState: true }
            });
            if (diagram) {
              ws.send(JSON.stringify({
                type: 'ROOM_STATE',
                roomId,
                payload: { canvasState: diagram.canvasState }
              }));
            }
            break;

          case 'LEAVE_ROOM':
            leaveRoom(ws, roomId);
            break;

          case 'CANVAS_DELTA':
          case 'CURSOR_MOVE':
            // 1. Broadcast locally immediately for low latency (echo prevention handled via userId check on client)
            broadcastToRoomLocal(roomId, messageStr, ws);

            // 2. Publish to Redis so other Node instances get it
            // Only publish if redis is connected
            if (redisPub.status === 'ready') {
              // Add a flag so subscribers know this came from Redis
              const redisMsg = JSON.stringify({ ...msg, _fromRedis: true });
              redisPub.publish(`room:${roomId}`, redisMsg);
            }
            break;
            
          default:
            console.warn(`[WS] Unknown message type: ${type}`);
        }
      } catch (err) {
        console.error('[WS] Error handling message:', err);
      }
    });

    ws.on('close', () => {
      if (ws.roomId) leaveRoom(ws, ws.roomId);
    });
  });

  // Handle messages coming from Redis Pub/Sub
  redisSub.on('message', (channel, messageStr) => {
    if (channel.startsWith('room:')) {
      const roomId = channel.split(':')[1];
      // Broadcast to local sockets. 
      // We don't exclude any socket here because the socket that sent it 
      // already ignored it locally based on _fromRedis flag (or we rely on client side ID check).
      broadcastToRoomLocal(roomId, messageStr, null);
    }
  });

  // Subscribe to all room channels via pattern
  if (redisSub.status === 'ready') {
    redisSub.psubscribe('room:*');
  } else {
    redisSub.on('ready', () => redisSub.psubscribe('room:*'));
  }

  console.log('[WebSocket] Server initialized on /ws');
};
