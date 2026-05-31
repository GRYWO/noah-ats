/**
 * Aggregate-laag voor super-admin abonnementen-overzicht.
 * Levert alle bureau + setter abonnementen + MRR-statistieken in 1 call.
 */
import { createAdminClient } from "@/utils/supabase/admin";

export type BureauRij = {
  id: string;              // abonnement-id
  tenant_id: string;
  bureau_naam: string;
  plan: string;
  plan_label: string;
  status: string;          // actief / wachtend_betaling / opgezegd / ...
  setup_fee_betaald: boolean;
  setup_fee_cent: number;
  prijs_per_maand_cent: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  huidige_periode_einde: string | null;
  gestart_op: string | null;
  opgezegd_op: string | null;
  contact_email: string | null;
  laatste_factuur_status: string | null; // "betaald" / "open" / "mislukt" / null
};

export type SetterRij = {
  id: string;             // profile id
  user_naam: string;
  bureau_naam: string | null;
  email: string;
  status: string;
  prijs_per_maand_cent: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  actief_sinds: string | null;
  opgezegd_op: string | null;
};

export type AbonnementenOverzicht = {
  bureauActief: BureauRij[];
  bureauOpgezegd: BureauRij[];
  setterActief: SetterRij[];
  setterOpgezegd: SetterRij[];
  mrr: {
    bureau_cent: number;       // alle actieve bureau-abonnementen samen
    setter_cent: number;       // alle actieve setter-stoelen samen
    totaal_cent: number;
    arr_projectie_cent: number; // jaar-projectie
  };
  trend: { maand: string; mrr_cent: number }[]; // laatste 6 maanden geschat
  churn: {
    bureau_deze_maand: number;
    setter_deze_maand: number;
    bureau_total_opgezegd: number;
    setter_total_opgezegd: number;
  };
};

const SETTER_PRIJS_CENT = 25000; // €250

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export async function getAbonnementenOverzicht(): Promise<AbonnementenOverzicht> {
  const admin = createAdminClient();

  // Parallel ophalen
  const [
    bureauAbosRes,
    settersRes,
    tenantsRes,
    plannenRes,
  ] = await Promise.all([
    admin
      .from("abonnementen")
      .select("id, tenant_id, plan, status, setup_fee_betaald, setup_fee_cent, prijs_per_maand_cent, stripe_customer_id, stripe_subscription_id, huidige_periode_einde, gestart_op, beeindigd_op")
      .order("gestart_op", { ascending: false }),
    admin
      .from("profiles")
      .select("id, voornaam, achternaam, rol, abonnement_status, abonnement_actief_sinds, abonnement_opgezegd_op, stripe_customer_id, stripe_subscription_id, tenant_id")
      .eq("rol", "setter")
      .not("stripe_customer_id", "is", null)
      .order("abonnement_actief_sinds", { ascending: false }),
    admin
      .from("tenants")
      .select("id, naam, contact_email"),
    admin
      .from("abonnements_plannen")
      .select("sleutel, label"),
  ]);

  const tenantMap = new Map<string, { naam: string; contact_email: string | null }>();
  for (const t of tenantsRes.data ?? []) {
    tenantMap.set(t.id, { naam: t.naam, contact_email: t.contact_email });
  }
  const planLabelMap = new Map<string, string>(PLAN_LABELS as unknown as [string, string][]);
  for (const p of plannenRes.data ?? []) {
    planLabelMap.set(p.sleutel, p.label);
  }

  // Auth users → email lookup voor setters
  const setterIds = (settersRes.data ?? []).map((s) => s.id);
  const emailMap = new Map<string, string>();
  for (const id of setterIds) {
    try {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data?.user?.email) emailMap.set(id, data.user.email);
    } catch {}
  }

  // Bureau-rijen mappen
  const bureauRijen: BureauRij[] = (bureauAbosRes.data ?? []).map((a) => {
    const t = tenantMap.get(a.tenant_id);
    return {
      id: a.id,
      tenant_id: a.tenant_id,
      bureau_naam: t?.naam ?? "?",
      plan: a.plan,
      plan_label: planLabelMap.get(a.plan) ?? a.plan,
      status: a.status,
      setup_fee_betaald: !!a.setup_fee_betaald,
      setup_fee_cent: a.setup_fee_cent ?? 0,
      prijs_per_maand_cent: a.prijs_per_maand_cent ?? 0,
      stripe_customer_id: a.stripe_customer_id,
      stripe_subscription_id: a.stripe_subscription_id,
      huidige_periode_einde: a.huidige_periode_einde,
      gestart_op: a.gestart_op,
      opgezegd_op: a.beeindigd_op,
      contact_email: t?.contact_email ?? null,
      laatste_factuur_status: null, // pas ingevuld via Stripe (later)
    };
  });

  const bureauActief = bureauRijen.filter((b) => ["actief", "wachtend_betaling", "achterstallig"].includes(b.status));
  const bureauOpgezegd = bureauRijen.filter((b) => ["opgezegd", "geblokkeerd", "read_only"].includes(b.status));

  // Setter-rijen mappen
  const setterRijen: SetterRij[] = (settersRes.data ?? []).map((s) => {
    const tenant = s.tenant_id ? tenantMap.get(s.tenant_id) : null;
    return {
      id: s.id,
      user_naam: `${s.voornaam ?? ""} ${s.achternaam ?? ""}`.trim() || "?",
      bureau_naam: tenant?.naam ?? null,
      email: emailMap.get(s.id) ?? "",
      status: s.abonnement_status ?? "geen",
      prijs_per_maand_cent: SETTER_PRIJS_CENT,
      stripe_customer_id: s.stripe_customer_id,
      stripe_subscription_id: s.stripe_subscription_id,
      actief_sinds: s.abonnement_actief_sinds,
      opgezegd_op: s.abonnement_opgezegd_op,
    };
  });

  const setterActief = setterRijen.filter((s) => ["actief", "wachtend_betaling", "achterstallig"].includes(s.status));
  const setterOpgezegd = setterRijen.filter((s) => ["opgezegd"].includes(s.status));

  // MRR
  const bureauMrr = bureauActief.filter((b) => b.status === "actief").reduce((s, b) => s + b.prijs_per_maand_cent, 0);
  const setterMrr = setterActief.filter((s) => s.status === "actief").reduce((s, x) => s + x.prijs_per_maand_cent, 0);
  const totaalMrr = bureauMrr + setterMrr;

  // Trend: laatste 6 maanden — schatting op basis van gestart_op datums
  const nu = new Date();
  const trend: { maand: string; mrr_cent: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const datum = new Date(nu.getFullYear(), nu.getMonth() - i, 1);
    const einde = new Date(nu.getFullYear(), nu.getMonth() - i + 1, 1);

    const bureausTeller = bureauRijen
      .filter((b) => b.gestart_op && new Date(b.gestart_op) < einde && (!b.opgezegd_op || new Date(b.opgezegd_op) >= einde))
      .reduce((s, b) => s + b.prijs_per_maand_cent, 0);
    const settersTeller = setterRijen
      .filter((s) => s.actief_sinds && new Date(s.actief_sinds) < einde && (!s.opgezegd_op || new Date(s.opgezegd_op) >= einde))
      .reduce((s, x) => s + x.prijs_per_maand_cent, 0);

    trend.push({
      maand: datum.toLocaleDateString("nl-NL", { month: "short", year: "2-digit" }),
      mrr_cent: bureausTeller + settersTeller,
    });
  }

  // Churn deze maand
  const startMaand = new Date(nu.getFullYear(), nu.getMonth(), 1);
  const bureauDezeMaand = bureauOpgezegd.filter((b) => b.opgezegd_op && new Date(b.opgezegd_op) >= startMaand).length;
  const setterDezeMaand = setterOpgezegd.filter((s) => s.opgezegd_op && new Date(s.opgezegd_op) >= startMaand).length;

  return {
    bureauActief,
    bureauOpgezegd,
    setterActief,
    setterOpgezegd,
    mrr: {
      bureau_cent: bureauMrr,
      setter_cent: setterMrr,
      totaal_cent: totaalMrr,
      arr_projectie_cent: totaalMrr * 12,
    },
    trend,
    churn: {
      bureau_deze_maand: bureauDezeMaand,
      setter_deze_maand: setterDezeMaand,
      bureau_total_opgezegd: bureauOpgezegd.length,
      setter_total_opgezegd: setterOpgezegd.length,
    },
  };
}
