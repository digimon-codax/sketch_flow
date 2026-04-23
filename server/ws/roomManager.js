// rooms: Map<roomId, Map<userId, { ws, color, name }>>
const rooms = new Map();

const COLOR_PALETTE = [
  "#e03131",
  "#1971c2",
  "#2f9e44",
  "#e67700",
  "#9c36b5",
  "#0c8599",
  "#c2255c",
  "#5c7cfa",
];

function pickColor(roomId) {
  const room = rooms.get(roomId);
  const used = room ? [...room.values()].map((u) => u.color) : [];
  const available = COLOR_PALETTE.find((c) => !used.includes(c));
  // Fallback: wrap around if all 8 are taken
  return available ?? COLOR_PALETTE[used.length % COLOR_PALETTE.length];
}

/**
 * Add a user to a room.
 * Creates the room map if it doesn't exist yet.
 */
export function joinRoom(roomId, userId, name, ws) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  const color = pickColor(roomId);
  rooms.get(roomId).set(userId, { ws, color, name });
  console.log(`👤 ${name} (${userId}) joined room ${roomId} [${color}]`);
}

/**
 * Remove a user from a room.
 * Deletes the room entry when it becomes empty.
 */
export function leaveRoom(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(userId);
  if (room.size === 0) {
    rooms.delete(roomId);
    console.log(`🗑️  Room ${roomId} is now empty — removed`);
  } else {
    console.log(`👋 User ${userId} left room ${roomId}`);
  }
}

/**
 * Return a snapshot of everyone currently in the room.
 */
export function getRoomUsers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return [...room.entries()].map(([userId, { color, name }]) => ({
    userId,
    name,
    color,
  }));
}

/**
 * Get all WS clients in a room (for broadcasting).
 */
export function getRoomClients(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return [...room.entries()].map(([userId, { ws }]) => ({ userId, ws }));
}
