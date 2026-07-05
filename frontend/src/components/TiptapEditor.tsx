import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Extension } from '@tiptap/core';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered, Quote,
  Link2, Image as ImageIcon, Undo, Redo,
  Highlighter, Minus, Code, Table as TableIcon, Palette
} from 'lucide-react';

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
});

export default function TiptapEditor({ value, onChange, placeholder }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline hover:text-blue-800 transition-colors' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full h-auto rounded-lg mx-auto shadow-sm my-4 border border-slate-100' },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        HTMLAttributes: { class: 'bg-yellow-200 text-slate-900 px-1 rounded' },
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'border-collapse table-auto w-full my-6 border border-slate-200 text-sm' },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: { class: 'border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-700' },
      }),
      TableCell.configure({
        HTMLAttributes: { class: 'border border-slate-200 p-2 text-slate-600' },
      }),
      FontSize,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-slate max-w-none focus:outline-none min-h-[400px] p-4 text-slate-700 font-sans leading-relaxed',
      },
    },
  });

  // Sync content from outside (e.g. AI suggestion or initial edit value)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          const base64 = readerEvent.target?.result as string;
          editor.chain().focus().setImage({ src: base64 }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Nhập URL liên kết:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
  const getActiveFontSize = () => {
    const attrs = editor.getAttributes('textStyle');
    return attrs.fontSize || '16px';
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-200">
      <div className="flex flex-wrap gap-1 p-2 bg-slate-50 border-b border-slate-200 sticky top-0 z-10 items-center">
        <style>{`
          .tiptap { max-width: 100%; word-break: normal; overflow-wrap: break-word; word-wrap: break-word; }
          .tiptap p { margin-bottom: 0.75rem; line-height: 1.625; color: #334155; }
          .tiptap h1 { font-size: 1.5rem; font-weight: 700; margin-top: 1.25rem; margin-bottom: 0.5rem; color: #1e293b; }
          .tiptap h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; color: #1e293b; }
          .tiptap h3 { font-size: 1.125rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.25rem; color: #1e293b; }
          .tiptap ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
          .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
          .tiptap blockquote { border-left: 4px solid #cbd5e1; padding-left: 1rem; font-style: italic; color: #475569; margin: 0.75rem 0; }
          .tiptap code { background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.875em; }
          .tiptap img { max-width: 100%; height: auto; display: block; margin: 1.5rem auto; border-radius: 8px; }
          
          /* Table styles */
          .tiptap table { border-collapse: collapse; margin: 1.5rem 0; width: 100%; overflow: hidden; }
          .tiptap th, .tiptap td { border: 1px solid #cbd5e1; padding: 0.5rem; text-align: left; }
          .tiptap th { background-color: #f1f5f9; font-weight: 600; }
          .tiptap mark { background-color: #fef08a; padding: 0.1rem 0.25rem; border-radius: 4px; color: #1e293b; }
          .tiptap hr { border: none; border-top: 2px solid #e2e8f0; margin: 1.5rem 0; }
          .tiptap pre { background-color: #0f172a; color: #f8fafc; padding: 1rem; border-radius: 8px; font-family: monospace; overflow-x: auto; margin: 1rem 0; }
        `}</style>

        {/* Font Size Select */}
        <select
          value={getActiveFontSize()}
          onChange={(e) => {
            const size = e.target.value;
            if (size === '16px') {
              editor.chain().focus().setMark('textStyle', { fontSize: null }).run();
            } else {
              editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
            }
          }}
          className="p-1 border border-slate-200 rounded text-xs text-slate-600 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer mr-1"
          title="Kích thước chữ"
        >
          {fontSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        {/* Text Color Picker */}
        <div className="flex items-center gap-1 border border-slate-200 rounded p-0.5 bg-white mr-1" title="Màu chữ">
          <Palette size={14} className="text-slate-400 ml-1" />
          <input
            type="color"
            value={editor.getAttributes('textStyle').color || '#334155'}
            onChange={(e) => {
              editor.chain().focus().setColor(e.target.value).run();
            }}
            className="w-5 h-5 p-0 border-0 cursor-pointer rounded"
          />
        </div>

        {/* Basic marks */}
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('bold') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="In đậm"><Bold size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('italic') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="In nghiêng"><Italic size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('underline') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="Gạch chân"><UnderlineIcon size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('strike') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="Gạch ngang"><Strikethrough size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('highlight') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="Tô sáng (Highlight)"><Highlighter size={16} /></button>
        
        <div className="w-px h-6 bg-slate-200 mx-1 self-center" />

        {/* Alignments */}
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="Căn lề trái"><AlignLeft size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="Căn lề giữa"><AlignCenter size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="Căn lề phải"><AlignRight size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="Căn đều"><AlignJustify size={16} /></button>

        <div className="w-px h-6 bg-slate-200 mx-1 self-center" />

        {/* Headings */}
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 text-indigo-600 font-bold' : 'text-slate-600'}`} title="Tiêu đề 1"><Heading1 size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 text-indigo-600 font-bold' : 'text-slate-600'}`} title="Tiêu đề 2"><Heading2 size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-slate-200 text-indigo-600 font-bold' : 'text-slate-600'}`} title="Tiêu đề 3"><Heading3 size={16} /></button>

        <div className="w-px h-6 bg-slate-200 mx-1 self-center" />

        {/* Lists & blockquote */}
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('bulletList') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="Danh sách không thứ tự"><List size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('orderedList') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="Danh sách có thứ tự"><ListOrdered size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('blockquote') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="Trích dẫn"><Quote size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('codeBlock') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="Khối mã nguồn"><Code size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="p-2 rounded hover:bg-slate-200 transition-colors text-slate-600" title="Đường kẻ ngang"><Minus size={16} /></button>

        <div className="w-px h-6 bg-slate-200 mx-1 self-center" />

        {/* Links & images & tables */}
        <button type="button" onClick={setLink} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('link') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="Chèn liên kết"><Link2 size={16} /></button>
        <button type="button" onClick={addImage} className="p-2 rounded hover:bg-slate-200 transition-colors text-slate-600" title="Chèn hình ảnh"><ImageIcon size={16} /></button>
        <button type="button" onClick={insertTable} className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('table') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`} title="Chèn bảng"><TableIcon size={16} /></button>

        <div className="w-px h-6 bg-slate-200 mx-1 self-center" />

        {/* Undo/Redo */}
        <button type="button" onClick={() => editor.chain().focus().undo().run()} className="p-2 rounded hover:bg-slate-200 transition-colors text-slate-600" title="Hoàn tác"><Undo size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className="p-2 rounded hover:bg-slate-200 transition-colors text-slate-600" title="Làm lại"><Redo size={16} /></button>
      </div>

      {/* Editor Content area */}
      <EditorContent editor={editor} className="overflow-y-auto max-h-[550px]" />
    </div>
  );
}

