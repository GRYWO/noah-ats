import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { ComposeForm } from "./ComposeForm";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ reply_to?: string; subject?: string; error?: string }>;
}) {
  const { reply_to, subject, error } = await searchParams;

  // We laden de HTML-handtekening direct uit profiles.handtekening_html en
  // geven hem ongewijzigd door aan de RichTextEditor. De editor toont 'm
  // dan met logo-wordmark, kleuren en lay-out zoals in de mail zelf.
  let defaultHandtekeningHtml = "";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("handtekening_html")
      .eq("id", user.id)
      .single();
    defaultHandtekeningHtml = profile?.handtekening_html ?? "";
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="inbox" />

      <div className="p-8 max-w-3xl mx-auto">
        <Link href="/inbox" className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-block">
          Terug naar inbox
        </Link>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <ComposeForm
          defaultNaar={reply_to ?? ""}
          defaultOnderwerp={subject ?? ""}
          defaultHandtekeningHtml={defaultHandtekeningHtml}
        />
      </div>
    </main>
  );
}
