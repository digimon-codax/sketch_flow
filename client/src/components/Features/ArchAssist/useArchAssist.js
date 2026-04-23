import { useState } from "react";
import api from "../../../api/index";
import { useUiStore } from "../../../store/uiStore";

export function useArchAssist(excalidrawAPI) {
  const [loading, setLoading] = useState(false);
  const setAssistResult = useUiStore((s) => s.setAssistResult);

  async function runAssist() {
    if (!excalidrawAPI || loading) return;
    setLoading(true);

    try {
      // Export canvas as PNG blob → base64
      const blob = await excalidrawAPI.exportToBlob({
        mimeType:  "image/png",
        quality:   1,
        exportPadding: 16,
      });

      const imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Get element labels for the prompt
      const elements = excalidrawAPI
        .getSceneElements()
        .filter((el) => !el.isDeleted)
        .map((el) => ({ type: el.type, label: el.text ?? el.type }));

      const { data } = await api.post("/ai/assist", { imageBase64, elements });
      setAssistResult(data);
    } catch (err) {
      console.error("[Arch Assist] failed:", err.message);
      setAssistResult({
        summary: "Analysis failed — check your Anthropic API key in server/.env",
        scalabilityScore: 0,
        suggestions: [],
      });
    } finally {
      setLoading(false);
    }
  }

  return { runAssist, loading };
}
