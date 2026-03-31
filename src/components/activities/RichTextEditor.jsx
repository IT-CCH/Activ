import React, { useRef, useCallback, useEffect } from 'react';
import Icon from '../AppIcon';

/**
 * Lightweight rich-text editor using contentEditable.
 * Supports bold, italic, underline, bullet list, numbered list.
 * Stores value as HTML string.
 */
const RichTextEditor = ({ value, onChange, placeholder, minHeight = '120px', className = '' }) => {
  const editorRef = useRef(null);
  const lastHtml = useRef(value || '');

  const syncValue = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      if (html !== lastHtml.current) {
        lastHtml.current = html;
        onChange(html);
      }
    }
  }, [onChange]);

  // Only update DOM when value changes externally (not from our own edits)
  useEffect(() => {
    if (editorRef.current && value !== lastHtml.current) {
      lastHtml.current = value || '';
      // Save and restore selection if possible
      const sel = window.getSelection();
      const hadFocus = document.activeElement === editorRef.current;
      editorRef.current.innerHTML = value || '';
      if (hadFocus) editorRef.current.focus();
    }
  }, [value]);

  const execCmd = (command, val = null) => {
    // Ensure focus before executing
    editorRef.current?.focus();

    // For list commands, ensure there's a selection context
    if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
      const sel = window.getSelection();
      if (!sel.rangeCount || !editorRef.current.contains(sel.anchorNode)) {
        // Place cursor at end if no valid selection
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    document.execCommand(command, false, val);
    syncValue();
  };

  const handleInput = () => {
    syncValue();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html) {
      // Extract just the text from list items, or convert to our own clean HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Check if pasted content has list items
      const listItems = tempDiv.querySelectorAll('li');
      if (listItems.length > 0) {
        // Rebuild as a clean unordered list
        const ul = document.createElement('ul');
        listItems.forEach(li => {
          const newLi = document.createElement('li');
          newLi.textContent = li.textContent.trim();
          if (newLi.textContent) ul.appendChild(newLi);
        });
        document.execCommand('insertHTML', false, ul.outerHTML);
        syncValue();
        return;
      }
    }

    // For plain text, check if it looks like a list (lines starting with -, •, *, numbers)
    if (text) {
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const looksLikeList = lines.length > 1 && lines.every(l => /^\s*[-•*\d.)\]]\s/.test(l));

      if (looksLikeList) {
        const ul = document.createElement('ul');
        lines.forEach(line => {
          const li = document.createElement('li');
          li.textContent = line.replace(/^\s*[-•*\d.)\]]\s*/, '').trim();
          if (li.textContent) ul.appendChild(li);
        });
        document.execCommand('insertHTML', false, ul.outerHTML);
      } else {
        document.execCommand('insertText', false, text);
      }
      syncValue();
    }
  };

  const isCommandActive = (command) => {
    try { return document.queryCommandState(command); } catch { return false; }
  };

  const ToolbarButton = ({ icon, command, title }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // prevent blur
        execCmd(command);
      }}
      className={`p-1.5 rounded transition-colors ${
        isCommandActive(command)
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      }`}
      title={title}
    >
      <Icon name={icon} size={16} />
    </button>
  );

  return (
    <div className={`border-2 border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        <ToolbarButton icon="Bold" command="bold" title="Bold (Ctrl+B)" />
        <ToolbarButton icon="Italic" command="italic" title="Italic (Ctrl+I)" />
        <ToolbarButton icon="Underline" command="underline" title="Underline (Ctrl+U)" />
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolbarButton icon="List" command="insertUnorderedList" title="Bullet List" />
        <ToolbarButton icon="ListOrdered" command="insertOrderedList" title="Numbered List" />
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        suppressContentEditableWarning
        className="px-3 py-2 text-sm leading-relaxed focus:outline-none overflow-y-auto"
        style={{ minHeight }}
        data-placeholder={placeholder}
      />

      <style>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] ul, [contenteditable] ol { padding-left: 1.5rem; margin: 0.25rem 0; }
        [contenteditable] li { margin: 0.125rem 0; }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
