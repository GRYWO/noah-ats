import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { ArrowLeft } from "lucide-react";
import { NieuwDocumentForm } from "./NieuwDocumentForm";

export default async function NieuwDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdminEmail(user?.email)) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="dashboard" />

      <div className="p-8 max-w-3xl mx-auto">
        <Link href="/documenten" className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Terug naar documenten
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">Nieuw document</h1>
        <p className="text-gray-500 text-sm mb-6">
          Upload PDF + voeg ondertekenaars toe. Iedereen krijgt parallel een mail.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <NieuwDocumentForm />
      </div>
    </main>
  );
}
