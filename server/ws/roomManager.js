// In-memory room map: roomId → Map(userId → { ws, color, name })

const rooms = new Map();

const COLORS = [
  "#e03131", "#1971c2", "#2f9e44", "#e67700",
  "#9c36b5", "#0c8599", "#c2255c", "#5c7cfa",
];

export function joinRoom(roomId, userId, ws, name = "Guest") {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  const room  = rooms.get(roomId);
  const color = COLORS[room.size % COLORS.length];
  room.set(userId, { ws, color, name });
}

export function leaveRoom(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(userId);
  if (room.size === 0) rooms.delete(roomId);
}

export function getRoomUsers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.entries()).map(([userId, { color, name }]) => ({
    userId,
    color,
    name,
  }));
}

export function getRoomSockets(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.values()).map((v) => v.ws);
}
