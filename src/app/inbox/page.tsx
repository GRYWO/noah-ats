import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { InboxClient } from "./InboxClient";

export const revalidate = 0;

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ map?: string; uid?: string; error?: string }>;
}) {
  const { map: mapPad = "INBOX", uid, error } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("mail_adres, mail_wachtwoord")
    .eq("id", user!.id)
    .single();

  const isConfigured = !!(profile?.mail_adres && profile?.mail_wachtwoord);

  if (!isConfigured) {
    return (
      <main className="min-h-screen bg-[#f4f4f7]">
        <TopBar active="inbox" />
        <div className="p-8 max-w-3xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-4">
            <b>Mailbox nog niet ingesteld.</b><br/>
            Ga naar <Link href="/instellingen" className="text-[#333399] underline">Instellingen</Link>.
          </div>
        </div>
      </main>
    );
  }

  // Lees uit Supabase — instant
  const [mappenRes, berichtenRes] = await Promise.all([
    supabase
      .from("mail_mappen")
      .select("*")
      .eq("user_id", user!.id)
      .order("type", { ascending: true }),
    supabase
      .from("mail_berichten")
      .select("id, uid, van, naam, onderwerp, datum, gelezen, gevlagd")
      .eq("user_id", user!.id)
      .eq("map_pad", mapPad)
      .order("datum", { ascending: false })
      .limit(50),
  ]);

  const mappen = (mappenRes.data ?? []).map(m => ({
    pad: m.pad,
    label: m.label,
    aantal: m.aantal ?? 0,
    ongelezen: m.ongelezen ?? 0,
    type: m.type as "inbox" | "sent" | "drafts" | "trash" | "spam" | "ander",
  }));

  const volgorde: Record<string, number> = { inbox: 1, sent: 2, drafts: 3, spam: 4, trash: 5, ander: 6 };
  mappen.sort((a, b) => (volgorde[a.type] ?? 9) - (volgorde[b.type] ?? 9) || a.label.localeCompare(b.label));

  const berichten = (berichtenRes.data ?? []).map(b => ({
    uid: b.uid,
    van: b.van ?? "?",
    naam: b.naam ?? b.van ?? "?",
    onderwerp: b.onderwerp ?? "(geen onderwerp)",
    datum: b.datum,
    gelezen: b.gelezen ?? false,
    preview: "",
  }));

  // Optioneel: mail detail
  let geopendeMail = null;
  if (uid) {
    const { data: mail } = await supabase
      .from("mail_berichten")
      .select("*")
      .eq("user_id", user!.id)
      .eq("map_pad", mapPad)
      .eq("uid", parseInt(uid))
      .single();

    if (mail) {
      geopendeMail = {
        uid: mail.uid,
        van: mail.van ?? "?",
        naar: mail.naar ?? "?",
        onderwerp: mail.onderwerp ?? "(geen onderwerp)",
        datum: mail.datum,
        html: mail.html as string | null,
        tekst: mail.tekst as string | null,
        body_loaded: mail.body_loaded ?? false,
      };
    }
  }

  const huidigeMap = mappen.find(m => m.pad === mapPad) ?? mappen.find(m => m.type === "inbox");
  const isLeeg = mappen.length === 0;

  return (
    <main className="min-h-screen bg-[#f4f4f7]">
      <TopBar active="inbox" />
      <InboxClient
        userId={user!.id}
        mapPad={mapPad}
        uid={uid}
        berichten={berichten}
        mappen={mappen}
        geopendeMail={geopendeMail}
        fetchError={error ?? null}
        huidigeMap={huidigeMap}
        mailAdres={profile?.mail_adres ?? null}
        isLeeg={isLeeg}
      />
    </main>
  );
}
