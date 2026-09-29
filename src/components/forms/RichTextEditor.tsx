"use client";
/**
 * Rich-text (WYSIWYG) editor built on TipTap.
 * Writes HTML into a hidden <input name={name}> so it works in normal forms.
 * The image button opens the Media Library popup.
 */
import { useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Code, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Minus, Quote, Redo, Strikethrough, Underline as UnderlineIcon, Undo,
} from "lucide-react";
import { MediaPickerModal } from "@/components/media/MediaLibrary";
import { cn } from "@/lib/utils";

function Btn({ onClick, active, label, children }: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={label} aria-label={label} className={cn("rounded p-1.5 hover:bg-navy-50", active && "bg-navy-100 text-navy-900")}>
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const c = () => editor.chain().focus();
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface p-1 text-navy-700 [&_svg]:size-4">
      <Btn label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 /></Btn>
      <Btn label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 /></Btn>
      <span className="mx-1 h-5 w-px bg-line" />
      <Btn label="Bold" active={editor.isActive("bold")} onClick={() => c().toggleBold().run()}><Bold /></Btn>
      <Btn label="Italic" active={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}><Italic /></Btn>
      <Btn label="Underline" active={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}><UnderlineIcon /></Btn>
      <Btn label="Strikethrough" active={editor.isActive("strike")} onClick={() => c().toggleStrike().run()}><Strikethrough /></Btn>
      <Btn label="Code" active={editor.isActive("code")} onClick={() => c().toggleCode().run()}><Code /></Btn>
      <span className="mx-1 h-5 w-px bg-line" />
      <Btn label="Bullet list" active={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}><List /></Btn>
      <Btn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}><ListOrdered /></Btn>
      <Btn label="Quote" active={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()}><Quote /></Btn>
      <Btn label="Divider" onClick={() => c().setHorizontalRule().run()}><Minus /></Btn>
      <span className="mx-1 h-5 w-px bg-line" />
      <Btn label="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => c().setTextAlign("left").run()}><AlignLeft /></Btn>
      <Btn label="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => c().setTextAlign("center").run()}><AlignCenter /></Btn>
      <Btn label="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => c().setTextAlign("right").run()}><AlignRight /></Btn>
      <span className="mx-1 h-5 w-px bg-line" />
      <Btn
        label="Link"
        active={editor.isActive("link")}
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("Link URL (leave empty to remove)", prev ?? "https://");
          if (url === null) return;
          if (!url) c().unsetLink().run();
          else c().extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
        <Link2 />
      </Btn>
      <Btn label="Insert image from media library" onClick={onImage}><ImagePlus /></Btn>
      <span className="ml-auto" />
      <Btn label="Undo" onClick={() => c().undo().run()}><Undo /></Btn>
      <Btn label="Redo" onClick={() => c().redo().run()}><Redo /></Btn>
    </div>
  );
}

export function RichTextEditor({ name, defaultValue = "", placeholder = "Start writing…", minHeight = 260 }: { name: string; defaultValue?: string; placeholder?: string; minHeight?: number }) {
  const [html, setHtml] = useState(defaultValue);
  const [pickImage, setPickImage] = useState(false);
  const editor = useEditor({
    immediatelyRender: false, // avoids hydration mismatch in Next.js
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false } }),
      ImageExt,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: defaultValue,
    editorProps: { attributes: { class: "prose-rd max-w-none px-4 py-3 outline-none", style: `min-height:${minHeight}px` } },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white focus-within:border-brand-500">
      <input type="hidden" name={name} value={html} />
      {editor ? <Toolbar editor={editor} onImage={() => setPickImage(true)} /> : <div className="h-9 border-b border-line bg-surface" />}
      <EditorContent editor={editor} />
      <MediaPickerModal
        open={pickImage}
        onClose={() => setPickImage(false)}
        onSelect={(items) => items.forEach((m) => editor?.chain().focus().setImage({ src: m.url, alt: m.alt ?? "" }).run())}
        multiple
      />
    </div>
  );
}
