import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { cleanupLayoutAI, assistArchitectureAI } from '../services/aiService.js';

const router = Router();

// Apply auth middleware
router.use(authenticate);

// POST /api/ai/cleanup
router.post('/cleanup', async (req, res) => {
  try {
    const { objects } = req.body;
    if (!objects || !Array.isArray(objects)) {
      return res.status(400).json({ error: 'Array of objects is required' });
    }

    const layout = await cleanupLayoutAI(objects);
    res.json({ layout });
  } catch (error) {
    console.error('[/api/ai/cleanup] Error:', error);
    res.status(500).json({ error: 'AI cleanup failed' });
  }
});

// POST /api/ai/assist
router.post('/assist', async (req, res) => {
  try {
    const { imageBase64, objects } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 screenshot is required' });
    }

    const analysis = await assistArchitectureAI(imageBase64, objects || []);
    res.json(analysis);
  } catch (error) {
    console.error('[/api/ai/assist] Error:', error);
    res.status(500).json({ error: 'AI assist failed' });
  }
});

export default router;
