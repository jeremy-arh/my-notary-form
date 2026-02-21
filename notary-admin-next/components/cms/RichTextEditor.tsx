"use client";

import { useRef, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({ value, onChange, minHeight = "200px" }: RichTextEditorProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const [htmlSource, setHtmlSource] = useState(value);
  const lastValueRef = useRef(value);

  useEffect(() => {
    setHtmlSource(value);
    lastValueRef.current = value;
  }, [value]);

  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    if (value !== el.innerHTML) {
      el.innerHTML = value || "";
      lastValueRef.current = value || "";
    }
  }, [value]);

  const syncFromEditable = () => {
    if (editableRef.current) {
      const html = editableRef.current.innerHTML;
      setHtmlSource(html);
      onChange(html);
    }
  };

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editableRef.current?.focus();
    syncFromEditable();
  };

  const handleEditableInput = () => {
    if (editableRef.current) {
      const html = editableRef.current.innerHTML;
      setHtmlSource(html);
      lastValueRef.current = html;
      onChange(html);
    }
  };

  const handleHtmlChange = (newHtml: string) => {
    setHtmlSource(newHtml);
    lastValueRef.current = newHtml;
    onChange(newHtml);
    if (editableRef.current) {
      editableRef.current.innerHTML = newHtml;
    }
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(htmlSource);
    toast.success("HTML copié dans le presse-papier");
  };

  const proseStyles = "text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-primary [&_a]:underline";

  return (
    <div className="rounded-lg border bg-background">
      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 h-11 px-0">
          <TabsTrigger value="edit" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4">
            <Icon icon="lucide:edit-3" className="mr-2 h-4 w-4" />
            Rédaction
          </TabsTrigger>
          <TabsTrigger value="preview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4">
            <Icon icon="lucide:eye" className="mr-2 h-4 w-4" />
            Aperçu
          </TabsTrigger>
          <TabsTrigger value="html" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4">
            <Icon icon="lucide:code" className="mr-2 h-4 w-4" />
            HTML
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="m-0" forceMount>
          <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/20">
            <Button type="button" variant="ghost" size="sm" onClick={() => execCmd("bold")}>
              <Icon icon="lucide:bold" className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => execCmd("italic")}>
              <Icon icon="lucide:italic" className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => execCmd("strikeThrough")}>
              <Icon icon="lucide:strikethrough" className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => execCmd("formatBlock", "h1")}>
              H1
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => execCmd("formatBlock", "h2")}>
              H2
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => execCmd("insertUnorderedList")}>
              <Icon icon="lucide:list" className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => execCmd("insertOrderedList")}>
              <Icon icon="lucide:list-ordered" className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => execCmd("formatBlock", "blockquote")}>
              <Icon icon="lucide:quote" className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const url = window.prompt("URL de l'image:");
                if (url) execCmd("insertImage", url);
              }}
            >
              <Icon icon="lucide:image" className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const url = window.prompt("URL du lien:");
                if (url) execCmd("createLink", url);
              }}
            >
              <Icon icon="lucide:link" className="h-4 w-4" />
            </Button>
          </div>
          <div
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditableInput}
            onBlur={syncFromEditable}
            className={`${proseStyles} min-h-[120px] px-3 py-2 outline-none focus:ring-0`}
            style={{ minHeight }}
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div
            className={`p-4 overflow-auto ${proseStyles}`}
            style={{ minHeight }}
            dangerouslySetInnerHTML={{
              __html: htmlSource || "<p class='text-muted-foreground'>Aucun contenu à prévisualiser</p>",
            }}
          />
        </TabsContent>

        <TabsContent value="html" className="m-0">
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 z-10"
              onClick={handleCopyHtml}
            >
              <Icon icon="lucide:copy" className="mr-1 h-3.5 w-3.5" />
              Copier HTML
            </Button>
            <textarea
              className="w-full rounded-none border-0 bg-muted/20 p-4 font-mono text-sm min-h-[200px] focus-visible:ring-0 focus-visible:ring-offset-0"
              value={htmlSource}
              onChange={(e) => handleHtmlChange(e.target.value)}
              placeholder="<p>Contenu HTML...</p>"
              spellCheck={false}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
