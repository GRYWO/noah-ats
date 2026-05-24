import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const mapPad = url.searchParams.get("map") ?? "INBOX";

  const { data } = await supabase
    .from("mail_berichten")
    .select("naam, van, onderwerp, datum")
    .eq("user_id", user.id)
    .eq("map_pad", mapPad)
    .order("datum", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json(data ?? {});
}
