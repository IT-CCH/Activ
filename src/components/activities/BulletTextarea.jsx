import React, { useRef, useCallback } from 'react';

/**
 * Auto-bullet / auto-number textarea.
 *
 * mode="bullet"  → each line starts with "• "
 * mode="number"  → each line starts with "1. ", "2. ", …
 *
 * Value is stored as plain text with prefixes on each line.
 */
const BulletTextarea = ({ value, onChange, mode = 'bullet', placeholder, rows = 4, className = '' }) => {
  const ref = useRef(null);

  const prefix = (lineIndex) =>
    mode === 'number' ? `${lineIndex + 1}. ` : '• ';

  // Ensure the value always has at least one prefixed line
  const ensurePrefix = useCallback(
    (text) => {
      if (!text || text.trim() === '') return prefix(0);
      return text;
    },
    [mode]
  );

  // Rebuild from raw lines (strip old prefixes then re-apply)
  const rebuildLines = useCallback(
    (raw) => {
      const strippedLines = raw.split('\n').map((line) => {
        // Strip existing bullet or number prefix
        return line.replace(/^(•\s*|\d+\.\s*)/, '');
      });
      return strippedLines
        .map((line, i) => `${prefix(i)}${line}`)
        .join('\n');
    },
    [mode]
  );

  const handleChange = (e) => {
    const raw = e.target.value;
    // Rebuild the value with correct prefixes
    const rebuilt = rebuildLines(raw);
    onChange(rebuilt);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const ta = ref.current;
      const start = ta.selectionStart;
      const currentVal = value || '';
      const linesBefore = currentVal.substring(0, start).split('\n');
      const currentLine = linesBefore[linesBefore.length - 1];

      // If the current line is empty (just the prefix), remove it instead of adding new line
      const strippedLine = currentLine.replace(/^(•\s*|\d+\.\s*)/, '').trim();
      if (!strippedLine && linesBefore.length > 1) {
        // Remove the empty prefixed line
        const before = linesBefore.slice(0, -1).join('\n');
        const after = currentVal.substring(start);
        const newVal = before + '\n' + after;
        onChange(rebuildLines(newVal));
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = before.length + 1;
        });
        return;
      }

      const nextIdx = linesBefore.length;
      const newPrefix = prefix(nextIdx);
      const before = currentVal.substring(0, start);
      const after = currentVal.substring(start);
      const newVal = before + '\n' + newPrefix + after;
      const rebuilt = rebuildLines(newVal);
      onChange(rebuilt);

      // Place cursor after the new prefix
      requestAnimationFrame(() => {
        const cursorPos = before.length + 1 + newPrefix.length;
        ta.selectionStart = ta.selectionEnd = cursorPos;
      });
    }

    // Prevent deleting the prefix at the start of a line via Backspace
    if (e.key === 'Backspace') {
      const ta = ref.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (start === end) {
        const currentVal = value || '';
        const linesBefore = currentVal.substring(0, start).split('\n');
        const currentLine = linesBefore[linesBefore.length - 1];
        const pfx = currentLine.match(/^(•\s*|\d+\.\s*)/);
        if (pfx && currentLine.length === pfx[0].length && linesBefore.length > 1) {
          // At the start of a prefix-only line — merge with previous line
          e.preventDefault();
          const prevLines = linesBefore.slice(0, -1);
          const after = currentVal.substring(start);
          const newVal = prevLines.join('\n') + after;
          const rebuilt = rebuildLines(newVal);
          onChange(rebuilt);
          requestAnimationFrame(() => {
            const pos = prevLines.join('\n').length;
            ta.selectionStart = ta.selectionEnd = pos;
          });
        }
      }
    }
  };

  const handleFocus = () => {
    if (!value || value.trim() === '') {
      onChange(prefix(0));
    }
  };

  return (
    <textarea
      ref={ref}
      value={value || ''}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      placeholder={placeholder}
      rows={rows}
      className={`w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm leading-relaxed ${className}`}
    />
  );
};

export default BulletTextarea;
