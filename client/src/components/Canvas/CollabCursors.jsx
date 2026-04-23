// Renders remote user cursors as SVG pointers overlaid on the canvas
export default function CollabCursors({ cursors }) {
  const entries = Object.entries(cursors); // [userId, { x, y, color, name }]
  if (entries.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 50,
        overflow: "hidden",
      }}
    >
      {entries.map(([userId, { x, y, color, name }]) => (
        <div
          key={userId}
          style={{
            position: "absolute",
            left: x,
            top: y,
            transform: "translate(-2px, -2px)",
            transition: "left 80ms linear, top 80ms linear",
          }}
        >
          {/* Cursor SVG */}
          <svg
            width="20" height="20" viewBox="0 0 20 20"
            fill={color} xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 2L16 10.5L10 11.5L7.5 18L4 2Z"
              stroke="white" strokeWidth="1.2"
            />
          </svg>
          {/* Name badge */}
          <div
            style={{
              position: "absolute",
              top: 18,
              left: 10,
              background: color,
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: 4,
              whiteSpace: "nowrap",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}
          >
            {name || "Guest"}
          </div>
        </div>
      ))}
    </div>
  );
}
