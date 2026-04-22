import openai from '../config/openai.js';

const ARCHITECTURE_PROMPT = `You are a senior cloud architect. Analyze the following system architecture JSON.

Your response must cover:
1. **Single Points of Failure** — identify which nodes or connections are critical bottlenecks.
2. **AWS/GCP Service Recommendations** — suggest specific managed services that could replace or improve each component.
3. **Database Optimizations** — recommend indexing strategies, caching layers (Redis, Memcached), or read replicas.
4. **Scalability Concerns** — flag any components that won't scale horizontally.

Keep your response concise, structured, and actionable. Use bullet points.`;

/**
 * Calls the LLM with the cleaned architecture payload.
 * Returns the AI response string.
 */
export const analyzeWithAI = async (canvasState) => {
  // Simulation mode — no API key
  if (!process.env.OPENAI_API_KEY) {
    return simulateAnalysis(canvasState);
  }

  const userMessage = `${ARCHITECTURE_PROMPT}\n\nArchitecture JSON:\n${JSON.stringify(canvasState, null, 2)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: userMessage }],
    max_tokens: 1000,
    temperature: 0.4,
  });

  return response.choices[0].message.content;
};

/**
 * Returns a deterministic fake analysis when no API key is set.
 * Useful for local dev and demos.
 */
const simulateAnalysis = (canvasState) => {
  const nodeCount = canvasState.nodeCount || 0;
  const edgeCount = canvasState.edgeCount || 0;

  return `## Simulation Mode (No OPENAI_API_KEY set)

## Single Points of Failure
- ${nodeCount} node(s) detected — no redundancy configured.
- ${edgeCount > 0 ? `${edgeCount} edge(s) found — recommend adding circuit breakers.` : 'No edges found — architecture appears disconnected.'}

## AWS/GCP Recommendations
- Replace monolithic nodes with AWS Lambda or GCP Cloud Run for stateless services.
- Use AWS API Gateway or GCP Apigee for centralized traffic management.
- Introduce AWS RDS Multi-AZ or Cloud Spanner for high-availability databases.

## Database Optimizations
- Add a Redis caching layer in front of read-heavy endpoints.
- Implement connection pooling (e.g., PgBouncer).
- Add composite indexes on frequently queried foreign keys.

## Scalability Concerns
- No load balancer detected — add AWS ALB or GCP Load Balancer.
- Consider introducing a message queue (SQS/Pub-Sub) for async workloads.`;
};
