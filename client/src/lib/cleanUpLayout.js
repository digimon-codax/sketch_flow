import dagre from 'dagre';
import * as fabric from 'fabric';

/**
 * cleanUpLayout(canvas)
 * Maps all Rects/Circles as Nodes, Lines/Paths as Edges,
 * computes a hierarchical Dagre layout, and smoothly
 * animates each object to its new position.
 */
export const cleanUpLayout = (canvas) => {
  if (!canvas) return;

  const objects = canvas.getObjects();

  // Classify objects: nodes vs edges (skip grid lines)
  const nodes = objects.filter(
    (o) =>
      !o.excludeFromExport &&
      (o.type === 'rect' || o.type === 'circle')
  );
  const edges = objects.filter(
    (o) =>
      !o.excludeFromExport &&
      (o.type === 'line' || o.type === 'path')
  );

  if (nodes.length === 0) return;

  // Build Dagre graph
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'TB',   // Top-to-Bottom hierarchy
    nodesep: 60,     // Horizontal gap between nodes
    ranksep: 80,     // Vertical gap between ranks
    marginx: 60,
    marginy: 60,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Register each node with its width and height
  nodes.forEach((obj) => {
    const width = obj.getScaledWidth ? obj.getScaledWidth() : obj.width * (obj.scaleX || 1);
    const height = obj.getScaledHeight ? obj.getScaledHeight() : obj.height * (obj.scaleY || 1);
    g.setNode(obj.id, { label: obj.id, width: width + 20, height: height + 20 });
  });

  // Register edges if we can identify node IDs on line endpoints
  // Edges are matched by proximity: find the two nearest nodes to each edge's endpoints
  edges.forEach((edge, i) => {
    let x1, y1, x2, y2;
    if (edge.type === 'line') {
      x1 = edge.x1 + (edge.left || 0);
      y1 = edge.y1 + (edge.top || 0);
      x2 = edge.x2 + (edge.left || 0);
      y2 = edge.y2 + (edge.top || 0);
    } else {
      // For paths, use bounding box corners
      const bounds = edge.getBoundingRect();
      x1 = bounds.left;
      y1 = bounds.top;
      x2 = bounds.left + bounds.width;
      y2 = bounds.top + bounds.height;
    }

    const nearest = (px, py) => {
      let minDist = Infinity;
      let found = null;
      nodes.forEach((node) => {
        const cx = node.left + node.width / 2;
        const cy = node.top + node.height / 2;
        const dist = Math.hypot(px - cx, py - cy);
        if (dist < minDist) { minDist = dist; found = node; }
      });
      return found;
    };

    const from = nearest(x1, y1);
    const to = nearest(x2, y2);

    if (from && to && from.id !== to.id) {
      g.setEdge(from.id, to.id);
    }
  });

  // Compute Dagre layout
  dagre.layout(g);

  // Animate all nodes to their new Dagre positions
  nodes.forEach((obj) => {
    const nodeData = g.node(obj.id);
    if (!nodeData) return;

    const newLeft = nodeData.x - nodeData.width / 2;
    const newTop = nodeData.y - nodeData.height / 2;

    // Use fabric.util.animate for a smooth eased transition
    const currentLeft = obj.left;
    const currentTop = obj.top;

    fabric.util.animate({
      startValue: 0,
      endValue: 1,
      duration: 600,
      easing: fabric.util.ease.easeInOutCubic,
      onChange: (val) => {
        obj.set({
          left: currentLeft + (newLeft - currentLeft) * val,
          top: currentTop + (newTop - currentTop) * val,
        });
        canvas.renderAll();
      },
      onComplete: () => {
        obj.setCoords();
        canvas.renderAll();
      },
    });
  });
};
