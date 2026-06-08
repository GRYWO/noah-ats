"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  FileText,
  X,
} from "lucide-react";
import {
  wizardOpslaanIntake,
  wizardGenereerSchets,
  wizardOpslaanSchets,
  wizardNaarWachtrij,
  wizardAfkeuren,
} from "./actions";

type RodeVlag = {
  code: string;
  beschrijving: string;
  punten: number;
  vraag_aan_recruiter?: string;
  toelichting?: string;
  logisch?: boolean;
};

type Kandidaat = {
  id: string;
  voornaam: string | null;
  tussenvoegsel: string | null;
  achternaam: string | null;
  email: string | null;
  telefoon: string | null;
  geslacht: string | null;
  leeftijd: number | null;
  woonplaats: string | null;
  opleiding: string | null;
  open_voor: string | null;
  rijbewijs: string | null;
  eigen_vervoer: boolean | null;
  max_reisafstand_km: number | null;
  soort_dienstverband: string | null;
  werving_of_uitzend: string | null;
  salaris_indicatie: string | null;
  tarief_ws: string | null;
  bijzonderheden: string | null;
  blacklist_bedrijven: string | null;
  notitie: string | null;
  profielschets: string | null;
  cv_geparseerd: Record<string, unknown> | null;
  cv_url: string | null;
  voorstelprofiel_token: string | null;
  score: number | null;
};

const input = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm";

export function IntakeWizard({ kandidaat: kInit }: { kandidaat: Kandidaat }) {
  const router = useRouter();
  const [stap, setStap] = useState<1 | 2 | 3 | 4>(1);
  const [k, setK] = useState<Kandidaat>(kInit);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [, startTransition] = useTransition();

  // Rode vlaggen lokale state (logisch ja/nee + toelichting)
  const cvInit = (kInit.cv_geparseerd ?? {}) as Record<string, unknown>;
  const vlaggenRaw = (cvInit.rode_vlaggen ?? []) as (RodeVlag | string)[];
  const initialeVlaggen: RodeVlag[] = vlaggenRaw.map((v) =>
    typeof v === "string"
      ? { code: "overig", beschrijving: v, punten: -5, toelichting: "", logisch: true }
      : { ...v, logisch: v.logisch ?? true }
  );
  const [vlaggen, setVlaggen] = useState<RodeVlag[]>(initialeVlaggen);

  // Score is uit het systeem gehaald. Advies puur op onverklaarde rode vlaggen:
  // 2 of meer niet-logische vlaggen → afkeuren, anders → door.
  const onverklaard = vlaggen.filter((v) => v.logisch === false).length;
  const advies: "door" | "afkeuren" = onverklaard >= 2 ? "afkeuren" : "door";

  function setVlag(index: number, patch: Partial<RodeVlag>) {
    setVlaggen((vs) => vs.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  // STAP 1 → 2
  async function onStap1Submit(fd: FormData) {
    setFout(null);
    setBezig(true);
    startTransition(async () => {
      const r = await wizardOpslaanIntake(fd);
      setBezig(false);
      if (r.error) {
        setFout(r.error);
        return;
      }
      setStap(2);
    });
  }

  // STAP 2: goedkeuren → genereer schets + door naar 3
  async function onGoedkeuren() {
    setFout(null);
    setBezig(true);
    startTransition(async () => {
      // Genereer alleen als er nog geen schets is
      if (!k.profielschets) {
        const r = await wizardGenereerSchets(k.id);
        if (r.error) {
          setBezig(false);
          setFout(r.error);
          return;
        }
        setK((prev) => ({ ...prev, profielschets: r.schets ?? "" }));
      }
      setBezig(false);
      setStap(3);
    });
  }

  // STAP 2: afkeuren via modal
  const [afkeurOpen, setAfkeurOpen] = useState(false);

  // STAP 3: opslaan schets + door naar 4
  async function onSchetsOpslaan() {
    setFout(null);
    setBezig(true);
    const fd = new FormData();
    fd.set("id", k.id);
    fd.set("profielschets", k.profielschets ?? "");
    startTransition(async () => {
      const r = await wizardOpslaanSchets(fd);
      setBezig(false);
      if (r.error) {
        setFout(r.error);
        return;
      }
      setStap(4);
    });
  }

  async function onRegenereerSchets() {
    setFout(null);
    setBezig(true);
    startTransition(async () => {
      const r = await wizardGenereerSchets(k.id);
      setBezig(false);
      if (r.error) {
        setFout(r.error);
        return;
      }
      setK((prev) => ({ ...prev, profielschets: r.schets ?? "" }));
    });
  }

  // STAP 4: naar wachtrij + redirect
  async function onNaarWachtrij() {
    setFout(null);
    setBezig(true);
    startTransition(async () => {
      const r = await wizardNaarWachtrij(k.id);
      setBezig(false);
      if (r.error) {
        setFout(r.error);
        return;
      }
      router.push(`/kandidaten/${k.id}?ok=intake_afgerond`);
    });
  }

  const naam = `${k.voornaam ?? ""} ${k.achternaam ?? ""}`.trim() || "Kandidaat";

  return (
    <div>
      {/* Header met progress */}
      <div className="mb-6">
        <Link href={`/kandidaten/${k.id}`} className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-block">
          ← Terug naar kandidaat
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">Intake — {naam}</h1>
        <p className="text-sm text-gray-500 mt-1">Doorloop de 4 stappen om de kandidaat klaar te zetten voor de setter.</p>
        <ProgressBar stap={stap} />
      </div>

      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertTriangle size={14} />
          {fout}
        </div>
      )}

      {/* STAP 1: Vragenlijst */}
      {stap === 1 && (
        <form action={onStap1Submit} className="space-y-5">
          <input type="hidden" name="id" value={k.id} />

          {/* Rode vlaggen bovenaan */}
          {vlaggen.length > 0 && (
            <Card titel={`Rode vlaggen — ${vlaggen.length} aandachtspunt(en)`} badge="AI-detectie" tone="rood">
              <p className="text-xs text-red-900 mb-3">
                Per vlag: geef een toelichting en klik <b>Logisch</b> (geen punten-aftrek) of <b>Niet logisch</b> (punten worden afgetrokken).
              </p>
              <div className="space-y-3">
                {vlaggen.map((v, idx) => (
                  <div key={idx} className="bg-red-50/50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2 flex-1">
                        <AlertTriangle size={14} className="text-red-700 mt-0.5 shrink-0" />
                        <div className="text-xs">
                          <div className="font-bold text-red-900">{v.beschrijving}</div>
                          {v.vraag_aan_recruiter && (
                            <div className="text-red-800 mt-0.5 italic">Vraag: {v.vraag_aan_recruiter}</div>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-red-800 bg-white border border-red-200 rounded-full px-2 py-0.5 shrink-0">{v.punten}</span>
                    </div>
                    <textarea
                      name={`vlag_toelichting_${v.code}`}
                      value={v.toelichting ?? ""}
                      onChange={(e) => setVlag(idx, { toelichting: e.target.value })}
                      rows={2}
                      placeholder="Antwoord van kandidaat / jouw beoordeling..."
                      className="w-full px-2 py-1.5 border border-red-200 rounded-md text-xs bg-white"
                    />
                    <input type="hidden" name={`vlag_logisch_${v.code}`} value={v.logisch ? "ja" : "nee"} />
                    <div className="mt-2 inline-flex rounded-md overflow-hidden border border-red-200 bg-white text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setVlag(idx, { logisch: true })}
                        className={`px-3 py-1 ${v.logisch ? "bg-emerald-500 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        Logisch
                      </button>
                      <button
                        type="button"
                        onClick={() => setVlag(idx, { logisch: false })}
                        className={`px-3 py-1 ${v.logisch === false ? "bg-red-500 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        Niet logisch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Persoonlijk */}
          <Card titel="Persoonlijk">
            <Grid>
              <Veld label="Voornaam *"><input name="voornaam" required defaultValue={k.voornaam ?? ""} className={input} /></Veld>
              <Veld label="Tussenvoegsel"><input name="tussenvoegsel" defaultValue={k.tussenvoegsel ?? ""} className={input} /></Veld>
              <Veld label="Achternaam *"><input name="achternaam" required defaultValue={k.achternaam ?? ""} className={input} /></Veld>
              <Veld label="E-mail"><input name="email" type="email" defaultValue={k.email ?? ""} className={input} /></Veld>
              <Veld label="Telefoon"><input name="telefoon" defaultValue={k.telefoon ?? ""} className={input} /></Veld>
              <Veld label="Geslacht">
                <select name="geslacht" defaultValue={k.geslacht ?? ""} className={input}>
                  <option value="">—</option><option value="man">Man</option><option value="vrouw">Vrouw</option><option value="anders">Anders</option>
                </select>
              </Veld>
              <Veld label="Leeftijd"><input name="leeftijd" type="number" min="16" max="99" defaultValue={k.leeftijd ?? ""} className={input} /></Veld>
              <Veld label="Woonplaats"><input name="woonplaats" defaultValue={k.woonplaats ?? ""} className={input} /></Veld>
            </Grid>
          </Card>

          {/* Werkvoorkeuren */}
          <Card titel="Werkvoorkeuren">
            <Grid>
              <Veld label="Open voor functies" fullWidth><input name="open_voor" defaultValue={k.open_voor ?? ""} placeholder="bv. Machinist, Chauffeur" className={input} /></Veld>
              <Veld label="Soort dienstverband">
                <select name="soort_dienstverband" defaultValue={k.soort_dienstverband ?? ""} className={input}>
                  <option value="">—</option>
                  <option value="fulltime">Fulltime</option>
                  <option value="parttime">Parttime</option>
                  <option value="flexibel">Flexibel</option>
                </select>
              </Veld>
              <Veld label="Werving & selectie / uitzend">
                <select name="werving_of_uitzend" defaultValue={k.werving_of_uitzend ?? ""} className={input}>
                  <option value="">—</option>
                  <option value="werving_selectie">Werving &amp; Selectie</option>
                  <option value="uitzend">Uitzendbasis</option>
                  <option value="beide">Beide</option>
                </select>
              </Veld>
              <Veld label="Salarisindicatie"><input name="salaris_indicatie" defaultValue={k.salaris_indicatie ?? ""} className={input} /></Veld>
              <Veld label="Tarief W&S"><input name="tarief_ws" defaultValue={k.tarief_ws ?? ""} className={input} /></Veld>
              <Veld label="Max reisafstand (km)"><input name="max_reisafstand_km" type="number" min="0" max="500" defaultValue={k.max_reisafstand_km ?? ""} className={input} /></Veld>
              <Veld label="Blacklist bedrijven" fullWidth><input name="blacklist_bedrijven" defaultValue={k.blacklist_bedrijven ?? ""} className={input} /></Veld>
            </Grid>
          </Card>

          {/* CV-info */}
          <Card titel="CV & ervaring" badge="AI-extractie">
            <Veld label="Opleiding"><input name="opleiding" defaultValue={k.opleiding ?? ""} className={input} /></Veld>
            <Veld label="Werkervaring">
              <textarea name="werkervaring" rows={4} defaultValue={(cvInit.werkervaring as string) ?? ""} className={input} />
            </Veld>
            <Veld label="Vaardigheden">
              <textarea name="vaardigheden" rows={3} defaultValue={(cvInit.vaardigheden as string) ?? ""} className={input} />
            </Veld>
            <Veld label="Talen"><input name="talen" defaultValue={(cvInit.talen as string) ?? ""} className={input} /></Veld>
            <Veld label="Diploma's & certificaten">
              <textarea
                name="diplomas"
                rows={4}
                defaultValue={(cvInit.diplomas as string) ?? ""}
                placeholder={"Eén per regel, bv:\n2010 · VMBO Techniek — ROC Twente\n2018 · VCA Basis\n2020 · Lasdiploma MIG/MAG niv. 3"}
                className={input}
              />
            </Veld>
            <Grid>
              <Veld label="Rijbewijs"><input name="rijbewijs" defaultValue={k.rijbewijs ?? ""} className={input} /></Veld>
              <Veld label="">
                <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
                  <input type="checkbox" name="eigen_vervoer" defaultChecked={k.eigen_vervoer ?? false} className="w-4 h-4 accent-[#333399]" />
                  Eigen vervoer
                </label>
              </Veld>
            </Grid>
          </Card>

          <Card titel="Notities">
            <Veld label="Bijzonderheden">
              <textarea name="bijzonderheden" rows={3} defaultValue={k.bijzonderheden ?? ""} className={input} />
            </Veld>
            <Veld label="Interne notitie (niet voor opdrachtgever)">
              <textarea name="notitie" rows={2} defaultValue={k.notitie ?? ""} className={input} />
            </Veld>
          </Card>

          <div className="flex justify-end pt-3 border-t">
            <button type="submit" disabled={bezig} className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-6 py-2.5 rounded-md text-sm inline-flex items-center gap-2 disabled:opacity-60">
              {bezig ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              Volgende — beoordelen
            </button>
          </div>
        </form>
      )}

      {/* STAP 2: Goedkeuren / Afkeuren */}
      {stap === 2 && (
        <div className="space-y-5">
          <Card titel="Beoordeling" badge="Op basis van vlaggen">
            <div className="grid grid-cols-2 gap-4">
              <ScoreBlok label="Totaal vlaggen" waarde={vlaggen.length} kleur="grijs" />
              <ScoreBlok label="Niet logisch" waarde={onverklaard} kleur={onverklaard >= 2 ? "rood" : "groen"} />
            </div>
            <div className={`mt-4 rounded-lg p-4 text-sm ${advies === "door" ? "bg-emerald-50 border border-emerald-200 text-emerald-900" : "bg-red-50 border border-red-200 text-red-900"}`}>
              <div className="font-bold inline-flex items-center gap-2">
                {advies === "door" ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
                Advies: {advies === "door" ? "Doorzetten naar profielschets" : "Afkeuren"}
              </div>
              <p className="text-xs mt-1 opacity-80">
                Je bent vrij om af te wijken — jouw oordeel is leidend.
              </p>
            </div>
          </Card>

          <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setStap(1)}
              className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5"
            >
              <ArrowLeft size={13} /> Terug
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAfkeurOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 border border-red-200 px-4 py-2 rounded-md"
              >
                <ThumbsDown size={13} /> Afkeuren
              </button>
              <button
                type="button"
                onClick={onGoedkeuren}
                disabled={bezig}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2 rounded-md text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                {bezig ? <Loader2 size={13} className="animate-spin" /> : <ThumbsUp size={13} />}
                Goedkeuren — naar profielschets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAP 3: Profielschets */}
      {stap === 3 && (
        <div className="space-y-5">
          <Card titel="Profielschets" badge="3e persoon">
            <p className="text-xs text-gray-500 mb-3">
              Deze tekst komt op het voorstelprofiel dat opdrachtgevers zien. Pas aan waar nodig — focus op kracht, geen contactgegevens.
            </p>
            <textarea
              value={k.profielschets ?? ""}
              onChange={(e) => setK((prev) => ({ ...prev, profielschets: e.target.value }))}
              rows={12}
              className={input}
            />
            <button
              type="button"
              onClick={onRegenereerSchets}
              disabled={bezig}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-[#333399]/5 hover:bg-[#333399]/10 text-[#333399] px-3 py-1.5 rounded-md disabled:opacity-50"
            >
              {bezig ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              Opnieuw laten genereren
            </button>
          </Card>

          <div className="flex items-center justify-between gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setStap(2)}
              className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5"
            >
              <ArrowLeft size={13} /> Terug
            </button>
            <button
              type="button"
              onClick={onSchetsOpslaan}
              disabled={bezig || !k.profielschets?.trim()}
              className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-6 py-2 rounded-md text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {bezig ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
              Volgende — voorstelprofiel
            </button>
          </div>
        </div>
      )}

      {/* STAP 4: Voorstelprofiel preview */}
      {stap === 4 && (
        <div className="space-y-5">
          <Card titel="Voorstelprofiel — preview" badge="Wat de opdrachtgever ziet">
            {k.voorstelprofiel_token ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                <iframe
                  src={`/voorstelprofiel/${k.voorstelprofiel_token}`}
                  className="w-full"
                  style={{ height: "600px", border: "none" }}
                  title="Voorstelprofiel preview"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                <FileText size={20} className="inline mr-1 text-gray-400" />
                Geen voorstelprofiel-token — bij &quot;Naar wachtrij&quot; wordt deze automatisch aangemaakt.
              </p>
            )}
          </Card>

          <div className="flex items-center justify-between gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setStap(3)}
              className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5"
            >
              <ArrowLeft size={13} /> Terug
            </button>
            <button
              type="button"
              onClick={onNaarWachtrij}
              disabled={bezig}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-md text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {bezig ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Klaar — naar wachtrij
            </button>
          </div>
        </div>
      )}

      {afkeurOpen && <AfkeurModal kandidaatId={k.id} onClose={() => setAfkeurOpen(false)} />}
    </div>
  );
}

function AfkeurModal({ kandidaatId, onClose }: { kandidaatId: string; onClose: () => void }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function onSubmit(fd: FormData) {
    setFout(null);
    setBezig(true);
    startTransition(async () => {
      const r = await wizardAfkeuren(fd);
      setBezig(false);
      if (r.error) {
        setFout(r.error);
        return;
      }
      router.push(`/kandidaten/${kandidaatId}?ok=intake_afgewezen`);
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-800 inline-flex items-center gap-2">
            <ThumbsDown size={14} /> Kandidaat afkeuren
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
        </div>
        <form action={onSubmit} className="p-5 space-y-3">
          <input type="hidden" name="id" value={kandidaatId} />
          <div className="bg-red-50 border border-red-200 text-red-900 text-xs rounded-md p-3">
            Status wordt &quot;afgewezen&quot;. De kandidaat krijgt een afwijzings-mail. De reden wordt toegevoegd aan de notitie.
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reden afkeuring *</label>
            <textarea
              name="afkeur_reden"
              required
              rows={4}
              autoFocus
              placeholder="bv. 'geen rijbewijs B, essentieel voor functie'"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          {fout && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-md p-2">{fout}</div>}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="text-sm text-gray-600 hover:underline px-3 py-1.5">
              Annuleer
            </button>
            <button type="submit" disabled={bezig} className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-1.5 rounded-md text-sm inline-flex items-center gap-1.5 disabled:opacity-60">
              {bezig ? <Loader2 size={12} className="animate-spin" /> : <ThumbsDown size={12} />}
              Bevestig afkeuring
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProgressBar({ stap }: { stap: number }) {
  const stappen = ["Vragen", "Beoordelen", "Profielschets", "Voorstelprofiel"];
  return (
    <div className="flex items-center gap-2 mt-4">
      {stappen.map((label, i) => {
        const num = i + 1;
        const actief = num === stap;
        const klaar = num < stap;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              klaar ? "bg-emerald-500 text-white" :
              actief ? "bg-[#333399] text-white" :
              "bg-gray-200 text-gray-500"
            }`}>
              {klaar ? <Check size={12} /> : num}
            </div>
            <span className={`text-xs font-semibold ${actief || klaar ? "text-gray-800" : "text-gray-400"}`}>
              {label}
            </span>
            {i < stappen.length - 1 && <div className={`flex-1 h-0.5 ${klaar ? "bg-emerald-500" : "bg-gray-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function ScoreBlok({ label, waarde, kleur }: { label: string; waarde: number | string; kleur: "groen" | "rood" | "oranje" | "grijs" }) {
  const k = {
    groen:  "bg-emerald-50 border-emerald-200 text-emerald-800",
    rood:   "bg-red-50 border-red-200 text-red-800",
    oranje: "bg-amber-50 border-amber-200 text-amber-800",
    grijs:  "bg-gray-50 border-gray-200 text-gray-800",
  }[kleur];
  return (
    <div className={`rounded-lg border p-3 ${k}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-2xl font-bold mt-1">{waarde}</div>
    </div>
  );
}

function Card({ titel, badge, tone, children }: { titel: string; badge?: string; tone?: "rood"; children: React.ReactNode }) {
  const ringen = tone === "rood" ? "border-red-200" : "border-gray-200";
  return (
    <section className={`bg-white border ${ringen} rounded-xl shadow-sm p-5`}>
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <h2 className="font-bold text-gray-800">{titel}</h2>
        {badge && <span className="text-[10px] font-bold uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Veld({ label, fullWidth, children }: { label: string; fullWidth?: boolean; children: React.ReactNode }) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
