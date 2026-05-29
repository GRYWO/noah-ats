"use client";

import { useState } from "react";
import { Crown, CheckCircle2, AlertTriangle, XCircle, Loader2, Sparkles } from "lucide-react";
import { eur, type Plan, type PlanKey } from "@/utils/plans-shared";
import { startAbonnement, wijzigPlan, zegOp, overrideStatus } from "./abonnement-actions";

type Abonnement = {
  plan: string;
  status: string;
  max_users: number | null;
  prijs_per_maand_cent: number;
  setup_fee_betaald: boolean;
  huidige_periode_einde: string | null;
  gestart_op: string | null;
  stripe_customer_id: string | null;
} | null;

type Props = {
  tenantId: string;
  bureauNaam: string;
  contactEmail: string;
  contactNaam: string;
  abonnement: Abonnement;
  stripeBeschikbaar: boolean;
  plans: Plan[];
  setupFeeCent: number;
};

const STATUS_KLEUR: Record<string, string> = {
  actief:        "bg-emerald-100 text-emerald-700",
  achterstallig: "bg-amber-100 text-amber-700",
  read_only:     "bg-orange-100 text-orange-700",
  geblokkeerd:   "bg-red-100 text-red-700",
  opgezegd:      "bg-gray-100 text-gray-700",
  concept:       "bg-blue-100 text-blue-700",
};

const STATUS_LABEL: Record<string, string> = {
  actief:        "Actief",
  achterstallig: "Achterstallig",
  read_only:     "Read-only (14d achterstand)",
  geblokkeerd:   "Geblokkeerd (21d achterstand)",
  opgezegd:      "Opgezegd",
  concept:       "Nog niet gestart",
};

export function AbonnementSectie({
  tenantId,
  bureauNaam,
  contactEmail,
  contactNaam,
  abonnement,
  stripeBeschikbaar,
  plans,
  setupFeeCent,
}: Props) {
  const planMap = new Map(plans.map((p) => [p.sleutel, p]));
  const defaultPlan = plans.find((p) => p.populair) ?? plans[0];
  const [gekozenPlan, setGekozenPlan] = useState<PlanKey>(defaultPlan?.sleutel ?? "starter");
  const huidigeGekozen = planMap.get(gekozenPlan) ?? defaultPlan;
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  async function start() {
    setBezig(true);
    setMelding(null);
    const r = await startAbonnement({
      tenantId,
      plan: gekozenPlan,
      contactEmail,
      contactNaam,
    });
    setBezig(false);
    setMelding(r.ok ? "Abonnement gestart ✓" : r.error ?? "Fout");
  }

  async function wijzig(nieuwPlan: PlanKey) {
    if (!confirm(`Plan wijzigen naar ${(planMap.get(nieuwPlan)?.label ?? nieuwPlan)}? Prorata wordt automatisch berekend.`)) return;
    setBezig(true);
    const r = await wijzigPlan({ tenantId, nieuwPlan });
    setBezig(false);
    setMelding(r.ok ? "Plan gewijzigd ✓" : r.error ?? "Fout");
  }

  async function opzeg() {
    if (!confirm("Opzegging plannen? Het abonnement loopt door tot einde huidige periode.")) return;
    setBezig(true);
    const r = await zegOp({ tenantId });
    setBezig(false);
    setMelding(r.ok ? "Opzegging gepland" : r.error ?? "Fout");
  }

  async function override(status: "actief" | "read_only" | "geblokkeerd") {
    if (!confirm(`Handmatig status zetten op "${status}"?`)) return;
    setBezig(true);
    await overrideStatus({ tenantId, nieuweStatus: status });
    setBezig(false);
    setMelding("Status aangepast");
  }

  // ========== NIET GESTART: PLAN KIEZEN ==========
  if (!abonnement) {
    return (
      <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Crown size={20} className="text-[#ffd84d]" />
          <h2 className="text-lg font-bold text-gray-800">Abonnement</h2>
          <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full uppercase font-bold ml-2">
            Super-admin
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          {bureauNaam} heeft nog geen abonnement. Kies een plan om te activeren —
          eenmalige setup-fee van {eur(setupFeeCent)} + recurring maandbedrag.
        </p>

        {!stripeBeschikbaar && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-lg p-3 mb-4">
            ⚠ Stripe is niet geconfigureerd. Voeg <code>STRIPE_SECRET_KEY</code> +{" "}
            <code>STRIPE_WEBHOOK_SECRET</code> toe in je Vercel env vars.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {(plans).map((p) => {
            const actief = gekozenPlan === p.sleutel;
            return (
              <button
                key={p.sleutel}
                type="button"
                onClick={() => setGekozenPlan(p.sleutel)}
                className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                  actief
                    ? "border-[#333399] bg-[#333399]/5 shadow-md"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                {p.populair && (
                  <span className="absolute -top-2 right-3 px-2 py-0.5 bg-[#ffd84d] text-[#333399] text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Populair
                  </span>
                )}
                <div className={`text-xs uppercase font-semibold ${actief ? "text-[#333399]" : "text-gray-500"}`}>
                  {p.label}
                </div>
                <div className="mt-1">
                  <span className="text-3xl font-bold text-gray-800">{eur(p.prijs_per_maand_cent)}</span>
                  <span className="text-xs text-gray-500"> / maand</span>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  {p.max_users === null ? "Onbeperkte users" : `Max ${p.max_users} users`}
                </div>
                <ul className="space-y-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <CheckCircle2 size={11} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {melding && (
          <div className={`text-sm rounded-md p-3 mb-3 ${
            melding.includes("✓") ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {melding}
          </div>
        )}

        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-700">
            <b>Te factureren bij start:</b> {eur(setupFeeCent)} setup-fee +{" "}
            {eur((huidigeGekozen?.prijs_per_maand_cent ?? 0))} eerste maand
          </div>
          <button
            onClick={start}
            disabled={bezig || !stripeBeschikbaar}
            className="bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-md text-sm inline-flex items-center gap-2"
          >
            {bezig && <Loader2 size={14} className="animate-spin" />}
            Activeer {(huidigeGekozen?.label ?? gekozenPlan)}
          </button>
        </div>
      </section>
    );
  }

  // ========== ACTIEF ABONNEMENT ==========
  const huidigePlan = planMap.get(abonnement.plan);
  const statusKleur = STATUS_KLEUR[abonnement.status] ?? "bg-gray-100 text-gray-700";
  const statusLabel = STATUS_LABEL[abonnement.status] ?? abonnement.status;
  const isProbleem = ["achterstallig", "read_only", "geblokkeerd"].includes(abonnement.status);

  return (
    <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Crown size={20} className="text-[#ffd84d]" />
        <h2 className="text-lg font-bold text-gray-800">Abonnement</h2>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${statusKleur}`}>
          {abonnement.status === "actief" ? <CheckCircle2 size={11} /> :
           abonnement.status === "geblokkeerd" ? <XCircle size={11} /> :
           <AlertTriangle size={11} />}
          {statusLabel}
        </span>
      </div>

      {/* Huidig plan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-gradient-to-br from-[#333399] to-[#1f1f5c] text-white rounded-xl p-4">
          <div className="text-xs uppercase opacity-70 font-semibold flex items-center gap-1">
            <Sparkles size={11} />
            Huidig plan
          </div>
          <div className="text-2xl font-bold mt-1">{huidigePlan?.label ?? abonnement.plan}</div>
          <div className="text-xs opacity-80 mt-1">
            {eur(abonnement.prijs_per_maand_cent)} / maand
          </div>
          <div className="text-xs opacity-70 mt-2">
            {abonnement.max_users === null ? "Onbeperkte users" : `Max ${abonnement.max_users} users`}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="text-xs uppercase text-gray-500 font-semibold">Volgende factuur</div>
          <div className="text-lg font-bold text-gray-800 mt-1">
            {abonnement.huidige_periode_einde
              ? new Date(abonnement.huidige_periode_einde).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })
              : "—"}
          </div>
          <div className="text-xs text-gray-500 mt-1">{eur(abonnement.prijs_per_maand_cent)}</div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="text-xs uppercase text-gray-500 font-semibold">Setup-fee</div>
          <div className="text-lg font-bold text-gray-800 mt-1">
            {abonnement.setup_fee_betaald ? "Betaald ✓" : "Open"}
          </div>
          <div className="text-xs text-gray-500 mt-1">{eur(setupFeeCent)}</div>
        </div>
      </div>

      {/* Plan wijzigen */}
      <div className="mb-5">
        <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Plan wijzigen</div>
        <div className="grid grid-cols-3 gap-2">
          {plans.map((p) => (
            <button
              key={p.sleutel}
              onClick={() => wijzig(p.sleutel)}
              disabled={bezig || p.sleutel === abonnement.plan}
              className={`p-3 rounded-lg border-2 transition-colors text-sm ${
                p.sleutel === abonnement.plan
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 cursor-default"
                  : "border-gray-200 hover:border-[#333399] hover:bg-[#333399]/5 text-gray-700"
              }`}
            >
              <div className="font-bold">{p.label}</div>
              <div className="text-xs opacity-70">{eur(p.prijs_per_maand_cent)} /mnd</div>
              {p.sleutel === abonnement.plan && (
                <div className="text-[10px] mt-1 font-semibold uppercase">Huidig</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {melding && (
        <div className={`text-sm rounded-md p-3 mb-3 ${
          melding.includes("✓") || melding.includes("gepland") ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {melding}
        </div>
      )}

      {/* Acties */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
        {abonnement.stripe_customer_id && (
          <a
            href={`https://dashboard.stripe.com/customers/${abonnement.stripe_customer_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#333399] hover:underline"
          >
            Open in Stripe →
          </a>
        )}
        {abonnement.status !== "opgezegd" && (
          <button
            onClick={opzeg}
            disabled={bezig}
            className="ml-auto text-xs text-red-600 hover:underline"
          >
            Opzeggen (per einde periode)
          </button>
        )}
      </div>

      {/* Super-admin override (in bug-/kulanz-situaties) */}
      <details className="mt-4 text-xs">
        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
          Handmatige status-override (alleen voor bug/kulanz)
        </summary>
        <div className="mt-2 flex gap-2 flex-wrap">
          <button onClick={() => override("actief")} disabled={bezig} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">
            → actief
          </button>
          <button onClick={() => override("read_only")} disabled={bezig} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
            → read_only
          </button>
          <button onClick={() => override("geblokkeerd")} disabled={bezig} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
            → geblokkeerd
          </button>
        </div>
      </details>

      {isProbleem && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-3">
          ⚠ <b>Wanbetaling-flow actief.</b> Cron checkt dagelijks en stuurt automatisch reminders. Status wijzigt automatisch terug naar &quot;actief&quot; zodra Stripe een betaling registreert.
        </div>
      )}
    </section>
  );
}
