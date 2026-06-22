import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const AI_MODEL = "claude-sonnet-4-5";

function leesJson<T>(tekst: string): T {
  const schoon = tekst.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(schoon) as T;
}

export type TalentKandidaatIn = {
  id: string;
  naam: string;
  plaats: string;
  profiel: string;
};

// Beoordeelt hoe goed talentpool-kandidaten passen bij één vacature. Geeft per
// kandidaat-id een matchscore (0-100) + korte reden terug. Lukt de AI niet, dan
// een lege map (de pagina toont de kandidaten dan ongesorteerd).
export async function matchTalentpool(
  vacature: { titel: string; taken?: string | null; eisen?: string | null; plaats?: string | null },
  kandidaten: TalentKandidaatIn[],
): Promise<Map<string, { score: number; reden: string }>> {
  const out = new Map<string, { score: number; reden: string }>();
  if (kandidaten.length === 0) return out;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return out;

  const lijst = kandidaten.slice(0, 60).map((k, i) => ({
    i,
    naam: k.naam,
    plaats: k.plaats,
    profiel: (k.profiel ?? "").slice(0, 800),
  }));

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 3000,
      system:
        "Je bent een ervaren recruiter. Je beoordeelt hoe goed kandidaten uit de talentenpool passen bij een vacature. " +
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
    for (const s of data.scores ?? []) {
      const k = typeof s.i === "number" ? kandidaten[s.i] : undefined;
      if (k) out.set(k.id, { score: Number(s.score) || 0, reden: (s.reden ?? "").toString() });
    }
  } catch {
    // AI niet beschikbaar; lege map -> pagina toont kandidaten ongesorteerd
  }
  return out;
}
