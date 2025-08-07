import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RichTextEditor from '../RichTextEditor';

// Mock document.execCommand
Object.defineProperty(document, 'execCommand', {
  value: jest.fn(),
  writable: true,
});

describe('RichTextEditor', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with default props', () => {
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByRole('toolbar', { name: 'Text formatting' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render with custom props', () => {
    render(
      <RichTextEditor
        value="<p>Initial content</p>"
        onChange={mockOnChange}
        placeholder="Custom placeholder"
        disabled={true}
        aria-label="Custom editor"
        aria-describedby="editor-help"
      />
    );

    const editor = screen.getByRole('textbox');
    expect(editor).toHaveAttribute('aria-label', 'Custom editor');
    expect(editor).toHaveAttribute('aria-describedby', 'editor-help');
    expect(editor).toHaveAttribute('data-placeholder', 'Custom placeholder');
    
    // All toolbar buttons should be disabled
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should display placeholder when empty', () => {
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
        placeholder="Enter content here"
      />
    );

    const editor = screen.getByRole('textbox');
    expect(editor).toHaveAttribute('data-placeholder', 'Enter content here');
  });

  it('should call onChange when content is modified', async () => {
    const user = userEvent.setup();
    
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const editor = screen.getByRole('textbox');
    
    // Simulate typing
    await user.click(editor);
    fireEvent.input(editor, {
      target: { innerHTML: '<p>New content</p>' }
    });

    expect(mockOnChange).toHaveBeenCalledWith('<p>New content</p>');
  });

  it('should execute bold command when bold button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const boldButton = screen.getByRole('button', { name: 'Bold' });
    await user.click(boldButton);

    expect(document.execCommand).toHaveBeenCalledWith('bold', false, undefined);
  });

  it('should execute italic command when italic button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const italicButton = screen.getByRole('button', { name: 'Italic' });
    await user.click(italicButton);

    expect(document.execCommand).toHaveBeenCalledWith('italic', false, undefined);
  });

  it('should execute underline command when underline button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const underlineButton = screen.getByRole('button', { name: 'Underline' });
    await user.click(underlineButton);

    expect(document.execCommand).toHaveBeenCalledWith('underline', false, undefined);
  });

  it('should execute heading commands when heading buttons are clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const h1Button = screen.getByRole('button', { name: 'Heading 1' });
    const h2Button = screen.getByRole('button', { name: 'Heading 2' });
    const h3Button = screen.getByRole('button', { name: 'Heading 3' });

    await user.click(h1Button);
    expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, 'h1');

    await user.click(h2Button);
    expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, 'h2');

    await user.click(h3Button);
    expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, 'h3');
  });

  it('should execute list commands when list buttons are clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const bulletListButton = screen.getByRole('button', { name: 'Bullet List' });
    const numberedListButton = screen.getByRole('button', { name: 'Numbered List' });

    await user.click(bulletListButton);
    expect(document.execCommand).toHaveBeenCalledWith('insertUnorderedList', false, undefined);

    await user.click(numberedListButton);
    expect(document.execCommand).toHaveBeenCalledWith('insertOrderedList', false, undefined);
  });

  it('should handle link insertion', async () => {
    const user = userEvent.setup();
    
    // Mock window.prompt
    const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue('https://example.com');
    
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const linkButton = screen.getByRole('button', { name: 'Insert Link' });
    await user.click(linkButton);

    expect(mockPrompt).toHaveBeenCalledWith('Enter URL:');
    expect(document.execCommand).toHaveBeenCalledWith('createLink', false, 'https://example.com');

    mockPrompt.mockRestore();
  });

  it('should not insert link when prompt is cancelled', async () => {
    const user = userEvent.setup();
    
    // Mock window.prompt to return null (cancelled)
    const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue(null);
    
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const linkButton = screen.getByRole('button', { name: 'Insert Link' });
    await user.click(linkButton);

    expect(mockPrompt).toHaveBeenCalledWith('Enter URL:');
    expect(document.execCommand).not.toHaveBeenCalledWith('createLink', expect.any(Boolean), expect.any(String));

    mockPrompt.mockRestore();
  });

  it('should handle keyboard shortcuts', async () => {
    const user = userEvent.setup();
    
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const editor = screen.getByRole('textbox');
    await user.click(editor);

    // Test Ctrl+B for bold
    await user.keyboard('{Control>}b{/Control}');
    expect(document.execCommand).toHaveBeenCalledWith('bold');

    // Test Ctrl+I for italic
    await user.keyboard('{Control>}i{/Control}');
    expect(document.execCommand).toHaveBeenCalledWith('italic');

    // Test Ctrl+U for underline
    await user.keyboard('{Control>}u{/Control}');
    expect(document.execCommand).toHaveBeenCalledWith('underline');
  });

  it('should handle Meta key shortcuts (Mac)', async () => {
    const user = userEvent.setup();
    
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const editor = screen.getByRole('textbox');
    await user.click(editor);

    // Test Meta+B for bold
    await user.keyboard('{Meta>}b{/Meta}');
    expect(document.execCommand).toHaveBeenCalledWith('bold');
  });

  it('should have proper accessibility attributes', () => {
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
        aria-label="Content editor"
        aria-describedby="editor-help"
      />
    );

    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveAttribute('aria-label', 'Text formatting');

    const editor = screen.getByRole('textbox');
    expect(editor).toHaveAttribute('aria-multiline', 'true');
    expect(editor).toHaveAttribute('aria-label', 'Content editor');
    expect(editor).toHaveAttribute('aria-describedby', 'editor-help');

    // Check that all buttons have proper labels
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
  });

  it('should initialize with provided value', async () => {
    const initialValue = '<p>Initial content</p>';
    
    render(
      <RichTextEditor
        value={initialValue}
        onChange={mockOnChange}
      />
    );

    await waitFor(() => {
      const editor = screen.getByRole('textbox');
      expect(editor.innerHTML).toBe(initialValue);
    });
  });
});