import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { InboxClient } from "./InboxClient";
import { ensureMailAccountForUser } from "@/utils/mail-auto-link";

export const revalidate = 0;

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ map?: string; uid?: string; error?: string; account?: string }>;
}) {
  const { map: mapPad = "INBOX", uid, error, account: accountParam } = await searchParams;
  const berichtenLimit = 50;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Auto-koppel mailbox uit profiel als die er nog niet is (legacy setters)
  if (user?.id) await ensureMailAccountForUser(user.id);

  // Haal alle mail-accounts van user
  const { data: accounts } = await supabase
    .from("mail_accounts")
    .select("*")
    .eq("user_id", user!.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (!accounts || accounts.length === 0) {
    return (
      <main className="min-h-screen bg-[#f4f4f7] pl-16">
        <TopBar active="inbox" />
        <div className="p-8 max-w-3xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-4">
            <b>Nog geen mailbox ingesteld.</b><br/>
            Ga naar <Link href="/instellingen" className="text-[#333399] underline">Instellingen</Link>.
          </div>
        </div>
      </main>
    );
  }

  // Active account: uit URL of primary
  const activeAccount = accounts.find(a => a.id === accountParam) ?? accounts[0];

  // Lees uit Supabase voor dit account
  const [mappenRes, berichtenRes] = await Promise.all([
    supabase
      .from("mail_mappen")
      .select("*")
      .eq("account_id", activeAccount.id)
      .order("type", { ascending: true }),
    supabase
      .from("mail_berichten")
      .select("id, uid, van, naam, onderwerp, datum, gelezen, gevlagd, thread_id")
      .eq("account_id", activeAccount.id)
      .eq("map_pad", mapPad)
      .order("datum", { ascending: false })
      .limit(berichtenLimit + 150),
  ]);

  const mappen = (mappenRes.data ?? []).map(m => ({
    pad: m.pad,
    label: m.label,
    aantal: m.aantal ?? 0,
    ongelezen: m.ongelezen ?? 0,
    type: m.type as "inbox" | "sent" | "drafts" | "trash" | "spam" | "ander",
  }));

  // BELANGRIJK: bepaal of de mappen-tabel echt leeg is VOORDAT we de
  // INBOX-fallback toevoegen. Anders is isLeeg na de unshift altijd
  // false en triggert de initiele sync in InboxClient nooit voor een
  // verse mailbox.
  const dbMappenLeeg = mappen.length === 0;

  // FALLBACK: als de inbox-row ontbreekt in mail_mappen (bv. doordat sync
  // 'm nog niet ontdekt heeft of de row per ongeluk weg is) voegen we 'm
  // hier client-side toe. Anders kan de gebruiker zijn Postvak IN
  // niet meer aanklikken in het zijmenu.
  if (!mappen.some(m => m.type === "inbox")) {
    mappen.unshift({
      pad: "INBOX",
      label: "Postvak IN",
      aantal: 0,
      ongelezen: 0,
      type: "inbox",
    });
  }

  const volgorde: Record<string, number> = { inbox: 1, sent: 2, drafts: 3, spam: 4, trash: 5, ander: 6 };
  mappen.sort((a, b) => (volgorde[a.type] ?? 9) - (volgorde[b.type] ?? 9) || a.label.localeCompare(b.label));

  // Groepeer op thread_id zodat een antwoord-keten als 1 lijst-item verschijnt.
  // We halen extra rows op (berichtenLimit + 150) zodat threads waarvan de
  // nieuwste mail uit de top 50 valt, alsnog tot 1 entry samenklappen op
  // basis van oudere berichten in dezelfde thread. Per thread tonen we de
  // nieuwste mail (server-side al gesorteerd op datum desc) en houden we
  // het aantal mails in de thread bij voor de UI-badge. Daarna slicen we
  // tot berichtenLimit en behouden de query-volgorde (datum desc).
  const ruweBerichten = berichtenRes.data ?? [];
  type RuwBericht = (typeof ruweBerichten)[number];
  const perThread = new Map<string, RuwBericht & { threadCount: number }>();
  for (const m of ruweBerichten) {
    const k = m.thread_id ?? `__uid_${m.uid}`;
    const bestaand = perThread.get(k);
    if (!bestaand) {
      perThread.set(k, { ...m, threadCount: 1 });
    } else {
      bestaand.threadCount++;
    }
  }
  const berichten = Array.from(perThread.values())
    .slice(0, berichtenLimit)
    .map(b => ({
      uid: b.uid,
      van: b.van ?? "?",
      naam: b.naam ?? b.van ?? "?",
      onderwerp: b.onderwerp ?? "(geen onderwerp)",
      datum: b.datum,
      gelezen: b.gelezen ?? false,
      preview: "",
      threadCount: b.threadCount,
    }));

  // Mail detail
  let geopendeMail = null;
  if (uid) {
    const { data: mail } = await supabase
      .from("mail_berichten")
      .select("*")
      .eq("account_id", activeAccount.id)
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
        gevlagd: mail.gevlagd ?? false,
      };
    }
  }

  const huidigeMap = mappen.find(m => m.pad === mapPad) ?? mappen.find(m => m.type === "inbox");
  // isLeeg verwijst naar de echte DB-staat, niet naar de array NA de
  // INBOX-fallback. Zo vuurt de initiele /api/mail/sync-trigger in
  // InboxClient wel correct af voor een verse mailbox.
  const isLeeg = dbMappenLeeg;

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="inbox" />
      <InboxClient
        userId={user!.id}
        accountId={activeAccount.id}
        accounts={accounts.map(a => ({ id: a.id, mail_adres: a.mail_adres, display_naam: a.display_naam, is_primary: a.is_primary }))}
        mapPad={mapPad}
        uid={uid}
        berichten={berichten}
        mappen={mappen}
        geopendeMail={geopendeMail}
        fetchError={error ?? null}
        huidigeMap={huidigeMap}
        mailAdres={activeAccount.mail_adres ?? null}
        isLeeg={isLeeg}
      />
    </main>
  );
}
