import { Router } from "express";
import Diagram from "../models/Diagram.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// All diagram routes require authentication
router.use(requireAuth);

// ── GET /api/diagrams ─────────────────────────────────────────
// List all diagrams the current user is a member of
router.get("/", async (req, res) => {
  try {
    const diagrams = await Diagram.find({ "members.userId": req.userId })
      .select("name members createdAt updatedAt") // don't return full excalidrawState in list
      .sort({ updatedAt: -1 })
      .lean();

    res.json(diagrams);
  } catch (err) {
    console.error("[GET /api/diagrams]", err);
    res.status(500).json({ error: "Failed to fetch diagrams" });
  }
});

// ── POST /api/diagrams ────────────────────────────────────────
// Create a new diagram (current user becomes owner)
router.post("/", async (req, res) => {
  try {
    const { name = "Untitled Diagram" } = req.body;

    const diagram = await Diagram.create({
      name,
      excalidrawState: { elements: [], appState: {}, files: {} },
      members: [{ userId: req.userId, role: "owner" }],
    });

    res.status(201).json(diagram);
  } catch (err) {
    console.error("[POST /api/diagrams]", err);
    res.status(500).json({ error: "Failed to create diagram" });
  }
});

// ── GET /api/diagrams/:id ─────────────────────────────────────
// Get one diagram with its full Excalidraw state
router.get("/:id", async (req, res) => {
  try {
    const diagram = await Diagram.findById(req.params.id)
      .populate("members.userId", "name email")
      .lean();

    if (!diagram) return res.status(404).json({ error: "Diagram not found" });

    // Verify the requesting user is a member
    const isMember = diagram.members.some(
      (m) => m.userId?._id?.toString() === req.userId || m.userId?.toString() === req.userId
    );
    if (!isMember) return res.status(403).json({ error: "Access denied" });

    res.json(diagram);
  } catch (err) {
    console.error("[GET /api/diagrams/:id]", err);
    res.status(500).json({ error: "Failed to fetch diagram" });
  }
});

// ── PATCH /api/diagrams/:id ───────────────────────────────────
// Autosave — update name or excalidrawState
router.patch("/:id", async (req, res) => {
  try {
    const { name, excalidrawState } = req.body;

    // Only allow owner/editor to update
    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) return res.status(404).json({ error: "Diagram not found" });

    const member = diagram.members.find(
      (m) => m.userId.toString() === req.userId
    );
    if (!member || member.role === "viewer") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Apply updates
    if (name !== undefined)              diagram.name             = name;
    if (excalidrawState !== undefined)   diagram.excalidrawState  = excalidrawState;

    await diagram.save();
    res.json({ success: true, updatedAt: diagram.updatedAt });
  } catch (err) {
    console.error("[PATCH /api/diagrams/:id]", err);
    res.status(500).json({ error: "Failed to save diagram" });
  }
});

// ── DELETE /api/diagrams/:id ──────────────────────────────────
// Only the owner can delete
router.delete("/:id", async (req, res) => {
  try {
    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) return res.status(404).json({ error: "Diagram not found" });

    const member = diagram.members.find(
      (m) => m.userId.toString() === req.userId
    );
    if (!member || member.role !== "owner") {
      return res.status(403).json({ error: "Only the owner can delete this diagram" });
    }

    await diagram.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/diagrams/:id]", err);
    res.status(500).json({ error: "Failed to delete diagram" });
  }
});

// ── POST /api/diagrams/:id/members ───────────────────────────
// Add a collaborator by email
router.post("/:id/members", async (req, res) => {
  try {
    const { email, role = "editor" } = req.body;

    const diagram = await Diagram.findById(req.params.id);
    if (!diagram) return res.status(404).json({ error: "Diagram not found" });

    // Only owner can add members
    const requester = diagram.members.find(
      (m) => m.userId.toString() === req.userId && m.role === "owner"
    );
    if (!requester) return res.status(403).json({ error: "Only the owner can add members" });

    // Find the user to add
    const { default: User } = await import("../models/User.js");
    const newUser = await User.findOne({ email: email.toLowerCase() });
    if (!newUser) return res.status(404).json({ error: "No user with that email" });

    // Don't add if already a member
    const alreadyMember = diagram.members.some(
      (m) => m.userId.toString() === newUser._id.toString()
    );
    if (alreadyMember) return res.status(409).json({ error: "User is already a member" });

    diagram.members.push({ userId: newUser._id, role });
    await diagram.save();
    res.json({ success: true });
  } catch (err) {
    console.error("[POST /api/diagrams/:id/members]", err);
    res.status(500).json({ error: "Failed to add member" });
  }
});

export default router;
