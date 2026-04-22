import redis from '../config/redis.js';

/**
 * Registers all canvas-related socket.io events on a given socket.
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
export const registerCanvasSocket = (socket, io) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  /**
   * canvas:request_state
   * Emitted by a new client on load — sends back the latest persisted board state.
   */
  socket.on('canvas:request_state', async () => {
    try {
      const state = await redis.get('canvas_state');
      if (state) {
        socket.emit('canvas:full_state', JSON.parse(state));
        console.log(`[Socket] Sent full state to ${socket.id}`);
      }
    } catch (err) {
      console.warn('[Socket] Could not fetch state from Redis:', err.message);
    }
  });

  /**
   * canvas:delta
   * Emitted by a client when any object changes.
   * Broadcasts the delta to all OTHER clients (echo prevention via clientId on the client side),
   * and persists the latest full state to Redis.
   */
  socket.on('canvas:delta', async (data) => {
    // Broadcast to every other connected client
    socket.broadcast.emit('canvas:delta', data);

    // Persist to Redis if a full state snapshot is included
    if (data.stateJSON) {
      try {
        await redis.set('canvas_state', JSON.stringify(data.stateJSON));
      } catch (err) {
        console.warn('[Socket] Could not persist state to Redis:', err.message);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
  });
};
