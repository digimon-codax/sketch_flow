import Anthropic from '@anthropic-ai/sdk';

// Provide a dummy key if not set to prevent SDK crash
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-dummy-key',
});

const isSimulation = !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('dummy');

export const cleanupLayoutAI = async (objects) => {
  if (isSimulation) {
    console.warn('[AI] Simulation mode: Returning fake cleanup layout');
    return objects.map((obj, i) => ({
      id: obj.id,
      left: 100 + (i % 5) * 150,
      top: 100 + Math.floor(i / 5) * 150
    }));
  }

  const prompt = `You are a diagram layout engine. You will receive a list of canvas objects from a Fabric.js diagram. Each object has an id, type, and approximate position.

Your job is to reorganize them into a clean, readable hierarchical layout following these rules:
- Identify logical groupings (e.g. clients, servers, databases, caches)
- Arrange in a top-down flow: clients at top, databases at bottom
- Align elements in clean rows and columns on a grid (snap to 120px horizontal, 100px vertical increments)
- Ensure no overlapping, generous spacing between nodes
- Keep arrows/connectors pointing in logical directions

Return ONLY valid JSON in this exact format, no explanation:
{
  "layout": [
    { "id": "object-id", "left": 120, "top": 80 }
  ]
}

Canvas objects:
${JSON.stringify(objects)}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  try {
    const rawContent = response.content[0].text;
    const jsonStr = rawContent.substring(rawContent.indexOf('{'), rawContent.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);
    return parsed.layout;
  } catch (err) {
    console.error('[AI] Failed to parse cleanup layout:', err);
    throw new Error('Failed to parse AI response');
  }
};

export const assistArchitectureAI = async (imageBase64, objects) => {
  if (isSimulation) {
    console.warn('[AI] Simulation mode: Returning fake assist suggestions');
    return {
      suggestions: [
        {
          type: "missing",
          severity: "high",
          title: "Simulation DB Replica",
          description: "Database is a single point of failure.",
          recommendation: "Add a read replica."
        }
      ],
      scalabilityScore: 7,
      summary: "Simulated response — add your Anthropic API key to .env"
    };
  }

  // Strip the "data:image/png;base64," prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const prompt = `You are a senior software architect reviewing a system design diagram.

You will receive:
1. A screenshot of the diagram
2. A JSON list of the labeled elements on the canvas

Analyze the architecture and return a JSON response ONLY (no explanation, no markdown) in this format:
{
  "suggestions": [
    {
      "type": "missing",
      "severity": "high" | "medium" | "low",
      "title": "Short title",
      "description": "1-2 sentence explanation",
      "recommendation": "Specific actionable fix"
    }
  ],
  "scalabilityScore": 6,
  "summary": "One sentence overall assessment"
}

Canvas elements:
${JSON.stringify(objects)}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64Data } },
        { type: 'text', text: prompt }
      ]
    }]
  });

  try {
    const rawContent = response.content[0].text;
    const jsonStr = rawContent.substring(rawContent.indexOf('{'), rawContent.lastIndexOf('}') + 1);
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('[AI] Failed to parse assist response:', err);
    throw new Error('Failed to parse AI response');
  }
};
