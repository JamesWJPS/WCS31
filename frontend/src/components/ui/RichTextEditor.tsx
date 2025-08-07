import React, { useRef, useEffect, useState } from 'react';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter content...',
  disabled = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = value;
      setIsInitialized(true);
    }
  }, [value, isInitialized]);

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold');
          handleInput();
          break;
        case 'i':
          e.preventDefault();
          document.execCommand('italic');
          handleInput();
          break;
        case 'u':
          e.preventDefault();
          document.execCommand('underline');
          handleInput();
          break;
      }
    }
  };

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertHeading = (level: number) => {
    executeCommand('formatBlock', `h${level}`);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  return (
    <div className="rich-text-editor">
      <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          className="toolbar-button"
          title="Bold (Ctrl+B)"
          aria-label="Bold"
          disabled={disabled}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          className="toolbar-button"
          title="Italic (Ctrl+I)"
          aria-label="Italic"
          disabled={disabled}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => executeCommand('underline')}
          className="toolbar-button"
          title="Underline (Ctrl+U)"
          aria-label="Underline"
          disabled={disabled}
        >
          <u>U</u>
        </button>
        
        <div className="toolbar-separator" />
        
        <button
          type="button"
          onClick={() => insertHeading(1)}
          className="toolbar-button"
          title="Heading 1"
          aria-label="Heading 1"
          disabled={disabled}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => insertHeading(2)}
          className="toolbar-button"
          title="Heading 2"
          aria-label="Heading 2"
          disabled={disabled}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => insertHeading(3)}
          className="toolbar-button"
          title="Heading 3"
          aria-label="Heading 3"
          disabled={disabled}
        >
          H3
        </button>
        
        <div className="toolbar-separator" />
        
        <button
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          className="toolbar-button"
          title="Bullet List"
          aria-label="Bullet List"
          disabled={disabled}
        >
          •
        </button>
        <button
          type="button"
          onClick={() => executeCommand('insertOrderedList')}
          className="toolbar-button"
          title="Numbered List"
          aria-label="Numbered List"
          disabled={disabled}
        >
          1.
        </button>
        
        <div className="toolbar-separator" />
        
        <button
          type="button"
          onClick={insertLink}
          className="toolbar-button"
          title="Insert Link"
          aria-label="Insert Link"
          disabled={disabled}
        >
          🔗
        </button>
      </div>
      
      <div
        ref={editorRef}
        className="editor-content"
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        suppressContentEditableWarning={true}
      />
    </div>
  );
};

export default RichTextEditor;