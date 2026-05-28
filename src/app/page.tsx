import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, MapPin, BadgeCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0f0f23] text-white flex flex-col">
      {/* Gradient achtergrond — paars → donker */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#333399] via-[#1f1f5c] to-[#0f0f23]"
      />
      {/* Subtiele radial highlight bovenin */}
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,216,77,0.25) 0%, rgba(51,51,153,0) 60%)",
        }}
      />

      {/* Header — klein GRYWO logo */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2 text-xs text-white/70">
          <span>Powered by</span>
          <Image
            src="/grywo-logo-wit.png"
            alt="GRYWO"
            width={70}
            height={20}
            className="opacity-90"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Noah is online
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 -mt-12">
        {/* Noah-logo block */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl px-14 py-12 mb-10 flex items-baseline">
          <span className="text-white text-7xl md:text-8xl font-black tracking-tighter">
            noah
          </span>
          <span className="ml-3 w-5 h-5 rounded-full bg-[#ffd84d] inline-block" />
        </div>

        {/* Tagline */}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white text-center mb-3">
          Recruitment op autopilot
        </h1>
        <p className="text-white/60 text-sm md:text-base text-center max-w-md mb-10">
          Het ATS dat het zware werk doet — zodat jouw bureau zich kan
          focussen op plaatsingen.
        </p>

        {/* CTA */}
        <Link
          href="/login"
          className="bg-white hover:bg-white/90 text-[#333399] font-bold px-12 py-4 rounded-xl shadow-lg transition-all hover:shadow-2xl hover:-translate-y-0.5 text-base"
        >
          Inloggen →
        </Link>

        {/* Trust badges */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-3 md:gap-6">
          <TrustBadge icon={<ShieldCheck size={14} />} label="AVG-proof" />
          <TrustBadge icon={<MapPin size={14} />} label="Made in NL" />
          <TrustBadge icon={<BadgeCheck size={14} />} label="ISO-ready" />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-6 text-center text-[11px] text-white/40">
        © {new Date().getFullYear()} OneTwoStart NL B.V. — KvK 96738782
      </footer>
    </main>
  );
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-xs text-white/80">
      <span className="text-[#ffd84d]">{icon}</span>
      {label}
    </div>
  );
}
