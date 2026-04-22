/**
 * Manages the local WebSocket connections mapped to rooms.
 * rooms = {
 *   [roomId]: Set<WebSocket>
 * }
 */
const rooms = new Map();

export const joinRoom = (ws, roomId) => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(ws);
  ws.roomId = roomId; // attach roomId to the socket for easy lookup
};

export const leaveRoom = (ws, roomId) => {
  if (rooms.has(roomId)) {
    rooms.get(roomId).delete(ws);
    if (rooms.get(roomId).size === 0) {
      rooms.delete(roomId);
    }
  }
};

/**
 * Broadcasts a raw string message to all sockets in a room,
 * EXCEPT the socket that originated the message.
 */
export const broadcastToRoomLocal = (roomId, messageStr, excludeWs = null) => {
  const roomSockets = rooms.get(roomId);
  if (!roomSockets) return;

  for (const client of roomSockets) {
    if (client !== excludeWs && client.readyState === 1 /* WebSocket.OPEN */) {
      client.send(messageStr);
    }
  }
};
