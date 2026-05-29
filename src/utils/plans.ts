/**
 * Abonnements-plan definities.
 * Prijzen in centen (Stripe-conventie).
 */

export type PlanKey = "starter" | "pro" | "enterprise";

export type Plan = {
  key: PlanKey;
  label: string;
  prijs_per_maand_cent: number;
  max_users: number | null; // null = unlimited
  features: string[];
  populair?: boolean;
};

export const SETUP_FEE_CENT = 49500; // €495 eenmalig

export const PLANS: Record<PlanKey, Plan> = {
  starter: {
    key: "starter",
    label: "Starter",
    prijs_per_maand_cent: 4900,
    max_users: 3,
    features: [
      "Tot 3 recruiters/setters",
      "Onbeperkt kandidaten",
      "Kanban + voorstellen + agenda",
      "AI CV-parsing + profielschets",
      "E-mailadres + Voys via GRYWO",
      "AVG-compliant",
    ],
  },
  pro: {
    key: "pro",
    label: "Pro",
    prijs_per_maand_cent: 9900,
    max_users: 10,
    features: [
      "Tot 10 recruiters/setters",
      "Alles van Starter",
      "Coaching dashboard + EOD",
      "Eigen huisstijl (logo + kleuren)",
      "Contract-controle met AI redactie",
      "Prioriteit support",
    ],
    populair: true,
  },
  enterprise: {
    key: "enterprise",
    label: "Enterprise",
    prijs_per_maand_cent: 19900,
    max_users: null,
    features: [
      "Onbeperkte users",
      "Alles van Pro",
      "Custom integraties op verzoek",
      "Dedicated account-manager",
      "SLA-afspraken (99.9%)",
      "Audit-rapportage op verzoek",
    ],
  },
};

export function planFromKey(key: string): Plan | null {
  return PLANS[key as PlanKey] ?? null;
}

export function eur(cent: number): string {
  return `€ ${(cent / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
