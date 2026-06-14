"use client";

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  editorRef?: MutableRefObject<HTMLDivElement | null>;
};

/**
 * Light-weight rich-text editor op basis van contentEditable.
 * Geen externe libs (geen TipTap/Quill/Lexical). De editor werkt met
 * document.execCommand om bold/italic/underline/lijsten/link te zetten.
 * Hoewel execCommand officieel deprecated is, blijft het in alle moderne
 * browsers werken en is het de simpelste manier om zonder framework een
 * cursor-veilige rich-text-flow te krijgen.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  editorRef,
}: RichTextEditorProps) {
  const internalRef = useRef<HTMLDivElement | null>(null);

  function isVisueelLeeg(html: string): boolean {
    if (!html) return true;
    const zonderWhitespace = html.replace(/\s+/g, "");
    const zonderLegeDivs = zonderWhitespace
      .replace(/<div><br><\/div>/gi, "")
      .replace(/<div><\/div>/gi, "")
      .replace(/<br>/gi, "")
      .replace(/<p><\/p>/gi, "");
    return zonderLegeDivs.length === 0;
  }

  function bijwerkLegeFlag(el: HTMLDivElement) {
    el.dataset.empty = isVisueelLeeg(el.innerHTML) ? "ja" : "nee";
  }

  useEffect(() => {
    const el = internalRef.current;
    if (!el) return;
    const focusInDiv = document.activeElement === el;
    if (focusInDiv) {
      bijwerkLegeFlag(el);
      return;
    }
    if (el.innerHTML !== (value ?? "")) {
      el.innerHTML = value ?? "";
    }
    bijwerkLegeFlag(el);
  }, [value]);

  // editorRef koppelen aan ouderscope (zodat parent execCommand kan aanroepen
  // of insertHTML kan doen voor snippets).
  useEffect(() => {
    if (!editorRef) return;
    editorRef.current = internalRef.current;
  }, [editorRef]);

  function handleInput() {
    const el = internalRef.current;
    if (!el) return;
    bijwerkLegeFlag(el);
    onChange(el.innerHTML);
  }

  // Plak alleen platte tekst. Zo voorkomen we dat geplakte mail-clients of
  // Word-output hun eigen styling meebrengen en de huisstijl wegblazen.
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const tekst = e.clipboardData.getData("text/plain");
    if (!tekst) return;
    document.execCommand("insertText", false, tekst);
  }

  return (
    <div
      ref={internalRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onPaste={handlePaste}
      data-placeholder={placeholder ?? ""}
      className={[
        "rte-editor relative outline-none text-[14px] leading-relaxed text-gray-800",
        "min-h-[300px] px-4 py-3",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

type RichTextToolbarProps = {
  editorRef: MutableRefObject<HTMLDivElement | null>;
};

/**
 * Toolbar met B / I / U / Link / lijst-knoppen. Stuurt zijn commando's
 * naar de actieve contentEditable via document.execCommand. Belangrijk:
 * eerst editor focussen, zodat de selection in de juiste node ligt.
 */
export function RichTextToolbar({ editorRef }: RichTextToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkWaarde, setLinkWaarde] = useState("");

  function focusEditor() {
    const el = editorRef.current;
    if (el) el.focus();
  }

  function commando(naam: string, waarde?: string) {
    focusEditor();
    document.execCommand(naam, false, waarde);
    // Trigger onInput zodat parent state ook bijwerkt. execCommand vuurt
    // geen 'input'-event in alle browsers, dus we doen het handmatig.
    const el = editorRef.current;
    if (el) {
      const event = new Event("input", { bubbles: true });
      el.dispatchEvent(event);
    }
  }

  function linkInvoegen() {
    const href = linkWaarde.trim();
    if (!href) {
      setLinkOpen(false);
      return;
    }
    const veilig = /^https?:\/\//i.test(href) ? href : `https://${href}`;
    commando("createLink", veilig);
    setLinkWaarde("");
    setLinkOpen(false);
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <ToolbarKnop label="B" titel="Vet" sterk onClick={() => commando("bold")} />
      <ToolbarKnop label="I" titel="Cursief" cursief onClick={() => commando("italic")} />
      <ToolbarKnop label="U" titel="Onderstrepen" onderstreept onClick={() => commando("underline")} />
      <ToolbarKnop
        label="Link"
        titel="Link invoegen"
        onClick={() => setLinkOpen((o) => !o)}
      />
      <ToolbarKnop
        label="lijst"
        titel="Lijst met bolletjes"
        onClick={() => commando("insertUnorderedList")}
      />
      <ToolbarKnop
        label="1. lijst"
        titel="Genummerde lijst"
        onClick={() => commando("insertOrderedList")}
      />

      {linkOpen && (
        <div className="flex items-center gap-1 ml-1">
          <input
            type="text"
            value={linkWaarde}
            onChange={(e) => setLinkWaarde(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                linkInvoegen();
              }
              if (e.key === "Escape") {
                setLinkOpen(false);
                setLinkWaarde("");
              }
            }}
            placeholder="https://..."
            autoFocus
            className="px-2 py-1 border border-gray-300 rounded text-xs w-40"
          />
          <button
            type="button"
            onClick={linkInvoegen}
            className="text-xs text-white bg-[#333399] hover:bg-[#2a2a80] px-2 py-1 rounded"
          >
            Voeg toe
          </button>
        </div>
      )}
    </div>
  );
}

function ToolbarKnop({
  label,
  titel,
  onClick,
  sterk,
  cursief,
  onderstreept,
}: {
  label: string;
  titel: string;
  onClick: () => void;
  sterk?: boolean;
  cursief?: boolean;
  onderstreept?: boolean;
}) {
  return (
    <button
      type="button"
      title={titel}
      onMouseDown={(e) => {
        // mouseDown niet click: voorkomt dat de editor zijn selection
        // verliest voordat execCommand draait.
        e.preventDefault();
        onClick();
      }}
      className={[
        "text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100",
        "px-2 py-1 rounded transition border border-transparent",
        "min-w-[28px]",
        sterk ? "font-bold" : "",
        cursief ? "italic" : "",
        onderstreept ? "underline" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </button>
  );
}
