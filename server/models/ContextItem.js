import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const contextItemSchema = new mongoose.Schema(
  {
    diagramId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Diagram",
      required: true,
    },
    elementId: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    links: {
      type: [String],
      default: [],
    },
    codeSnippet: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      default: "javascript",
    },
    files: {
      type: [fileSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Compound unique index — one context item per element per diagram
contextItemSchema.index({ diagramId: 1, elementId: 1 }, { unique: true });

const ContextItem = mongoose.model("ContextItem", contextItemSchema);

export default ContextItem;
