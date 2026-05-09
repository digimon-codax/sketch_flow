import React, { useEffect, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';

const languageExtensions = {
  javascript: javascript(),
  python: python(),
  sql: sql(),
  json: json(),
  bash: javascript(),
};

export default function CodeTab({ snippet, language, onSave, isReadOnly = false }) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const [lang, setLang] = useState(language || 'javascript');

  useEffect(() => { setLang(language || 'javascript'); }, [language]);

  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      basicSetup,
      oneDark,
      languageExtensions[lang] || languageExtensions.javascript,
    ];

    if (!isReadOnly) {
      const onUpdate = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newCode = update.state.doc.toString();
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(() => { onSave(newCode, lang); }, 800);
        }
      });
      extensions.push(onUpdate);
    } else {
      extensions.push(EditorState.readOnly.of(true));
    }

    const state = EditorState.create({ doc: snippet || '', extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, isReadOnly]);

  useEffect(() => {
    const view = viewRef.current;
    if (view && snippet !== undefined && snippet !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: snippet } });
    }
  }, [snippet]);

  const handleLangChange = (e) => {
    const newLang = e.target.value;
    setLang(newLang);
    const view = viewRef.current;
    if (view && !isReadOnly) onSave(view.state.doc.toString(), newLang);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      {/* Language selector — hidden for viewer */}
      {!isReadOnly && (
        <select
          value={lang}
          onChange={handleLangChange}
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)',
            padding: '4px 8px', fontSize: '12px', marginBottom: '8px', width: '100%', outline: 'none',
          }}
        >
          <option value="javascript">javascript</option>
          <option value="python">python</option>
          <option value="sql">sql</option>
          <option value="json">json</option>
          <option value="bash">bash</option>
        </select>
      )}
      <div
        ref={containerRef}
        style={{
          flex: 1, minHeight: '180px', overflow: 'auto',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          opacity: isReadOnly ? 0.8 : 1,
        }}
      />
    </div>
  );
}