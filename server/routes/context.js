import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import ContextItem from "../models/ContextItem.js";
import { requireAuth } from "../middleware/auth.js";

// Ensure uploads directory exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });
const router = express.Router();

router.use(requireAuth);

// ── GET /api/context/:diagramId/:elementId ──────────────────────────────────
router.get("/:diagramId/:elementId", async (req, res) => {
  try {
    const { diagramId, elementId } = req.params;
    const item = await ContextItem.findOne({ diagramId, elementId });

    if (!item) {
      return res.json({
        notes: "",
        links: [],
        codeSnippet: "",
        language: "javascript",
        files: [],
      });
    }

    return res.json(item);
  } catch (err) {
    console.error("GET /context error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /api/context/:diagramId/:elementId ────────────────────────────────
router.patch("/:diagramId/:elementId", async (req, res) => {
  try {
    const { diagramId, elementId } = req.params;
    const { notes, links, codeSnippet, language } = req.body;

    const updates = {};
    if (notes !== undefined) updates.notes = notes;
    if (links !== undefined) updates.links = links;
    if (codeSnippet !== undefined) updates.codeSnippet = codeSnippet;
    if (language !== undefined) updates.language = language;

    const updated = await ContextItem.findOneAndUpdate(
      { diagramId, elementId },
      { $set: updates },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json(updated);
  } catch (err) {
    console.error("PATCH /context error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/context/:diagramId/:elementId/files ───────────────────────────
router.post("/:diagramId/:elementId/files", upload.single("file"), async (req, res) => {
  try {
    const { diagramId, elementId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileEntry = {
      name: req.file.originalname,
      url: "/uploads/" + req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
    };

    const updated = await ContextItem.findOneAndUpdate(
      { diagramId, elementId },
      { $push: { files: fileEntry } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json(updated);
  } catch (err) {
    console.error("POST /context/files error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/context/:diagramId/:elementId/files/:fileId ─────────────────
router.delete("/:diagramId/:elementId/files/:fileId", async (req, res) => {
  try {
    const { diagramId, elementId, fileId } = req.params;

    const updated = await ContextItem.findOneAndUpdate(
      { diagramId, elementId },
      { $pull: { files: { _id: new mongoose.Types.ObjectId(fileId) } } },
      { new: true }
    );

    // Note: To be fully complete, you might want to fs.unlink the physical file here
    // based on the file url, but we'll stick to the requested behavior of pulling the doc.

    return res.json({ success: true, updated });
  } catch (err) {
    console.error("DELETE /context/files error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
