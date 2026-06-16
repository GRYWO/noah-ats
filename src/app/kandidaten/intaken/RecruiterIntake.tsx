"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Recruiter-intake voor noah-ats. Identieke flow als de publieke
// /werk-intake op noah-recruitment.nl, maar geport naar noah-ats huisstijl
// en achter een proxy. De recruiter doorloopt deze samen met de kandidaat
// aan de telefoon. De kandidaat landt na finish in BOTH rec_kandidaten
// (noah-recruitment) en de noah-ats kandidaten-tabel via de bestaande
// mirror in /api/intake/finish op noah-recruitment.

type Bericht = { role: "user" | "assistant"; content: string };
type Screening = {
  score?: number;
  functie_indicatie?: string;
  ervaring_jaren?: string;
  leeftijd?: number | null;
  werkervaring?: string;
  opleidingen?: string;
  rijbewijzen?: string;
  talen?: string;
  vaardigheden?: string[];
  veel_wisselingen?: boolean;
  gat_van_6mnd?: boolean;
  cv_aandachtspunten?: string;
} | null;
type CvData = {
  pad: string;
  bestandsnaam: string;
  screening: Screening;
} | null;
type Match = {
  id: string;
  titel: string;
  sector: string | null;
  locatie: string | null;
  samenvatting: string | null;
  afstand: number | null;
  score: number;
  reden: string;
};
type Voorstel = {
  naam?: string | null;
  woonplaats?: string | null;
  profielschets?: string | null;
  werkervaring?: string | null;
  opleidingen?: string | null;
  rijbewijzen?: string | null;
  vervoer?: string | null;
  talen?: string | null;
  vaardigheden?: string | null;
};
type Resultaat = {
  status: "match" | "review";
  voorstel: Voorstel;
  matches: Match[];
  volgToken: string | null;
  maxKm?: number | null;
} | null;

function bouwCvContext(s: Screening): string {
  if (!s) return "";
  return [
    s.functie_indicatie && `Functie-indicatie: ${s.functie_indicatie}`,
    s.leeftijd != null && `Leeftijd (uit CV): ${s.leeftijd}`,
    s.ervaring_jaren && `Jaren ervaring: ${s.ervaring_jaren}`,
    s.werkervaring && `Werkervaring: ${s.werkervaring}`,
    s.opleidingen && `Opleidingen: ${s.opleidingen}`,
    s.talen && `Talen: ${s.talen}`,
    s.rijbewijzen && `Rijbewijzen: ${s.rijbewijzen}`,
    s.vaardigheden?.length && `Vaardigheden: ${s.vaardigheden.join(", ")}`,
    s.veel_wisselingen &&
      "Let op: meer dan 3 banen binnen één jaar, vraag om uitleg.",
    s.gat_van_6mnd && "Let op: een gat van 6 maanden of meer, vraag om uitleg.",
    s.cv_aandachtspunten &&
      s.cv_aandachtspunten.toLowerCase() !== "geen" &&
      `Aandachtspunten CV: ${s.cv_aandachtspunten}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// Bot-stopgaranties. MAX_BEURTEN ligt 1 hoger dan de server-cap (24
// berichten = 12 user + 12 assistant) zodat de server-side forced-finish
// met extraheerEssentiesUitChat eerst raakt en alleen als laatste vangnet
// de client zelf afsluit.
const MAX_BEURTEN = 13;
const INACTIVITEIT_MS = 5 * 60 * 1000;

// De 5 essenties die ALTIJD binnen moeten zijn voordat de intake mag
// afsluiten.
const ESSENTIES = [
  "naam",
  "email",
  "telefoon",
  "woonplaats",
  "gewenste_functies",
] as const;

function telEssenties(p: Record<string, string> | null): number {
  if (!p) return 0;
  return ESSENTIES.filter((k) => (p[k] || "").trim().length > 0).length;
}

function heeftAlleEssenties(p: Record<string, string> | null): boolean {
  return telEssenties(p) === ESSENTIES.length;
}

function leegProfiel(): Record<string, string> {
  return {
    naam: "",
    email: "",
    telefoon: "",
    woonplaats: "",
    leeftijd: "",
    max_km: "",
    gewenste_functies: "",
    uren_per_week: "",
    werkvergunning: "",
    taal_ok: "",
    rijbewijs: "",
    eigen_vervoer: "",
    beschikbaarheid: "",
    cv_verklaring_ok: "",
    opmerking: "",
  };
}

function naarLijst(tekst?: string | null): string[] {
  if (!tekst) return [];
  const ruw = tekst.includes("\n") ? tekst.split("\n") : tekst.split(/[;•]/);
  return ruw.map((r) => r.replace(/^[-•\s]+/, "").trim()).filter(Boolean);
}

function naarChips(tekst?: string | null): string[] {
  if (!tekst) return [];
  const ruw = tekst.includes("\n") ? tekst.split("\n") : tekst.split(/[;,]/);
  return ruw.map((r) => r.replace(/^[-•\s]+/, "").trim()).filter(Boolean);
}

export function RecruiterIntake() {
  const [fase, setFase] = useState<"cv" | "chat" | "klaar">("cv");
  const [cv, setCv] = useState<CvData>(null);
  const [cvBezig, setCvBezig] = useState(false);
  const [messages, setMessages] = useState<Bericht[]>([]);
  const [input, setInput] = useState("");
  const [bezig, setBezig] = useState(false);
  const [profiel, setProfiel] = useState<Record<string, string> | null>(null);
  const [partieelProfiel, setPartieelProfiel] = useState<Record<
    string,
    string
  > | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [res, setRes] = useState<Resultaat>(null);
  const [aantalBeurten, setAantalBeurten] = useState(0);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [uploadFout, setUploadFout] = useState<string | null>(null);
  const gestart = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const kandidaatIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open de chat met de eerste vraag zodra het CV binnen is.
  useEffect(() => {
    if (fase !== "chat" || gestart.current) return;
    gestart.current = true;
    (async () => {
      setBezig(true);
      try {
        const r = await fetch("/api/kandidaten/intaken/proxy/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [],
            cvContext: bouwCvContext(cv?.screening ?? null),
          }),
        });
        const s = await r.json();
        setMessages([
          {
            role: "assistant",
            content: s.bericht || "Welkom, laten we beginnen met de intake.",
          },
        ]);
      } catch {
        setMessages([
          {
            role: "assistant",
            content:
              "Er ging iets mis bij het starten. Probeer het zo opnieuw.",
          },
        ]);
      } finally {
        setBezig(false);
      }
    })();
  }, [fase, cv]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, bezig]);

  // Inactiviteits-timeout: 5 minuten geen nieuw bericht, dan automatisch
  // afronden met wat we hebben.
  useEffect(() => {
    if (fase !== "chat" || profiel || finishing) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!profiel) setProfiel({ ...leegProfiel(), ...(partieelProfiel || {}) });
    }, INACTIVITEIT_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fase, messages, input, profiel, finishing, partieelProfiel]);

  // Intake klaar, dus afronden (beoordeling, profiel, matching). Bij
  // fouten tonen we een vriendelijke melding en proberen we altijd de
  // minimale info te bewaren.
  useEffect(() => {
    if (profiel && !res && !finishing) {
      (async () => {
        setFinishing(true);
        try {
          const r = await fetch("/api/kandidaten/intaken/proxy/finish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profiel,
              cvPad: cv?.pad,
              screening: cv?.screening,
            }),
          });
          if (!r.ok) throw new Error("finish gaf " + r.status);
          const d = await r.json();
          kandidaatIdRef.current = d.kandidaatId ?? null;
          setRes({
            status: d.status ?? "review",
            voorstel: d.voorstel ?? {},
            matches: d.matches ?? [],
            volgToken: d.volgToken ?? null,
            maxKm: d.maxKm,
          });
          setFase("klaar");
        } catch {
          setFoutmelding(
            "We hebben de gegevens en het CV ontvangen, maar de match-stap is niet voltooid. De kandidaat staat in de wachtrij voor handmatige beoordeling.",
          );
          setRes({
            status: "review",
            voorstel: {
              naam: profiel.naam || "",
              woonplaats: profiel.woonplaats || "",
              profielschets: "",
              werkervaring: "",
              opleidingen: "",
              rijbewijzen: "",
              vervoer: "",
              talen: "",
              vaardigheden: "",
            },
            matches: [],
            volgToken: null,
          });
          setFase("klaar");
        } finally {
          setFinishing(false);
        }
      })();
    }
  }, [profiel, res, finishing, cv]);

  async function uploadCv(file: File) {
    setUploadFout(null);
    setCvBezig(true);
    try {
      const fd = new FormData();
      fd.append("cv", file);
      const r = await fetch("/api/kandidaten/intaken/proxy/cv", {
        method: "POST",
        body: fd,
      });
      const d = await r.json();
      if (d.pad) {
        setCv({
          pad: d.pad,
          bestandsnaam: d.bestandsnaam,
          screening: d.screening,
        });
        setFase("chat");
      } else {
        setUploadFout(d.fout || "Upload mislukt.");
      }
    } catch {
      setUploadFout("Verbinding mislukt. Probeer het opnieuw.");
    } finally {
      setCvBezig(false);
    }
  }

  async function verstuur() {
    const tekst = input.trim();
    if (!tekst || bezig || profiel) return;
    const nieuw: Bericht[] = [
      ...messages,
      { role: "user", content: tekst },
    ];
    setMessages(nieuw);
    setInput("");
    setBezig(true);
    try {
      const r = await fetch("/api/kandidaten/intaken/proxy/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nieuw,
          cvContext: bouwCvContext(cv?.screening ?? null),
        }),
      });
      const s = await r.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: s.bericht || "" },
      ]);
      const volgendeTeller = aantalBeurten + 1;
      setAantalBeurten(volgendeTeller);

      // Bouw eerst de nieuwe partial expliciet op uit de vorige partial
      // plus de verse bot-response. Deze waarde is de bron-of-truth voor
      // zowel de setPartieelProfiel als een eventuele cap-finish in
      // dezelfde beurt.
      const verseBotProfiel =
        s.profiel && typeof s.profiel === "object"
          ? (s.profiel as Record<string, string>)
          : {};
      const nieuwePartial: Record<string, string> = {
        ...leegProfiel(),
        ...(partieelProfiel || {}),
        ...verseBotProfiel,
      };
      if (s.profiel && typeof s.profiel === "object") {
        setPartieelProfiel(nieuwePartial);
      }

      if (s.klaar && s.profiel) {
        setProfiel(s.profiel);
      } else if (volgendeTeller >= MAX_BEURTEN) {
        // Harde client-cap: forceer afronden, ook als de bot nog niet
        // klaar=true zei. Gebruik dezelfde samengevoegde bron als
        // hierboven zodat geen veld uit de laatste bot-beurt verloren
        // gaat.
        setProfiel(nieuwePartial);
      }
    } finally {
      setBezig(false);
    }
  }

  // "Sla op en sluit af": pakt de tot dan toe verzamelde info en rondt
  // direct af. Alleen toegestaan zodra alle 5 essenties binnen zijn (UI
  // dwingt dit ook af via disabled).
  function slaOpEnSluitAf() {
    if (profiel || finishing) return;
    if (!heeftAlleEssenties(partieelProfiel)) return;
    setProfiel({ ...leegProfiel(), ...(partieelProfiel || {}) });
  }

  // FASE: CV uploaden
  if (fase === "cv") {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-7 text-center shadow-sm">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#333399]/20 bg-[#eef0ff] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#333399]">
            <span className="h-2 w-2 rounded-full bg-[#333399]" />
            Stap 1 van 2
          </span>
          <h2 className="mt-3 text-2xl font-bold text-gray-800">
            Upload het CV van de kandidaat
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Noah leest het CV en stelt daarna gerichte vragen tijdens het
            telefoongesprek. Daarna maken we het profiel op.
          </p>
          <label className="mt-6 block cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 transition hover:border-[#333399] hover:bg-[#eef0ff]/30">
            <input
              type="file"
              accept=".pdf,.docx,.doc,.rtf,.txt,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/rtf,text/plain,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadCv(f);
              }}
            />
            <div className="text-base font-semibold text-gray-800">
              {cvBezig
                ? "Bezig met lezen van het CV..."
                : "Klik om het CV te uploaden"}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              PDF, Word, RTF, tekst of foto van het CV (max 15 MB)
            </div>
          </label>
          {uploadFout && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {uploadFout}
            </div>
          )}
        </div>
      </div>
    );
  }

  // FASE: klaar (voorstel-profiel + uitkomst)
  if (fase === "klaar" && res) {
    const werkervaring = naarLijst(res.voorstel.werkervaring);
    const opleidingen = naarLijst(res.voorstel.opleidingen);
    const talen = naarChips(res.voorstel.talen);
    const vaardigheden = naarChips(res.voorstel.vaardigheden);

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {foutmelding && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {foutmelding}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between bg-[#333399] px-6 py-5 text-white">
            <div className="text-lg font-bold tracking-tight">Noah</div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Kandidaatprofiel
            </span>
          </div>
          <div className="space-y-6 p-6 md:p-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-800">
                {res.voorstel.naam || "Voorgestelde kandidaat"}
              </h2>
              {res.voorstel.woonplaats && (
                <p className="mt-1 text-sm text-gray-500">
                  Regio {res.voorstel.woonplaats}
                </p>
              )}
            </div>

            {res.voorstel.profielschets && (
              <Sectie titel="Profielschets">
                <p className="text-sm leading-relaxed text-gray-700">
                  {res.voorstel.profielschets}
                </p>
              </Sectie>
            )}

            {werkervaring.length > 0 && (
              <Sectie titel="Werkervaring">
                <ul className="space-y-2">
                  {werkervaring.map((r, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#333399]" />
                      <span className="leading-relaxed">{r}</span>
                    </li>
                  ))}
                </ul>
              </Sectie>
            )}

            {opleidingen.length > 0 && (
              <Sectie titel="Opleidingen en diploma's">
                <ul className="space-y-2">
                  {opleidingen.map((r, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#333399]" />
                      <span className="leading-relaxed">{r}</span>
                    </li>
                  ))}
                </ul>
              </Sectie>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              {talen.length > 0 && (
                <Sectie titel="Talen">
                  <div className="flex flex-wrap gap-1.5">
                    {talen.map((t, i) => (
                      <Chip key={i}>{t}</Chip>
                    ))}
                  </div>
                </Sectie>
              )}
              {vaardigheden.length > 0 && (
                <Sectie titel="Vaardigheden">
                  <div className="flex flex-wrap gap-1.5">
                    {vaardigheden.map((t, i) => (
                      <Chip key={i}>{t}</Chip>
                    ))}
                  </div>
                </Sectie>
              )}
              {res.voorstel.rijbewijzen && (
                <Sectie titel="Rijbewijzen">
                  <p className="text-sm text-gray-700">
                    {res.voorstel.rijbewijzen}
                  </p>
                </Sectie>
              )}
              {res.voorstel.vervoer && (
                <Sectie titel="Eigen vervoer">
                  <p className="text-sm text-gray-700">
                    {res.voorstel.vervoer}
                  </p>
                </Sectie>
              )}
            </div>
          </div>
        </div>

        {res.status === "match" ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-gray-800">
              Passende vacatures op noah-recruitment.nl
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {res.maxKm
                ? `Binnen ${res.maxKm} km van de woonplaats. `
                : ""}
              Bespreek deze met de kandidaat.
            </p>
            <div className="mt-5 space-y-3">
              {res.matches.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#333399]">
                        {m.sector || "Vacature"}
                        {m.locatie ? " · " + m.locatie : ""}
                        {typeof m.afstand === "number"
                          ? ` · ${m.afstand} km`
                          : ""}
                      </div>
                      <h3 className="mt-1 font-bold text-gray-800">
                        {m.titel}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {m.reden || m.samenvatting}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#333399] px-2.5 py-1 text-xs font-bold text-white">
                      {m.score}% match
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-gray-800">
              Kandidaat staat in de wachtrij
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Het profiel staat klaar. Wouter krijgt automatisch een melding
              en de kandidaat verschijnt in de kanban op stap website.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href="/kandidaten"
            className="inline-block rounded-full bg-[#333399] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a2a7a]"
          >
            Naar kandidaten-overzicht
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="inline-block rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#333399] hover:text-[#333399]"
          >
            Nieuwe intake starten
          </button>
        </div>
      </div>
    );
  }

  // FASE: chat (intake)
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
        <span className="rounded-full border border-green-300 bg-green-50 px-3 py-1 text-green-700">
          CV ontvangen
        </span>
        <span className="rounded-full border border-[#333399]/20 bg-[#eef0ff] px-3 py-1 text-[#333399]">
          Stap 2 van 2: intake
        </span>
      </div>
      <div className="mb-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-800">
          <span>
            Essenties: {telEssenties(partieelProfiel)} / {ESSENTIES.length}{" "}
            ingevuld
          </span>
          <span className="text-gray-500">
            naam, email, telefoon, woonplaats, functie
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full bg-[#333399] transition-all"
            style={{
              width: `${(telEssenties(partieelProfiel) / ESSENTIES.length) * 100}%`,
            }}
          />
        </div>
      </div>
      <div className="flex min-h-[460px] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef0ff] text-[#333399]">
              <span className="text-sm font-extrabold">N.</span>
            </span>
            <div>
              <div className="text-sm font-bold text-gray-800">
                Noah, AI-recruiter
              </div>
              <div className="text-xs text-gray-500">Heeft het CV gelezen</div>
            </div>
          </div>
        </div>
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto p-5"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-[#333399] text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {bezig && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm text-gray-500">
                Noah typt...
              </div>
            </div>
          )}
          {finishing && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm text-gray-500">
                Noah maakt het profiel op en zoekt passende vacatures...
              </div>
            </div>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verstuur();
          }}
          className="flex flex-wrap gap-2 border-t border-gray-200 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              profiel ? "Intake compleet" : "Typ het antwoord van de kandidaat..."
            }
            disabled={!!profiel}
            className="min-w-0 flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#333399] focus:bg-white disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={bezig || !!profiel}
            className="rounded-full bg-[#333399] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a2a7a] disabled:opacity-60"
          >
            Stuur
          </button>
          {aantalBeurten >= 2 && !profiel && (
            <button
              type="button"
              onClick={slaOpEnSluitAf}
              disabled={
                bezig || finishing || !heeftAlleEssenties(partieelProfiel)
              }
              title={
                heeftAlleEssenties(partieelProfiel)
                  ? "Sla op en sluit de intake af"
                  : "Vul eerst naam, email, telefoon, woonplaats en gewenste functies in"
              }
              className="rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#333399] hover:text-[#333399] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sla op en sluit af
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function Sectie({
  titel,
  children,
}: {
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#333399]">
        {titel}
      </h3>
      {children}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700">
      {children}
    </span>
  );
}
