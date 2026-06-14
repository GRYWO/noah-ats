import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";

export const dynamic = "force-dynamic";

/**
 * Debug-endpoint: stuurt een test-mail naar je eigen account en geeft de
 * volledige Resend-response terug zodat je ziet wat er fout gaat.
 * Alleen voor super-admin.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Alleen super-admin" }, { status: 403 });
  }

  const url = new URL(request.url);
  const naar = url.searchParams.get("naar") ?? user.email!;
  const from = url.searchParams.get("from") ?? "Noah <noreply@noah-recruitment.nl>";

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      diagnose: "RESEND_API_KEY ontbreekt in Vercel env-vars",
      stap: "Ga naar Vercel → Settings → Environment Variables → voeg RESEND_API_KEY toe",
    });
  }

  const resend = new Resend(apiKey);
  let response: unknown = null;
  let error: unknown = null;

  try {
    response = await resend.emails.send({
      from,
      to: naar,
      subject: "Noah ATS test-mail",
      html: `<p>Dit is een test-mail vanuit Noah ATS.</p><p>Tijd: ${new Date().toISOString()}</p>`,
    });
  } catch (e) {
    error = (e as Error).message;
  }

  return NextResponse.json({
    ok: !error,
    from,
    naar,
    apiKeyAanwezig: true, // geen lengte/prefix van het geheim lekken
    resendResponse: response,
    error,
    diagnose: error
      ? "Resend gaf een error — zie 'error' veld"
      : (response as { error?: unknown })?.error
        ? "Resend weigerde de mail — zie 'resendResponse.error'"
        : "Mail is volgens Resend geaccepteerd. Check Resend dashboard → Emails voor delivery-status (kan in spam belanden).",
  });
}
