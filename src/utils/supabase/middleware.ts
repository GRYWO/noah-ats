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
    path.startsWith("/dpa-voorbeeld") || // tijdelijke DPA-preview
    path.startsWith("/dpa-tekenen") ||   // publieke DPA-tekenflow per token
    path.startsWith("/tekenen") ||       // publieke NDA / gebruiksvoorwaarden teken-flow
    path.startsWith("/mijn-data") ||     // publieke inzage/wis-flow voor kandidaten (AVG art. 15+17)
    path.startsWith("/contract-controle") || // publieke contract-upload door opdrachtgever
    path.startsWith("/kies-datum") ||         // kandidaat kiest datum uit mail
    path.startsWith("/reageer") ||            // GRYWO reply op aanvraag (token)
    path.startsWith("/teken/") ||             // publieke document-tekenflow (token)
    path.startsWith("/api/webhooks") ||       // Stripe webhooks
    path.startsWith("/api/cron");   // cron jobs (eigen secret)
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Beveiligings-checks voor ingelogde users op niet-publieke routes
  if (user && !isPublic && !path.startsWith("/api/")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("rol, abonnement_status, actieve_device_token, laatst_actief_op, tenant_id")
      .eq("id", user.id)
      .single();

    // 1) Setter zonder actief abonnement
    if (profile?.rol === "setter" && profile.abonnement_status !== "actief") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("setter_abonnement", profile.abonnement_status ?? "geen");
      await supabase.auth.signOut();
      return NextResponse.redirect(url);
    }

    // 1b) Bureau-leden (admin/recruiter) zonder actief bureau-abonnement.
    //     Super-admin (Yorith) wordt nooit geblokkeerd.
    const userEmail = user.email ?? "";
    const isSuperUser = userEmail === "yorith@grywo.nl" || userEmail === "yorith@grywo.com";
    if (!isSuperUser && profile?.tenant_id && (profile.rol === "admin" || profile.rol === "recruiter")) {
      const { data: ab } = await supabase
        .from("abonnementen")
        .select("status")
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      if (ab && ab.status !== "actief") {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("bureau_abonnement", ab.status ?? "geen");
        await supabase.auth.signOut();
        return NextResponse.redirect(url);
      }
    }

    // 2) Single-device-policy: cookie noah_device moet matchen profile.actieve_device_token.
    //    Als profile geen token heeft (oude sessie pre-feature) accepteren we de huidige.
    if (profile?.actieve_device_token) {
      const deviceCookie = request.cookies.get("noah_device")?.value;
      if (deviceCookie !== profile.actieve_device_token) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("reden", "ander_apparaat");
        await supabase.auth.signOut();
        return NextResponse.redirect(url);
      }
    }

    // 3) Inactiviteits-uitlog: > 60 minuten geen activiteit = signOut.
    if (profile?.laatst_actief_op) {
      const laatst = new Date(profile.laatst_actief_op).getTime();
      const minutenInactief = (Date.now() - laatst) / (60 * 1000);
      if (minutenInactief > 60) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("reden", "inactiviteit");
        await supabase.auth.signOut();
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
