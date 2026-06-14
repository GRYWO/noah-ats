import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { ComposeForm } from "./ComposeForm";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ reply_to?: string; subject?: string; error?: string }>;
}) {
  const { reply_to, subject, error } = await searchParams;

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="inbox" />

      <div className="p-8 max-w-3xl mx-auto">
        <Link href="/inbox" className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-block">
          Terug naar inbox
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mb-6">Nieuwe mail</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <ComposeForm defaultNaar={reply_to ?? ""} defaultOnderwerp={subject ?? ""} />
      </div>
    </main>
  );
}
