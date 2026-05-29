/**
 * Client-safe types + helpers voor abonnements-plannen (geen server imports).
 */

export type PlanKey = string;

export type Plan = {
  id: string;
  sleutel: PlanKey;
  label: string;
  prijs_per_maand_cent: number;
  max_users: number | null;
  features: string[];
  populair: boolean;
  actief: boolean;
  sortering: number;
};

export function eur(cent: number): string {
  return `€ ${(cent / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
