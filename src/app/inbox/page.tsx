import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { TopBar } from "@/components/TopBar";
import { fetchAllInboxData, type InboxBericht, type MailMap, type MailDetail } from "@/utils/mail";
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
      <TopBar active="inbox" />

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
