import React, { useState, useEffect } from "react";

export default function NotesTab({ notes, onSave }) {
  const [local, setLocal] = useState(notes || '');

  useEffect(() => {
    setLocal(notes || '');
  }, [notes]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (local !== (notes || '')) {
        onSave(local);
      }
    }, 800);
    return () => clearTimeout(handler);
  }, [local, notes, onSave]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="Add notes about this element..."
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          borderRadius: 0,
          padding: 0,
          fontSize: '13px',
          lineHeight: 1.6,
          color: 'var(--text-primary)',
          resize: 'none',
          outline: 'none',
          fontFamily: 'inherit'
        }}
      />
    </div>
  );
}
