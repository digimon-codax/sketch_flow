import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import authRoutes    from "./routes/auth.js";
import diagramRoutes from "./routes/diagrams.js";
import aiRoutes      from "./routes/ai.js";
import contextRoutes from "./routes/context.js";

// WebSocket
import { initWSServer } from "./ws/wsServer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app        = express();
const httpServer = createServer(app);

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "20mb" })); // Excalidraw state can be large

// Serve uploaded files statically (local dev)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Routes ────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/diagrams", diagramRoutes);
app.use("/api/ai",       aiRoutes);
app.use("/api/context",  contextRoutes);

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", version: "2.0" }));

// ── WebSocket (same HTTP server as Express) ───────────────────
initWSServer(httpServer);

// ── Database + Start ──────────────────────────────────────────
const PORT     = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌  MONGO_URI is not set in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅  MongoDB connected");
    httpServer.listen(PORT, () => {
      console.log(`✅  Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌  MongoDB connection failed:", err.message);
    process.exit(1);
  });
