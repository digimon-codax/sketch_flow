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

// ── POST /api/diagrams/:id/members ────────────────────────────────────────
router.post("/:id/members", async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) return res.status(404).json({ error: "Diagram not found" });

    if (!isMember(diagram, req.userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const User = (await import("../models/User.js")).default;
    const foundUser = await User.findOne({ email: email?.trim().toLowerCase() });
    if (!foundUser) {
      return res.status(404).json({ error: "No user found with that email" });
    }

    const alreadyMember = diagram.members.some(
      (m) => m.userId.toString() === foundUser._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ error: "User is already a collaborator" });
    }

    diagram.members.push({ userId: foundUser._id, role: role ?? "editor" });
    await diagram.save();

    const populated = await Diagram.findById(diagram._id).populate(
      "members.userId",
      "name email"
    );

    return res.json(
      populated.members.map((m) => ({
        userId: m.userId._id,
        name: m.userId.name,
        email: m.userId.email,
        role: m.role,
      }))
    );
  } catch (err) {
    console.error("POST /diagrams/:id/members error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/diagrams/:id/members ─────────────────────────────────────────
router.get("/:id/members", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    const diagram = await Diagram.findById(req.params.id).populate(
      "members.userId",
      "name email"
    );
    if (!diagram) return res.status(404).json({ error: "Diagram not found" });

    const isMemberCheck = diagram.members.some(
      (m) => m.userId._id.toString() === req.userId.toString()
    );
    if (!isMemberCheck) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json(
      diagram.members.map((m) => ({
        userId: m.userId._id,
        name: m.userId.name,
        email: m.userId.email,
        role: m.role,
      }))
    );
  } catch (err) {
    console.error("GET /diagrams/:id/members error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/diagrams/:id/members/:memberId ────────────────────────────
router.delete("/:id/members/:memberId", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) return res.status(404).json({ error: "Diagram not found" });

    const requesterMember = diagram.members.find(
      (m) => m.userId.toString() === req.userId.toString()
    );
    if (!requesterMember) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (requesterMember.role !== "owner") {
      return res.status(403).json({ error: "Only the owner can remove members" });
    }

    const owners = diagram.members.filter((m) => m.role === "owner");
    if (
      owners.length === 1 &&
      req.params.memberId === req.userId.toString()
    ) {
      return res.status(400).json({ error: "Cannot remove the sole owner" });
    }

    diagram.members = diagram.members.filter(
      (m) => m.userId.toString() !== req.params.memberId
    );
    await diagram.save();

    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE /diagrams/:id/members/:memberId error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /api/diagrams/:id/members/:memberId ─────────────────────────────
router.patch("/:id/members/:memberId", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) return res.status(404).json({ error: "Diagram not found" });

    if (!isOwner(diagram, req.userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const member = diagram.members.find(
      (m) => m.userId.toString() === req.params.memberId
    );
    if (!member) return res.status(404).json({ error: "Member not found" });

    member.role = req.body.role;
    await diagram.save();

    const populated = await Diagram.findById(diagram._id).populate(
      "members.userId",
      "name email"
    );

    return res.json(
      populated.members.map((m) => ({
        userId: m.userId._id,
        name: m.userId.name,
        email: m.userId.email,
        role: m.role,
      }))
    );
  } catch (err) {
    console.error("PATCH /diagrams/:id/members/:memberId error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

