import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Icon } from '@iconify/react';
import { useEffect } from 'react';

/**
 * Rich text editor component for messages
 * @param {string} value - Current content (HTML)
 * @param {function} onChange - Callback when content changes
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Whether editor is disabled
 */
const MessageEditor = ({ value, onChange, placeholder = 'Type your message...', disabled = false }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2 min-h-[44px] max-h-[150px] overflow-y-auto',
        'data-placeholder': placeholder,
      },
    },
  });

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  // Handle disabled state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1 bg-gray-50 border-b border-gray-200 rounded-t-xl flex-wrap">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bold') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Gras"
        >
          <Icon icon="heroicons:bold" className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('italic') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Italique"
        >
          <Icon icon="heroicons:italic" className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('strike') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Barré"
        >
          <Icon icon="heroicons:strikethrough" className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bulletList') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Liste à puces"
        >
          <Icon icon="heroicons:list-bullet" className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('orderedList') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Liste numérotée"
        >
          <Icon icon="heroicons:list-ordered" className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('link') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Ajouter un lien"
        >
          <Icon icon="heroicons:link" className="w-4 h-4" />
        </button>
        {editor.isActive('link') && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            disabled={disabled}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Retirer le lien"
          >
            <Icon icon="heroicons:link-slash" className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="bg-white border-2 border-gray-200 rounded-b-xl focus-within:ring-2 focus-within:ring-black focus-within:border-black transition-all relative">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default MessageEditor;
