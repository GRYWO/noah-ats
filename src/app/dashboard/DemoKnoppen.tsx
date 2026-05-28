import { Eye, UserCog, Send, Phone } from "lucide-react";
import { startDemoModus } from "./view-as-actions";

/**
 * 3 knoppen voor super-admin: bekijk de ATS als admin/recruiter/setter.
 * Verschijnt alleen op /dashboard voor Yorith.
 */
export function DemoKnoppen() {
  return (
    <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Eye size={18} className="text-[#333399]" />
        <h2 className="text-lg font-bold text-gray-800">Demo-modus</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Bekijk de ATS zoals een specifieke rol hem ziet. Handig om snel
        UI-changes te testen zonder uit te loggen.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DemoKnop
          rol="admin"
          icoon={<UserCog size={18} />}
          label="Bekijk als Admin"
          uitleg="Volledige toegang behalve super-admin-functies"
          kleur="bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
        />
        <DemoKnop
          rol="recruiter"
          icoon={<Send size={18} />}
          label="Bekijk als Recruiter"
          uitleg="Kandidaten + voorstellen, geen team-beheer"
          kleur="bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700"
        />
        <DemoKnop
          rol="setter"
          icoon={<Phone size={18} />}
          label="Bekijk als Setter"
          uitleg="Alleen eigen kandidaten + kanban + agenda"
          kleur="bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700"
        />
      </div>

      <p className="text-[11px] text-gray-400 mt-3">
        💡 Gele balk bovenin toont dat je in demo-modus zit. Klik daar op
        &quot;Terug naar super-admin&quot; om weer alles te zien.
      </p>
    </section>
  );
}

function DemoKnop({
  rol,
  icoon,
  label,
  uitleg,
  kleur,
}: {
  rol: "admin" | "recruiter" | "setter";
  icoon: React.ReactNode;
  label: string;
  uitleg: string;
  kleur: string;
}) {
  return (
    <form action={startDemoModus.bind(null, rol)}>
      <button
        type="submit"
        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${kleur}`}
      >
        <div className="flex items-center gap-2 mb-1.5">
          {icoon}
          <span className="font-bold text-sm">{label}</span>
        </div>
        <p className="text-xs opacity-80">{uitleg}</p>
      </button>
    </form>
  );
}
