import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshing the session keeps auth tokens fresh
  const { data: { user } } = await supabase.auth.getUser();

  // Protect routes: redirect to /login if not signed in (except auth + public)
  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/voorstel") || // publieke opdrachtgever-flow
    path.startsWith("/voorstelprofiel") || // publiek voorstelprofiel
    path.startsWith("/wachtwoord-vergeten") ||
    path.startsWith("/privacy") ||  // privacybeleid (publiek, ook voor Chrome Web Store)
    path.startsWith("/handleiding") ||  // publiek boekwerk over Noah-ATS — deelbare URL
    path.startsWith("/website") ||      // publieke marketing-website voor Noah-ATS
    path.startsWith("/word-setter") ||  // publieke setter-vacature landingspagina
    path.startsWith("/contract") ||     // publieke setter-overeenkomst (apart deelbaar)
    path.startsWith("/dpa-voorbeeld") || // tijdelijke DPA-preview
    path.startsWith("/dpa-tekenen") ||   // publieke DPA-tekenflow per token
    path.startsWith("/tekenen") ||       // publieke NDA / gebruiksvoorwaarden teken-flow
    path.startsWith("/mijn-data") ||     // publieke inzage/wis-flow voor kandidaten (AVG art. 15+17)
    path.startsWith("/contract-controle") || // publieke contract-upload door opdrachtgever
    path.startsWith("/kies-datum") ||         // kandidaat kiest datum uit mail
    path.startsWith("/reageer") ||            // GRYWO reply op aanvraag (token)
    path.startsWith("/teken/") ||             // publieke document-tekenflow (token)
    path.startsWith("/verwijder/") ||         // publieke verwijder-verzoek goedkeur-link voor recruiter
    path.startsWith("/api/webhooks") ||       // Stripe webhooks
    path.startsWith("/api/cron");   // cron jobs (eigen secret)
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Beveiligings-checks voor ingelogde users op niet-publieke routes.
  // Alles in try/catch zodat een DB-hiccup nooit een 500 op het hele dashboard veroorzaakt.
  if (user && !isPublic && !path.startsWith("/api/")) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("rol, abonnement_status, actieve_device_token, laatst_actief_op, tenant_id, proefperiode_eindigt_op")
        .eq("id", user.id)
        .maybeSingle();

      // Helper: redirect + cookies clearen zonder supabase.auth.signOut() in middleware
      // (signOut faalt soms in Edge runtime — we wissen liever zelf de auth-cookies).
      const redirectMetUitlog = (reden: { key: string; value: string }) => {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set(reden.key, reden.value);
        const res = NextResponse.redirect(url);
        // Alle sb-* cookies wissen
        request.cookies.getAll().forEach((c) => {
          if (c.name.startsWith("sb-")) res.cookies.delete(c.name);
        });
        res.cookies.delete("noah_device");
        return res;
      };

      // 1) Setter zonder actief abonnement.
      //    Uitzondering: tijdens proefperiode (5 werkdagen na aanmaak) mag setter
      //    gewoon werken. Cron blokkeert hem zodra proefperiode verlopen is.
      if (profile?.rol === "setter" && profile.abonnement_status !== "actief") {
        const proefLoopt = profile.abonnement_status === "proefperiode"
          && profile.proefperiode_eindigt_op
          && new Date(profile.proefperiode_eindigt_op).getTime() > Date.now();
        if (!proefLoopt) {
          return redirectMetUitlog({ key: "setter_abonnement", value: profile.abonnement_status ?? "geen" });
        }
      }

      // 1b) Bureau-leden (admin/recruiter) zonder actief bureau-abonnement.
      //     Intern GRYWO-personeel (Yorith, Pepijn, Wouter) wordt nooit geblokkeerd.
      const userEmail = (user.email ?? "").toLowerCase();
      const internGrywo = new Set([
        "yorith@grywo.nl",
        "yorith@noah-recruitment.nl",
        "yorith@grywo.com",
        "pepijn@grywo.nl",
        "pepijn@noah-recruitment.nl",
        "wouter@grywo.nl",
        "wouter@noah-recruitment.nl",
      ]);
      const isSuperUser = internGrywo.has(userEmail);
      if (!isSuperUser && profile?.tenant_id && (profile.rol === "admin" || profile.rol === "recruiter")) {
        const { data: ab } = await supabase
          .from("abonnementen")
          .select("status")
          .eq("tenant_id", profile.tenant_id)
          .maybeSingle();
        if (ab && ab.status !== "actief") {
          return redirectMetUitlog({ key: "bureau_abonnement", value: ab.status ?? "geen" });
        }
      }

      // 2) Single-device-policy: cookie noah_device moet matchen profile.actieve_device_token.
      if (profile?.actieve_device_token) {
        const deviceCookie = request.cookies.get("noah_device")?.value;
        if (deviceCookie !== profile.actieve_device_token) {
          return redirectMetUitlog({ key: "reden", value: "ander_apparaat" });
        }
      }

      // 3) Inactiviteits-uitlog: > 60 minuten geen activiteit
      if (profile?.laatst_actief_op) {
        const laatst = new Date(profile.laatst_actief_op).getTime();
        const minutenInactief = (Date.now() - laatst) / (60 * 1000);
        if (minutenInactief > 60) {
          return redirectMetUitlog({ key: "reden", value: "inactiviteit" });
        }
      }
    } catch (e) {
      // Liever doorlaten dan een 500 — pagina rendert zelf bij echte auth-fouten.
      console.error("[middleware] beveiligingscheck mislukt:", e);
    }
  }

  return supabaseResponse;
}
