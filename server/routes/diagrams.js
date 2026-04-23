import express from "express";
import mongoose from "mongoose";
import Diagram from "../models/Diagram.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// All routes require auth
router.use(requireAuth);

// Helper – check if a userId is in the members array
function isMember(diagram, userId) {
  return diagram.members.some(
    (m) => m.userId.toString() === userId.toString()
  );
}

// Helper – check if a userId is the owner
function isOwner(diagram, userId) {
  return diagram.members.some(
    (m) => m.userId.toString() === userId.toString() && m.role === "owner"
  );
}

// ── GET /api/diagrams ──────────────────────────────────────────────────────
// Return all diagrams the requesting user is a member of
router.get("/", async (req, res) => {
  try {
    const diagrams = await Diagram.find(
      { "members.userId": req.userId },
      { _id: 1, name: 1, createdAt: 1, updatedAt: 1, members: 1 }
    ).sort({ updatedAt: -1 });

    return res.json(diagrams);
  } catch (err) {
    console.error("GET /diagrams error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/diagrams ─────────────────────────────────────────────────────
// Create a new diagram; requesting user becomes the owner
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    const diagram = await Diagram.create({
      name: name?.trim() || "Untitled Diagram",
      elements: [],
      appState: { panX: 0, panY: 0, zoom: 1 },
      members: [{ userId: req.userId, role: "owner" }],
    });

    return res.status(201).json(diagram);
  } catch (err) {
    console.error("POST /diagrams error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/diagrams/:id ──────────────────────────────────────────────────
// Return full diagram if user is a member
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) return res.status(404).json({ error: "Diagram not found" });

    if (!isMember(diagram, req.userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({
      _id: diagram._id,
      name: diagram.name,
      elements: diagram.elements,
      appState: diagram.appState,
      members: diagram.members,
      createdAt: diagram.createdAt,
      updatedAt: diagram.updatedAt,
    });
  } catch (err) {
    console.error("GET /diagrams/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /api/diagrams/:id ────────────────────────────────────────────────
// Update name / elements / appState (only fields provided)
router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) return res.status(404).json({ error: "Diagram not found" });

    if (!isMember(diagram, req.userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { name, elements, appState } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (elements !== undefined) updates.elements = elements;
    if (appState !== undefined) updates.appState = appState;

    const updated = await Diagram.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );

    return res.json(updated);
  } catch (err) {
    console.error("PATCH /diagrams/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/diagrams/:id ───────────────────────────────────────────────
// Only the owner can delete
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) return res.status(404).json({ error: "Diagram not found" });

    if (!isOwner(diagram, req.userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await Diagram.findByIdAndDelete(req.params.id);

    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE /diagrams/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
