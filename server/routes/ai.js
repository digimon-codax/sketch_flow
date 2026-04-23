import express from "express";
import { model } from "../services/gemini.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// ── Helper: strip ```json fences and parse ────────────────────────────────
function parseGeminiJSON(raw) {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

// ── POST /api/ai/cleanup ──────────────────────────────────────────────────
router.post("/cleanup", async (req, res) => {
  try {
    const { objects = [] } = req.body;

    const prompt = `You are a diagram layout engine. Reorganize these canvas elements into a clean hierarchy.
Rules:
- Identify tiers: users/clients at top, APIs/services middle, databases/caches bottom
- Use 180px horizontal grid, 140px vertical grid
- Minimum 40px gap between elements
- Skip type "arrow" and "line" — do not include them in output
- Center each tier horizontally starting x=100, first tier y=80
Return ONLY valid JSON, no explanation, no markdown:
{"layout":[{"id":"...","x":100,"y":80}]}
Elements: ${JSON.stringify(objects)}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    const parsed = parseGeminiJSON(raw);
    return res.json({ layout: parsed.layout });
  } catch (err) {
    console.error("Cleanup AI error:", err.message);
    return res.status(500).json({ error: "Cleanup failed", detail: err.message });
  }
});

// ── POST /api/ai/assist ───────────────────────────────────────────────────
router.post("/assist", async (req, res) => {
  try {
    const { imageBase64, elements = [] } = req.body;

    const promptText = `You are a senior software architect reviewing a system design diagram.
Return ONLY this JSON (no markdown, no explanation):
{
  "summary": "one sentence assessment",
  "scalabilityScore": 7,
  "suggestions": [
    {
      "type": "missing|improvement|api|database|performance|security",
      "severity": "high|medium|low",
      "title": "max 7 words",
      "description": "what the issue is",
      "recommendation": "specific fix or tool"
    }
  ]
}
Max 5 suggestions. Focus on: missing components, bottlenecks, security gaps, wrong tech choices, scalability issues.
Elements on canvas: ${JSON.stringify(elements)}`;

    const contentParts = [promptText];

    // Include screenshot if provided
    if (imageBase64) {
      contentParts.unshift({
        inlineData: {
          mimeType: "image/png",
          data: imageBase64,
        },
      });
    }

    const result = await model.generateContent(contentParts);
    const raw = result.response.text();

    const parsed = parseGeminiJSON(raw);
    return res.json(parsed);
  } catch (err) {
    console.error("Assist AI error:", err.message);
    return res.status(500).json({ error: "Assist failed", detail: err.message });
  }
});

export default router;
