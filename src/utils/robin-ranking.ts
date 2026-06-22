import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { RobinKandidaat } from "@/utils/robin-bellijst";

const AI_MODEL = "claude-sonnet-4-5";

function leesJson<T>(tekst: string): T {
  const schoon = tekst.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(schoon) as T;
}

// Rangschikt de door Robin gevonden kandidaten t.o.v. de vacature: de AI geeft
// elk een matchscore (0-100) + korte reden. Beste bovenaan. Lukt de AI niet,
// dan wordt de oorspronkelijke volgorde behouden.
export async function rangschikKandidaten(
  vacature: { titel: string; taken?: string | null; eisen?: string | null; plaats?: string | null },
  kandidaten: RobinKandidaat[],
): Promise<RobinKandidaat[]> {
  if (kandidaten.length === 0) return kandidaten;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return kandidaten.map((k) => ({ ...k, match_reden: "AI-sleutel ontbreekt" }));

  const lijst = kandidaten.slice(0, 60).map((k, i) => ({
    i,
    naam: k.naam ?? "",
    plaats: k.plaats ?? "",
    profiel: (k.profiel_tekst ?? "").slice(0, 800),
  }));

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 3000,
      system:
        "Je bent een ervaren recruiter. Je beoordeelt hoe goed kandidaten passen bij een vacature. " +
        "Let op functie-aansluiting, relevante ervaring/vaardigheden en (indien bekend) reisafstand. " +
        "Geef per kandidaat een matchscore 0-100 en een korte reden (max 12 woorden). " +
        "Antwoord UITSLUITEND met JSON.",
      messages: [
        {
          role: "user",
          content:
            `VACATURE:\nFunctie: ${vacature.titel}\nPlaats: ${vacature.plaats ?? ""}\n` +
            `Taken: ${(vacature.taken ?? "").slice(0, 1200)}\nEisen: ${(vacature.eisen ?? "").slice(0, 800)}\n\n` +
            `KANDIDATEN (JSON):\n${JSON.stringify(lijst)}\n\n` +
            'Lever JSON: { "scores": [ { "i": number, "score": number (0-100), "reden": string } ] } ' +
            "voor ELKE kandidaat (gebruik exact de meegegeven index i).",
        },
      ],
    });
    const tekst = res.content.find((b) => b.type === "text")?.text ?? "{}";
    const data = leesJson<{ scores?: { i: number; score: number; reden: string }[] }>(tekst);
    const perIndex = new Map<number, { score: number; reden: string }>();
    for (const s of data.scores ?? []) {
      if (typeof s.i === "number") perIndex.set(s.i, { score: Number(s.score) || 0, reden: (s.reden ?? "").toString() });
    }

    const verrijkt = kandidaten.map((k, i) => {
      const m = perIndex.get(i);
      return { ...k, match_score: m ? m.score : 0, match_reden: m ? m.reden : "" };
    });
    verrijkt.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
    return verrijkt;
  } catch (e) {
    const msg = (e as Error).message?.slice(0, 120) || "onbekend";
    return kandidaten.map((k) => ({ ...k, match_reden: "ranking-fout: " + msg }));
  }
}
