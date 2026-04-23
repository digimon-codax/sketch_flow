import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import api from "../../../api/index";

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(mimeType = "") {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("zip") || mimeType.includes("tar")) return "🗜️";
  return "📎";
}

export default function FilesTab({ diagramId, elementId, files = [], onRefresh }) {
  const onDrop = useCallback(async (acceptedFiles) => {
    for (const file of acceptedFiles) {
      const form = new FormData();
      form.append("file", file);
      try {
        await api.post(`/context/${diagramId}/${elementId}/files`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch (err) {
        console.error("Upload failed:", err.message);
      }
    }
    onRefresh();
  }, [diagramId, elementId, onRefresh]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 20 * 1024 * 1024, // 20 MB
  });

  async function deleteFile(fileId) {
    await api.delete(`/context/${diagramId}/${elementId}/files/${fileId}`);
    onRefresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        File Attachments
      </label>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        style={{
          border:        `2px dashed ${isDragActive ? "#6965db" : "#d8d7fe"}`,
          borderRadius:  10,
          padding:       "20px 16px",
          textAlign:     "center",
          cursor:        "pointer",
          background:    isDragActive ? "#f0f0ff" : "#fafafa",
          transition:    "all 0.15s",
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
        <p style={{ fontSize: 12, color: isDragActive ? "#6965db" : "#aaa", margin: 0 }}>
          {isDragActive
            ? "Drop files here…"
            : "Drag & drop files, or click to browse"}
        </p>
        <p style={{ fontSize: 11, color: "#ccc", marginTop: 4 }}>Max 20 MB per file</p>
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <p style={{ fontSize: 12, color: "#bbb", textAlign: "center" }}>No files yet</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {files.map((f) => (
            <div
              key={f._id}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          10,
                background:   "#f8f7ff",
                border:       "1px solid #e3e2fe",
                borderRadius: 7,
                padding:      "8px 10px",
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{fileIcon(f.mimeType)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={f.url} target="_blank" rel="noreferrer"
                  download={f.name}
                  style={{
                    fontSize:       12,
                    fontWeight:     500,
                    color:          "#6965db",
                    textDecoration: "none",
                    display:        "block",
                    overflow:       "hidden",
                    textOverflow:   "ellipsis",
                    whiteSpace:     "nowrap",
                  }}
                  title={f.name}
                >
                  {f.name}
                </a>
                <span style={{ fontSize: 10, color: "#bbb" }}>{formatSize(f.size)}</span>
              </div>
              <button
                onClick={() => deleteFile(f._id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#ccc", fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0,
                }}
                title="Remove"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
