import { Router } from 'express';
import { registerUser, loginUser } from '../services/authService.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const data = await registerUser(name, email, password);
    res.status(201).json(data);
  } catch (error) {
    if (error.message === 'Email already in use') {
      return res.status(409).json({ error: error.message });
    }
    console.error('[/api/auth/register] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const data = await loginUser(email, password);
    res.json(data);
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: error.message });
    }
    console.error('[/api/auth/login] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
