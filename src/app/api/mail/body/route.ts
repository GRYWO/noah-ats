import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { laadMailBody } from "@/utils/mail-sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const mapPad = url.searchParams.get("map");
  const uidStr = url.searchParams.get("uid");

  if (!mapPad || !uidStr) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    const result = await laadMailBody(user.id, mapPad, parseInt(uidStr));
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
