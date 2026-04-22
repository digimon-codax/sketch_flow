import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, restrict this to your client URL
    methods: ['GET', 'POST']
  }
});

// Setup Redis client
// If using docker-compose, default redis port is 6379 on localhost
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis successfully');
});

// Setup OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_now',
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user requests the full canvas state (e.g., on first load)
  socket.on('canvas:request_state', async () => {
    try {
      const state = await redis.get('canvas_state');
      if (state) {
        socket.emit('canvas:full_state', JSON.parse(state));
      }
    } catch (err) {
      console.error('Error fetching state from Redis:', err);
    }
  });

  // When a user makes a change (delta)
  socket.on('canvas:delta', async (data) => {
    // data contains: { clientId, stateJSON, activeObjectDelta }
    // activeObjectDelta is used for real-time moving, stateJSON is for persistence
    
    // Broadcast the delta to all OTHER connected clients
    socket.broadcast.emit('canvas:delta', data);

    // Save the latest full state to Redis
    if (data.stateJSON) {
      try {
        await redis.set('canvas_state', JSON.stringify(data.stateJSON));
      } catch (err) {
        console.error('Error saving state to Redis:', err);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// API endpoint for AI analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const { canvasState } = req.body;
    
    // In a real app, you would clean the canvasState here if not already done on client
    const prompt = `Analyze this system architecture. Identify single points of failure, suggest specific AWS/GCP services, and recommend database optimizations. Here is the architecture JSON:\n\n${JSON.stringify(canvasState)}`;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({ 
        analysis: "Simulation Mode: No OPENAI_API_KEY found in server/.env.\n\nSimulated Analysis:\n- Single point of failure detected at the API Gateway.\n- Recommend moving to AWS API Gateway.\n- Add a Read Replica for the Postgres Database." 
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
    });

    res.json({ analysis: response.choices[0].message.content });
  } catch (error) {
    console.error('AI Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze architecture' });
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
