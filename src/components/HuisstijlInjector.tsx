import { createClient } from "@/utils/supabase/server";

/**
 * Injecteert per-tenant huisstijl CSS-variabelen in de pagina.
 * Geplaatst in TopBar zodat hij op elke ingelogde pagina actief is.
 *
 * CSS vars worden gebruikt door componenten die bewust de bureau-stijl
 * tonen (sidebar, login-card, footer). Hardcoded Noah-styling blijft
 * voor neutrale UI elementen.
 */
export async function HuisstijlInjector() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return null;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("huisstijl_actief, huisstijl_primair, huisstijl_accent, huisstijl_logo_url, naam")
    .eq("id", profile.tenant_id)
    .single();

  if (!tenant?.huisstijl_actief) return null;

  const primair = tenant.huisstijl_primair ?? "#333399";
  const accent = tenant.huisstijl_accent ?? "#ffd84d";

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
:root {
  --brand-primair: ${primair};
  --brand-accent: ${accent};
}
/* Vervang Noah's standaard paars + goud door bureau-kleuren */
.bg-\\[\\#333399\\] { background-color: ${primair} !important; }
.text-\\[\\#333399\\] { color: ${primair} !important; }
.border-\\[\\#333399\\] { border-color: ${primair} !important; }
.bg-\\[\\#ffd84d\\] { background-color: ${accent} !important; }
.text-\\[\\#ffd84d\\] { color: ${accent} !important; }
.hover\\:bg-\\[\\#2a2a80\\]:hover { background-color: ${primair}dd !important; }
.from-\\[\\#333399\\] { --tw-gradient-from: ${primair} !important; }
.via-\\[\\#1f1f5c\\] { --tw-gradient-via: ${primair}99 !important; }
        `,
      }}
    />
  );
}
