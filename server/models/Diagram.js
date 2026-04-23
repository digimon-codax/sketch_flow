import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      default: "editor",
    },
  },
  { _id: false }
);

const diagramSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: "Untitled Diagram",
    },
    elements: {
      type: Array,
      default: [],
    },
    appState: {
      type: Object,
      default: { panX: 0, panY: 0, zoom: 1 },
    },
    members: {
      type: [memberSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const Diagram = mongoose.model("Diagram", diagramSchema);

export default Diagram;
