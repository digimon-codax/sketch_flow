import * as fabric from 'fabric';

// Extend the prototype to include our custom `context` property.
// This allows every object to hold metadata like notes, code, links, etc.
export const extendFabricPrototype = () => {
  if (fabric.Object.prototype.context) return; // Already extended

  Object.assign(fabric.Object.prototype, {
    context: {
      notes: '',
      code: '',
      links: [],
      files: []
    }
  });

  // Override toObject so our custom `context` property and id are serialized to JSON
  const originalToObject = fabric.Object.prototype.toObject;
  fabric.Object.prototype.toObject = function (propertiesToInclude = []) {
    return originalToObject.call(this, ['context', 'id', ...propertiesToInclude]);
  };
};
