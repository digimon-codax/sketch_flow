import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "../middleware/auth.js";

const router  = Router();
const claude  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const hasKey  = process.env.ANTHROPIC_API_KEY &&
                !process.env.ANTHROPIC_API_KEY.includes("YOUR_KEY");

router.use(requireAuth);

// ── POST /api/ai/cleanup ──────────────────────────────────────
// Feature 1 — Mess Cleanup
router.post("/cleanup", async (req, res) => {
  const { objects } = req.body;

  if (!objects || !Array.isArray(objects) || objects.length === 0) {
    return res.status(400).json({ error: "objects array is required" });
  }

  // Simulation mode when no real API key is present
  if (!hasKey) {
    const layout = objects
      .filter((o) => o.type !== "arrow")
      .map((o, i) => ({
        id: o.id,
        x:  100 + (i % 4) * 200,
        y:  100 + Math.floor(i / 4) * 160,
      }));
    return res.json({ layout });
  }

  const prompt = `You are a diagram layout engine. Reorganize these Excalidraw canvas elements into a clean hierarchical layout.

Rules:
- Identify logical tiers: clients/users at top, APIs/services in middle, databases/caches at bottom
- Align to a 180px horizontal grid, 140px vertical grid
- Minimum 40px gap between any two elements
- Skip elements with type "arrow" — do not include them in the output
- Group similar types in horizontal rows, centered on the canvas (canvas center ≈ x:600, y:400)

Return ONLY valid JSON, no explanation, no markdown fences:
{
  "layout": [
    { "id": "element-id", "x": 180, "y": 140 }
  ]
}

Elements:
${JSON.stringify(objects, null, 2)}`;

  try {
    const response = await claude.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages:   [{ role: "user", content: prompt }],
    });

    const raw     = response.content[0].text.replace(/```json|```/g, "").trim();
    const parsed  = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error("[/api/ai/cleanup]", err.message);
    res.status(500).json({ error: "Cleanup failed", detail: err.message });
  }
});

// ── POST /api/ai/assist ───────────────────────────────────────
// Feature 2 — Architecture Assist
router.post("/assist", async (req, res) => {
  const { imageBase64, elements } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 is required" });
  }

  // Simulation mode
  if (!hasKey) {
    return res.json({
      summary: "Simulated response — add your Anthropic API key to server/.env",
      scalabilityScore: 6,
      suggestions: [
        {
          type: "missing",
          severity: "high",
          title: "No caching layer",
          description: "Every request hits the database directly.",
          recommendation: "Add Redis between your API and database.",
        },
        {
          type: "performance",
          severity: "medium",
          title: "Single database instance",
          description: "Database is a single point of failure.",
          recommendation: "Add a read replica or use a managed cluster.",
        },
      ],
    });
  }

  const prompt = `You are a senior software architect reviewing a hand-drawn system design diagram.

Analyze and return ONLY this JSON (no markdown, no explanation):
{
  "summary": "One sentence overall verdict",
  "scalabilityScore": 7,
  "suggestions": [
    {
      "type": "missing | improvement | api | database | performance | security",
      "severity": "high | medium | low",
      "title": "Short title under 8 words",
      "description": "What the problem or opportunity is",
      "recommendation": "Specific tool, pattern, or fix"
    }
  ]
}

Max 6 suggestions. Focus on: missing components, scalability issues, wrong DB choice, missing caching, no auth/rate limiting, single points of failure.

Elements on canvas: ${JSON.stringify(elements)}`;

  try {
    const response = await claude.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          {
            type:   "image",
            source: { type: "base64", media_type: "image/png", data: imageBase64 },
          },
          { type: "text", text: prompt },
        ],
      }],
    });

    const raw    = response.content[0].text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error("[/api/ai/assist]", err.message);
    res.status(500).json({ error: "Assist failed", detail: err.message });
  }
});

export default router;
