import express from 'express';
import cors from 'cors';
import analyzeRouter from './routes/analyze.js';

const app = express();

// Middleware
app.use(cors({ origin: '*' })); // Restrict in production
app.use(express.json({ limit: '2mb' })); // Canvas JSON can be large

// Routes
app.use('/api/analyze', analyzeRouter);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

export default app;
