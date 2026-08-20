'use client';
/**
 * RichEditor.tsx
 *
 * WHAT THIS FILE DOES:
 * A full WYSIWYG (What You See Is What You Get) text editor built on top of
 * TipTap (https://tiptap.dev). It gives authors a toolbar with bold, italic,
 * underline, headings, lists, blockquotes, horizontal rules, undo/redo, and a
 * live word count. The editor stores content as HTML and calls the parent's
 * onChange handler every time the text changes.
 *
 * Key features:
 *  - Ctrl/Cmd+S triggers the optional onSave callback (e.g. autosave).
 *  - If the parent passes new `value` HTML (e.g. after autosave or template
 *    injection), the editor syncs without triggering an onChange loop.
 *  - CharacterCount extension tracks word count in real time.
 *
 * HOW TO REUSE IN A FUTURE PROJECT:
 * 1. Install: npm install @tiptap/react @tiptap/starter-kit
 *             @tiptap/extension-underline @tiptap/extension-placeholder
 *             @tiptap/extension-character-count
 * 2. Wrap in next/dynamic with ssr:false (editors need the browser DOM).
 *    Example: const RichEditor = dynamic(() => import('./RichEditor'), { ssr: false });
 * 3. Control it like a controlled input:
 *    <RichEditor value={html} onChange={(html, wc) => { setHtml(html); setWords(wc); }} />
 *
 * Example usage:
 *   <RichEditor
 *     value={content}
 *     onChange={(html, wordCount) => setContent(html)}
 *     placeholder="Write your story…"
 *     onSave={handleAutosave}
 *   />
 */

import { useEditor, EditorContent } from '@tiptap/react';
import { Undo2, Redo2 } from 'lucide-react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect } from 'react';

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  // The current HTML content (controlled — parent owns the state)
  value: string;
  // Called every time the content changes; receives the new HTML + live word count
  onChange: (html: string, wordCount: number) => void;
  // Ghost text shown when the editor is empty
  placeholder?: string;
  // Optional callback invoked when the user presses Ctrl/Cmd+S inside the editor
  onSave?: () => void;
};

// ── ToolbarBtn ────────────────────────────────────────────────────────────────
// A small reusable button used in the editor toolbar.
// `active` makes it glow red when the current selection has that format applied.
function ToolbarBtn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`px-2 py-1 text-sm rounded transition ${active ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
      {children}
    </button>
  );
}

// ── RichEditor ────────────────────────────────────────────────────────────────
export default function RichEditor({ value, onChange, placeholder, onSave }: Props) {

  // useEditor — TipTap's main hook. Sets up the editor instance with all the
  // extensions we want and connects it to the DOM via EditorContent below.
  const editor = useEditor({
    // immediatelyRender: false prevents a hydration mismatch between the server
    // (which renders nothing for the editor) and the client (which renders the DOM).
    immediatelyRender: false,

    // Extensions are TipTap plugins that add functionality:
    extensions: [
      StarterKit,       // Bold, italic, headings, lists, blockquote, HR, undo/redo
      Underline,        // Underline formatting (not in StarterKit by default)
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing your story…' }),
      CharacterCount,   // Tracks word count in editor.storage.characterCount.words()
    ],

    // Initial HTML content loaded into the editor
    content: value,

    // onUpdate fires every time the user types, deletes, or formats text.
    // We extract the current HTML and word count and bubble them to the parent.
    onUpdate({ editor }) {
      const html = editor.getHTML();
      const words = editor.storage.characterCount.words();
      onChange(html, words);
    },

    editorProps: {
      // Apply Tailwind prose classes to the editable area so the content
      // looks styled while the user is typing (not just when rendered)
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[400px] focus:outline-none text-gray-200 text-sm leading-relaxed',
      },

      // handleKeyDown intercepts key events before the browser handles them.
      // Returning `true` means "I handled this — don't do the default action".
      handleKeyDown(_view, event) {
        // isMod: true when Ctrl (Windows/Linux) or Cmd (Mac) is held
        const isMod = event.ctrlKey || event.metaKey;

        // Ctrl/Cmd+S — save shortcut; prevents the browser's "Save Page As" dialog
        if (isMod && event.key === 's') {
          event.preventDefault();
          onSave?.(); // the ?. means "call only if onSave was provided"
          return true;
        }

        // Ctrl/Cmd+U — toggle underline (TipTap StarterKit doesn't bind this by default)
        if (isMod && event.key === 'u') {
          event.preventDefault();
          // editor reference via closure isn't available here, handled in useEffect below
          return false;
        }

        return false;
      },
    },
  });

  // ── Sync external value changes ──────────────────────────────────────────────
  // If the parent changes `value` from outside (e.g. a template was selected or
  // an autosave response came back), we update the editor content without
  // triggering the onUpdate callback (`emitUpdate: false`).
  // We guard with `value !== editor.getHTML()` to avoid an infinite update loop.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  // If the editor hasn't initialised yet (first render), render nothing.
  // This prevents a flash of unstyled content on page load.
  if (!editor) return null;

  // Read the current word count from the CharacterCount extension's storage
  const wordCount = editor.storage.characterCount.words();

  return (
    // The outer div gets a red border when the editor is focused (focus-within)
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden focus-within:border-red-600 transition">

      {/* ── Toolbar ── */}
      {/* flex-wrap lets the toolbar wrap to a second line on narrow screens */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-gray-700 bg-gray-850">

        {/* Text formatting buttons — editor.chain().focus() keeps the cursor
            in the editor while applying the command */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <em>I</em>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
          <span className="underline">U</span>
        </ToolbarBtn>

        {/* Thin vertical divider — purely decorative */}
        <span className="w-px h-5 bg-gray-700 mx-1" />

        {/* Heading buttons — toggleHeading wraps the current block in <h2> / <h3> */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">H2</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">H3</ToolbarBtn>

        <span className="w-px h-5 bg-gray-700 mx-1" />

        {/* List buttons */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">• List</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">1. List</ToolbarBtn>

        <span className="w-px h-5 bg-gray-700 mx-1" />

        {/* Block elements */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">&ldquo; Quote</ToolbarBtn>
        {/* setHorizontalRule inserts a <hr> at the cursor position */}
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">— HR</ToolbarBtn>

        <span className="w-px h-5 bg-gray-700 mx-1" />

        {/* History buttons */}
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo2 className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo2 className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
        </ToolbarBtn>

        {/* Live word count — pushed to the right with ml-auto */}
        <span className="ml-auto text-xs text-gray-500">{wordCount} words</span>
      </div>

      {/* ── Editor content area ── */}
      {/* EditorContent renders the actual ProseMirror contenteditable div */}
      <div className="px-4 py-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
