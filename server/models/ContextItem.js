import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true },
    url:        { type: String, required: true }, // local path or S3 URL
    size:       { type: Number },
    mimeType:   { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true } // keep _id so we can delete individual files
);

const contextItemSchema = new mongoose.Schema(
  {
    diagramId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Diagram",
      required: true,
    },
    // Excalidraw's own element UUID (string, not ObjectId)
    elementId: { type: String, required: true },

    // Feature 3 — Context Layer tabs
    notes:       { type: String, default: "" },
    links:       { type: [String], default: [] },
    codeSnippet: { type: String, default: "" },
    language:    { type: String, default: "javascript" },
    files:       { type: [fileSchema], default: [] },
  },
  { timestamps: true }
);

// One context document per (diagram, element) pair
contextItemSchema.index({ diagramId: 1, elementId: 1 }, { unique: true });

export default mongoose.model("ContextItem", contextItemSchema);
