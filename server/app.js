import express from 'express';
import cors from 'cors';
import path from 'path';
import authRouter from './routes/auth.js';
import diagramsRouter from './routes/diagrams.js';
import aiRouter from './routes/ai.js';
import contextRouter from './routes/context.js';

const app = express();

// Middleware
app.use(cors({ origin: '*' })); // Restrict in production
app.use(express.json({ limit: '2mb' })); // Canvas JSON can be large

// Serve local uploads statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/diagrams', diagramsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/context', contextRouter);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

export default app;
