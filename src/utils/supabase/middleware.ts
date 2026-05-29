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

  return supabaseResponse;
}
