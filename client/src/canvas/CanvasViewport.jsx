export function CanvasViewport({ canvasRef, containerRef }) {
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden outline-none touch-none"
      style={{ isolation: "isolate" }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
