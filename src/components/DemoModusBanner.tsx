import { Eye, X } from "lucide-react";
import { leesViewAs } from "@/utils/view-as";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { stopDemoModus } from "@/app/dashboard/view-as-actions";

const LABELS: Record<string, string> = {
  admin: "Admin",
  recruiter: "Recruiter",
  setter: "Setter",
};

export async function DemoModusBanner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) return null;

  const viewAs = await leesViewAs();
  if (!viewAs) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-[#ffd84d] via-[#ffd84d] to-[#fbbf24] shadow-md">
      <div className="flex items-center justify-between gap-4 px-4 py-2 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Eye size={16} className="text-[#333399]" />
          <span className="text-sm font-bold text-[#333399]">
            Demo-modus: je bekijkt Noah als {LABELS[viewAs] ?? viewAs}
          </span>
          <span className="hidden sm:inline text-xs text-[#333399]/70">
            (alleen UI — data is echt)
          </span>
        </div>
        <form action={stopDemoModus}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#333399] hover:bg-[#2a2a80] text-white text-xs font-semibold rounded-md transition-colors"
          >
            <X size={12} />
            Terug naar super-admin
          </button>
        </form>
      </div>
    </div>
  );
}
