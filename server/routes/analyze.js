import { Router } from 'express';
import { analyzeWithAI } from '../services/aiService.js';

const router = Router();

/**
 * POST /api/analyze
 * Body: { canvasState: { nodeCount, edgeCount, objects[] } }
 */
router.post('/', async (req, res) => {
  try {
    const { canvasState } = req.body;

    if (!canvasState) {
      return res.status(400).json({ error: 'canvasState is required in the request body.' });
    }

    const analysis = await analyzeWithAI(canvasState);
    res.json({ analysis });
  } catch (error) {
    console.error('[/api/analyze] Error:', error.message);
    res.status(500).json({ error: 'AI analysis failed. Please try again.' });
  }
});

export default router;
