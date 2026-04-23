import { Router }   from "express";
import multer        from "multer";
import path          from "path";
import fs            from "fs";
import { fileURLToPath } from "url";
import { requireAuth }   from "../middleware/auth.js";
import ContextItem        from "../models/ContextItem.js";
import Diagram            from "../models/Diagram.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router    = Router();

// ── Local file storage (swap for S3 in prod) ─────────────────
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB per file
});

router.use(requireAuth);

// ── Helper: verify user is a diagram member ───────────────────
async function assertMember(diagramId, userId, res) {
  const diagram = await Diagram.findById(diagramId).lean();
  if (!diagram) { res.status(404).json({ error: "Diagram not found" }); return false; }
  const isMember = diagram.members.some((m) => m.userId.toString() === userId);
  if (!isMember) { res.status(403).json({ error: "Access denied" }); return false; }
  return true;
}

// ── GET /api/context/:diagramId/:elementId ────────────────────
// Fetch context for a single Excalidraw element
router.get("/:diagramId/:elementId", async (req, res) => {
  const { diagramId, elementId } = req.params;
  try {
    if (!(await assertMember(diagramId, req.userId, res))) return;

    const item = await ContextItem.findOne({ diagramId, elementId }).lean();
    // Return empty defaults if no context exists yet
    res.json(item ?? {
      notes:       "",
      links:       [],
      codeSnippet: "",
      language:    "javascript",
      files:       [],
    });
  } catch (err) {
    console.error("[GET /api/context]", err);
    res.status(500).json({ error: "Failed to fetch context" });
  }
});

// ── PATCH /api/context/:diagramId/:elementId ──────────────────
// Create or update context (upsert)
router.patch("/:diagramId/:elementId", async (req, res) => {
  const { diagramId, elementId } = req.params;
  try {
    if (!(await assertMember(diagramId, req.userId, res))) return;

    const { notes, links, codeSnippet, language } = req.body;
    const update = {};
    if (notes       !== undefined) update.notes       = notes;
    if (links       !== undefined) update.links       = links;
    if (codeSnippet !== undefined) update.codeSnippet = codeSnippet;
    if (language    !== undefined) update.language    = language;

    const item = await ContextItem.findOneAndUpdate(
      { diagramId, elementId },
      { $set: update },
      { upsert: true, new: true }
    );
    res.json(item);
  } catch (err) {
    console.error("[PATCH /api/context]", err);
    res.status(500).json({ error: "Failed to save context" });
  }
});

// ── POST /api/context/:diagramId/:elementId/files ─────────────
// Upload a file attachment to an element
router.post(
  "/:diagramId/:elementId/files",
  upload.single("file"),
  async (req, res) => {
    const { diagramId, elementId } = req.params;
    try {
      if (!(await assertMember(diagramId, req.userId, res))) return;
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const { originalname, size, mimetype, filename } = req.file;
      const fileEntry = {
        name:     originalname,
        url:      `/uploads/${filename}`,
        size,
        mimeType: mimetype,
      };

      const item = await ContextItem.findOneAndUpdate(
        { diagramId, elementId },
        { $push: { files: fileEntry } },
        { upsert: true, new: true }
      );
      res.json(item);
    } catch (err) {
      console.error("[POST /api/context/files]", err);
      res.status(500).json({ error: "File upload failed" });
    }
  }
);

// ── DELETE /api/context/:diagramId/:elementId/files/:fileId ───
// Remove a single file attachment
router.delete("/:diagramId/:elementId/files/:fileId", async (req, res) => {
  const { diagramId, elementId, fileId } = req.params;
  try {
    if (!(await assertMember(diagramId, req.userId, res))) return;

    // Pull the file sub-document out of the array
    await ContextItem.findOneAndUpdate(
      { diagramId, elementId },
      { $pull: { files: { _id: fileId } } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/context/files]", err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
