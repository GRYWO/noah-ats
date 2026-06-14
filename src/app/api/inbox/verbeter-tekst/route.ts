import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { verbeterMailtekst } from "@/utils/ai";
import {
  splitsHoofdEnHandtekening,
  combineerHoofdEnHandtekening,
  stripHtmlNaarTekst,
} from "@/utils/handtekening-html";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Verbeter de mail-body met Claude. Accepteert zowel:
 *  - tekst_html: HTML uit de WYSIWYG-editor (handtekening blijft intact);
 *  - tekst: plain text (legacy / backward-compat).
 *
 * Bij tekst_html splitsen we de handtekening eraf, sturen alleen de
 * hoofdtekst (gestript naar plain) naar de AI, en plakken de handtekening
 * weer onder het verbeterde resultaat.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: {
    tekst_html?: string;
    tekst?: string;
    onderwerp?: string;
    naar?: string;
    toon?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Bepaal werkmodus: HTML (nieuwe editor) of plain (legacy).
  const isHtmlModus = typeof body.tekst_html === "string" && body.tekst_html.length > 0;

  let aiInput = "";
  let handtekeningHtml = "";

  if (isHtmlModus) {
    const split = splitsHoofdEnHandtekening(body.tekst_html ?? "");
    handtekeningHtml = split.handtekening;
    aiInput = stripHtmlNaarTekst(split.hoofd).trim();
  } else {
    aiInput = (body.tekst ?? "").trim();
  }

  if (!aiInput || aiInput.length < 5) {
    return NextResponse.json(
      { error: "Schrijf eerst minstens 5 tekens zodat de AI iets kan verbeteren" },
      { status: 400 },
    );
  }

  const toon =
    body.toon === "vriendelijk" || body.toon === "kort"
      ? body.toon
      : "professioneel";

  try {
    const verbeterd = await verbeterMailtekst({
      tekst: aiInput,
      onderwerp: body.onderwerp ?? null,
      naar: body.naar ?? null,
      toon,
    });

    if (isHtmlModus) {
      // Plain text terug naar HTML: paragrafen per dubbele newline,
      // <br> voor enkele newline. Geen markdown — we leveren rauwe
      // alinea's aan zodat de editor zijn eigen styling kan toepassen.
      const verbeterdHtml = plainNaarHtml(verbeterd);
      const heelHtml = combineerHoofdEnHandtekening(verbeterdHtml, handtekeningHtml);
      return NextResponse.json({
        ok: true,
        tekst_html: heelHtml,
        tekst: verbeterd,
      });
    }

    // Legacy plain-mode antwoord — geen tekst_html.
    return NextResponse.json({ ok: true, tekst: verbeterd });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

/**
 * Heel simpele plain-to-html: HTML-escape, dubbele newline = nieuwe <div>,
 * enkele newline = <br>. Geen externe afhankelijkheden.
 */
function plainNaarHtml(tekst: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const paragrafen = tekst
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragrafen.length === 0) return "";

  return paragrafen
    .map((p) => `<div>${escape(p).replace(/\n/g, "<br>")}</div>`)
    .join("<div><br></div>");
}
