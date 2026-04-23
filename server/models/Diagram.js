import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role:   { type: String, enum: ["owner", "editor", "viewer"], default: "editor" },
  },
  { _id: false }
);

const diagramSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, default: "Untitled Diagram" },

    // Full Excalidraw scene state — elements, appState, files
    excalidrawState: {
      type: Object,
      default: { elements: [], appState: {}, files: {} },
    },

    // Users with access to this diagram
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true }
);

// Virtual: get the owner member
diagramSchema.virtual("owner").get(function () {
  return this.members.find((m) => m.role === "owner");
});

export default mongoose.model("Diagram", diagramSchema);
