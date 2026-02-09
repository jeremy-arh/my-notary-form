import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';

/**
 * Rich text editor component for messages
 * Falls back to simple textarea if TipTap dependencies are not available
 * @param {string} value - Current content (HTML or plain text)
 * @param {function} onChange - Callback when content changes
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Whether editor is disabled
 */
const MessageEditor = ({ value, onChange, placeholder = 'Type your message...', disabled = false }) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [useTiptap, setUseTiptap] = useState(false);
  const [editor, setEditor] = useState(null);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  // Try to load tiptap editor
  useEffect(() => {
    let mounted = true;
    
    const loadTiptap = async () => {
      try {
        const [reactModule, starterKitModule, linkModule] = await Promise.all([
          import(/* @vite-ignore */ '@tiptap/react'),
          import(/* @vite-ignore */ '@tiptap/starter-kit'),
          import(/* @vite-ignore */ '@tiptap/extension-link')
        ]);
        
        if (mounted && reactModule && starterKitModule && linkModule) {
          const { useEditor, EditorContent } = reactModule;
          const StarterKit = starterKitModule.default;
          const Link = linkModule.default;
          
          const tiptapEditor = useEditor({
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
          
          if (mounted && tiptapEditor) {
            setEditor({ editor: tiptapEditor, EditorContent });
            setUseTiptap(true);
          }
        }
      } catch (error) {
        console.warn('TipTap not available, using fallback textarea:', error);
        if (mounted) {
          setUseTiptap(false);
        }
      }
    };
    
    loadTiptap();
    
    return () => {
      mounted = false;
      if (editor?.editor) {
        editor.editor.destroy();
      }
    };
  }, []);

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor?.editor && value !== editor.editor.getHTML()) {
      editor.editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  // Handle disabled state
  useEffect(() => {
    if (editor?.editor) {
      editor.editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  // Fallback to simple textarea if tiptap is not available
  if (!useTiptap || !editor) {
    return (
      <div className="flex flex-col w-full">
        <div className="bg-white border-2 border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-black focus-within:border-black transition-all">
          <textarea
            value={localValue}
            onChange={(e) => {
              setLocalValue(e.target.value);
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-3 py-2 min-h-[44px] max-h-[150px] overflow-y-auto resize-none focus:outline-none text-sm"
            rows={3}
          />
        </div>
      </div>
    );
  }

  const { editor: tiptapEditor, EditorContent } = editor;

  return (
    <div className="flex flex-col w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1 bg-gray-50 border-b border-gray-200 rounded-t-xl flex-wrap">
        <button
          type="button"
          onClick={() => tiptapEditor.chain().focus().toggleBold().run()}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
            tiptapEditor.isActive('bold') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Gras"
        >
          <Icon icon="heroicons:bold" className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => tiptapEditor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
            tiptapEditor.isActive('italic') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Italique"
        >
          <Icon icon="heroicons:italic" className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => tiptapEditor.chain().focus().toggleStrike().run()}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
            tiptapEditor.isActive('strike') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Barré"
        >
          <Icon icon="heroicons:strikethrough" className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => tiptapEditor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
            tiptapEditor.isActive('bulletList') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Liste à puces"
        >
          <Icon icon="heroicons:list-bullet" className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => tiptapEditor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
            tiptapEditor.isActive('orderedList') ? 'bg-gray-300' : ''
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
              tiptapEditor.chain().focus().setLink({ href: url }).run();
            }
          }}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
            tiptapEditor.isActive('link') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Ajouter un lien"
        >
          <Icon icon="heroicons:link" className="w-4 h-4" />
        </button>
        {tiptapEditor.isActive('link') && (
          <button
            type="button"
            onClick={() => tiptapEditor.chain().focus().unsetLink().run()}
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
        <EditorContent editor={tiptapEditor} />
      </div>
    </div>
  );
};

export default MessageEditor;
