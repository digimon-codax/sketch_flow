import { WebSocketServer } from "ws";
import { pub, sub } from "../services/redis.js";
import {
  joinRoom,
  leaveRoom,
  getRoomUsers,
  getRoomClients,
} from "./roomManager.js";
import Diagram from "../models/Diagram.js";

function send(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(roomId, data, excludeUserId = null) {
  const clients = getRoomClients(roomId);
  for (const { userId, ws } of clients) {
    if (excludeUserId && userId === excludeUserId) continue;
    send(ws, data);
  }
}

export function initWSServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });
  console.log("🔌 WebSocket server initialized");

  // Subscribe to all room channels using pattern subscribe
  sub.psubscribe("room:*", (err) => {
    if (err) console.error("❌ psubscribe error:", err.message);
    else console.log("✅ Redis sub listening on room:*");
  }).catch((err) => {
    console.error("❌ psubscribe promise rejection:", err.message);
  });

  sub.on("pmessage", (_pattern, channel, rawMessage) => {
    // channel format: "room:<roomId>"
    const roomId = channel.replace("room:", "");
    let msg;
    try {
      msg = JSON.parse(rawMessage);
    } catch {
      return;
    }

    // Forward to everyone in the room EXCEPT the sender
    const senderId = msg.userId ?? null;
    broadcast(roomId, msg, senderId);
  });

  // ── WebSocket connections ─────────────────────────────────────────────────
  wss.on("connection", (ws) => {
    ws.roomId = null;
    ws.userId = null;

    ws.on("message", async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return send(ws, { type: "ERROR", payload: { message: "Invalid JSON" } });
      }

      const { type, roomId, userId, payload = {} } = msg;

      switch (type) {
        // ── JOIN_ROOM ──────────────────────────────────────────────────────
        case "JOIN_ROOM": {
          ws.roomId = roomId;
          ws.userId = userId;

          joinRoom(roomId, userId, payload.name ?? "Anonymous", ws);

          // Send current diagram state to the joining client only
          try {
            const diagram = await Diagram.findById(roomId);
            if (diagram) {
              send(ws, {
                type: "ROOM_STATE",
                payload: {
                  elements: diagram.elements,
                  appState: diagram.appState,
                },
              });
            }
          } catch (err) {
            console.error("JOIN_ROOM diagram fetch error:", err.message);
          }

          // Broadcast updated user list to everyone in room (including joiner)
          const users = getRoomUsers(roomId);
          const clients = getRoomClients(roomId);
          for (const { ws: clientWs } of clients) {
            send(clientWs, { type: "USER_LIST", payload: users });
          }
          break;
        }

        // ── ELEMENTS_UPDATE ────────────────────────────────────────────────
        case "ELEMENTS_UPDATE": {
          if (!roomId) break;
          pub.publish("room:" + roomId, JSON.stringify(msg));
          break;
        }

        // ── CURSOR_MOVE ────────────────────────────────────────────────────
        case "CURSOR_MOVE": {
          if (!roomId) break;
          pub.publish("room:" + roomId, JSON.stringify(msg));
          break;
        }

        // ── LEAVE_ROOM ─────────────────────────────────────────────────────
        case "LEAVE_ROOM": {
          if (!roomId || !userId) break;
          leaveRoom(roomId, userId);
          const remaining = getRoomUsers(roomId);
          broadcast(roomId, { type: "USER_LIST", payload: remaining });
          ws.roomId = null;
          ws.userId = null;
          break;
        }

        default:
          send(ws, { type: "ERROR", payload: { message: `Unknown type: ${type}` } });
      }
    });

    // ── Disconnect cleanup ──────────────────────────────────────────────────
    ws.on("close", () => {
      if (ws.roomId && ws.userId) {
        leaveRoom(ws.roomId, ws.userId);
        const remaining = getRoomUsers(ws.roomId);
        broadcast(ws.roomId, { type: "USER_LIST", payload: remaining });
      }
    });

    ws.on("error", (err) => {
      console.error("WS client error:", err.message);
    });
  });

  return wss;
}
