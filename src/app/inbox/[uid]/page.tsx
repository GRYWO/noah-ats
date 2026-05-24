import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { fetchMailDetail } from "@/utils/mail";
import { TopBar } from "@/components/TopBar";

export const revalidate = 0;

export default async function MailDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ map?: string }>;
}) {
  const { uid } = await params;
  const { map: mapPad = "INBOX" } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("mail_adres")
    .eq("id", user!.id)
    .single();

  const admin = createAdminClient();
  const { data: secret } = await admin
    .from("profiles")
    .select("mail_wachtwoord")
    .eq("id", user!.id)
    .single();

  if (!profile?.mail_adres || !secret?.mail_wachtwoord) notFound();

  let mail = null;
  let fetchError: string | null = null;
  try {
    mail = await fetchMailDetail(profile.mail_adres, secret.mail_wachtwoord, parseInt(uid), mapPad);
  } catch (e) {
    fetchError = (e as Error).message;
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="inbox" />

      <div className="p-8 max-w-4xl mx-auto">
        <Link href={`/inbox?map=${encodeURIComponent(mapPad)}`} className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-block">
          ← Terug
        </Link>

        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-4">
            {fetchError}
          </div>
        )}

        {mail && (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">{mail.onderwerp}</h1>
            <div className="text-sm text-gray-500 mb-6 pb-4 border-b">
              <div><b>Van:</b> {mail.van}</div>
              <div><b>Aan:</b> {mail.naar}</div>
              <div><b>Datum:</b> {new Date(mail.datum).toLocaleString("nl-NL")}</div>
            </div>

            {mail.html ? (
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: mail.html }} />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{mail.tekst}</pre>
            )}

            <div className="mt-6 pt-4 border-t flex gap-3">
              <Link
                href={`/inbox/compose?reply_to=${encodeURIComponent(mail.van)}&subject=${encodeURIComponent("Re: " + mail.onderwerp)}`}
                className="bg-[#333399] hover:bg-[#2a2a80] text-white text-sm px-4 py-2 rounded-md"
              >
                Beantwoorden
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
