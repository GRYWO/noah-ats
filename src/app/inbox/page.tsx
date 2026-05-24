import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { fetchAllInboxData, type InboxBericht, type MailMap, type MailDetail } from "@/utils/mail";
import { logout } from "../login/actions";
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
    .select("*")
    .eq("id", user!.id)
    .single();

  const isSuperAdmin = isSuperAdminEmail(user?.email);
  const isSetter = profile?.rol === "setter";

  const admin = createAdminClient();
  const { data: secret } = await admin
    .from("profiles")
    .select("mail_wachtwoord")
    .eq("id", user!.id)
    .single();

  let berichten: InboxBericht[] = [];
  let mappen: MailMap[] = [];
  let geopendeMail: MailDetail | null = null;
  let fetchError: string | null = error ?? null;

  if (profile?.mail_adres && secret?.mail_wachtwoord) {
    try {
      // ÉÉN IMAP-sessie voor mappen + inbox + mail detail (2-3x sneller)
      const result = await fetchAllInboxData({
        mailAdres: profile.mail_adres,
        encryptedPassword: secret.mail_wachtwoord,
        mapPad,
        uid: uid ? parseInt(uid) : undefined,
      });
      mappen = result.mappen;
      berichten = result.berichten;
      geopendeMail = result.mail;
    } catch (e) {
      fetchError = (e as Error).message;
    }
  }

  const isConfigured = profile?.mail_adres && secret?.mail_wachtwoord;
  const huidigeMap = mappen.find(m => m.pad === mapPad) ?? mappen.find(m => m.type === "inbox");

  return (
    <main className="min-h-screen bg-[#f4f4f7]">
      <div className="bg-[#333399] h-16 flex items-center px-6 shadow-md">
        <Link href="/dashboard" className="flex items-baseline">
          <span className="text-white text-3xl font-black tracking-tighter">noah</span>
          <span className="ml-1.5 w-2.5 h-2.5 rounded-full bg-[#ffd84d] inline-block"></span>
        </Link>
        <nav className="ml-8 flex gap-1">
          <Link href="/dashboard" className="text-white/70 hover:text-white px-3 py-1.5 text-sm rounded-md hover:bg-white/10">Dashboard</Link>
          {isSuperAdmin && <Link href="/bureaus" className="text-white/70 hover:text-white px-3 py-1.5 text-sm rounded-md hover:bg-white/10">Bureaus</Link>}
          <Link href="/kandidaten" className="text-white/70 hover:text-white px-3 py-1.5 text-sm rounded-md hover:bg-white/10">Kandidaten</Link>
          <Link href="/kanban" className="text-white/70 hover:text-white px-3 py-1.5 text-sm rounded-md hover:bg-white/10">Kanban</Link>
          <Link href="/inbox" className="text-white bg-white/15 px-3 py-1.5 text-sm rounded-md">E-mail</Link>
          {!isSetter && <Link href="/setters" className="text-white/70 hover:text-white px-3 py-1.5 text-sm rounded-md hover:bg-white/10">Setters</Link>}
          <Link href="/instellingen" className="text-white/70 hover:text-white px-3 py-1.5 text-sm rounded-md hover:bg-white/10">Instellingen</Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-white/90 text-sm">{user?.email}</span>
          <form action={logout}>
            <button className="bg-white/15 hover:bg-white/25 text-white text-sm px-3 py-1.5 rounded-md">Uitloggen</button>
          </form>
        </div>
      </div>

      {!isConfigured ? (
        <div className="p-8 max-w-3xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-4">
            <b>Mailbox nog niet ingesteld.</b><br/>
            Ga naar <Link href="/instellingen" className="text-[#333399] underline">Instellingen</Link>.
          </div>
        </div>
      ) : (
        <InboxClient
          mapPad={mapPad}
          uid={uid}
          berichten={berichten}
          mappen={mappen}
          geopendeMail={geopendeMail}
          fetchError={fetchError}
          huidigeMap={huidigeMap}
          mailAdres={profile?.mail_adres ?? null}
        />
      )}
    </main>
  );
}
