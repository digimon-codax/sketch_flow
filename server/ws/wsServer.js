import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import Diagram from "../models/Diagram.js";
import { pub, sub } from "../services/redis.js";
import { joinRoom, leaveRoom, getRoomUsers, getRoomSockets } from "./roomManager.js";

export function initWSServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // ── Redis Pub/Sub fan-out ─────────────────────────────────────
  // Forward Redis messages to every WS client in the room (except the sender)
  sub.on("ready", () => {
    sub.psubscribe("room:*", (err) => {
      if (err) console.warn("[WS] Redis psubscribe failed:", err.message);
    });
  });

  sub.on("pmessage", (_pattern, channel, message) => {
    const roomId = channel.replace("room:", "");
    let parsed;
    try { parsed = JSON.parse(message); } catch { return; }

    wss.clients.forEach((client) => {
      if (
        client.readyState === 1 &&      // OPEN
        client.roomId  === roomId &&
        client.userId  !== parsed.userId // don't echo to sender
      ) {
        client.send(message);
      }
    });
  });

  // ── Connection handler ────────────────────────────────────────
  wss.on("connection", (ws, req) => {
    // Authenticate via token in query string: ws://host/ws?token=xxx
    const url   = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token");

    if (!token) { ws.close(4001, "No token"); return; }

    let userId;
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      userId = payload.userId;
    } catch {
      ws.close(4001, "Invalid token");
      return;
    }

    ws.userId = userId;

    // ── Message handler ─────────────────────────────────────────
    ws.on("message", async (data) => {
      let msg;
      try { msg = JSON.parse(data); } catch { return; }

      const { type, roomId, payload } = msg;

      // ── JOIN_ROOM ─────────────────────────────────────────────
      if (type === "JOIN_ROOM") {
        ws.roomId = roomId;

        // Verify the user is actually a member of this diagram
        const diagram = await Diagram.findById(roomId).lean();
        if (!diagram) { ws.send(JSON.stringify({ type: "ERROR", payload: "Diagram not found" })); return; }

        const isMember = diagram.members.some(
          (m) => m.userId.toString() === userId
        );
        if (!isMember) { ws.close(4003, "Access denied"); return; }

        joinRoom(roomId, userId, ws, msg.userName || "Guest");

        // Send current scene state to the joining user
        ws.send(JSON.stringify({
          type: "ROOM_STATE",
          payload: diagram.excalidrawState ?? { elements: [], appState: {}, files: {} },
        }));

        // Broadcast updated user list to all in room
        broadcastToRoom(wss, roomId, {
          type: "USER_LIST",
          payload: getRoomUsers(roomId),
        });
      }

      // ── ELEMENTS_UPDATE ───────────────────────────────────────
      // A user changed the canvas — fan-out via Redis so all server instances forward it
      if (type === "ELEMENTS_UPDATE" && ws.roomId) {
        const fullMsg = JSON.stringify({ ...msg, userId });
        try {
          await pub.publish(`room:${ws.roomId}`, fullMsg);
        } catch {
          // Redis unavailable — fall back to direct broadcast
          broadcastToRoom(wss, ws.roomId, { ...msg, userId }, userId);
        }
      }

      // ── CURSOR_MOVE ───────────────────────────────────────────
      if (type === "CURSOR_MOVE" && ws.roomId) {
        const fullMsg = JSON.stringify({ ...msg, userId });
        try {
          await pub.publish(`room:${ws.roomId}`, fullMsg);
        } catch {
          broadcastToRoom(wss, ws.roomId, { ...msg, userId }, userId);
        }
      }

      // ── LEAVE_ROOM ────────────────────────────────────────────
      if (type === "LEAVE_ROOM" && ws.roomId) {
        leaveRoom(ws.roomId, userId);
        broadcastToRoom(wss, ws.roomId, {
          type: "USER_LIST",
          payload: getRoomUsers(ws.roomId),
        });
        ws.roomId = null;
      }
    });

    // ── Disconnect ──────────────────────────────────────────────
    ws.on("close", () => {
      if (ws.roomId) {
        leaveRoom(ws.roomId, userId);
        broadcastToRoom(wss, ws.roomId, {
          type: "USER_LIST",
          payload: getRoomUsers(ws.roomId),
        });
      }
    });

    ws.on("error", (err) => console.warn("[WS] Socket error:", err.message));
  });

  console.log("✅  WebSocket server initialised on /ws");
}

// ── Helpers ───────────────────────────────────────────────────
function broadcastToRoom(wss, roomId, msg, excludeUserId = null) {
  const str = typeof msg === "string" ? msg : JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (
      client.readyState === 1 &&
      client.roomId === roomId &&
      client.userId !== excludeUserId
    ) {
      client.send(str);
    }
  });
}
