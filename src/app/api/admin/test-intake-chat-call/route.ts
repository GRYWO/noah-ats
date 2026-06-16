import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Alleen super-admin" }, { status: 403 });
  }

  const payload = {
    messages: [
      { role: "assistant", content: "Hoi, ik ben Noah. Wat is je naam?" },
      { role: "user", content: "Mijn naam is Test Kandidaat" },
    ],
    cvContext: null,
  };

  const r = await fetch("https://www.noah-recruitment.nl/api/intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const tekst = await r.text();
  let parsed: unknown = tekst;
  try { parsed = JSON.parse(tekst); } catch { /* keep tekst */ }
  return NextResponse.json({ status: r.status, response: parsed });
}
