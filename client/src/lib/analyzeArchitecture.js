/**
 * analyzeArchitecture(canvas)
 * Serializes the canvas, strips visual noise,
 * and sends it to the backend LLM endpoint.
 */
export const analyzeArchitecture = async (canvas) => {
  if (!canvas) throw new Error('No canvas provided');

  // Get the full JSON with custom properties
  const fullJSON = canvas.toJSON(['id', 'context']);

  // Strip visual noise — keep only structurally relevant fields
  const cleanedObjects = fullJSON.objects
    .filter((obj) => !obj.excludeFromExport) // skip grid lines
    .map((obj) => ({
      id: obj.id,
      type: obj.type,
      label: obj.context?.notes || obj.type,
      links: obj.context?.links || [],
      code: obj.context?.code || '',
      position: { x: Math.round(obj.left), y: Math.round(obj.top) },
    }));

  const payload = {
    canvasState: {
      nodeCount: cleanedObjects.filter((o) => ['rect', 'circle'].includes(o.type)).length,
      edgeCount: cleanedObjects.filter((o) => ['line', 'path'].includes(o.type)).length,
      objects: cleanedObjects,
    },
  };

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.analysis;
};
