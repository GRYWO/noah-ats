import Link from "next/link";
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

      {/* Header — Powered by Noah launch */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <a
          href="https://noah-launch.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-baseline gap-2 text-xs text-white/70 hover:text-white transition"
        >
          <span>Powered by</span>
          <span className="text-base font-extrabold tracking-tight text-white">
            Noah<span style={{ color: "#ffd84d" }}>.</span>
            <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/70">launch</span>
          </span>
        </a>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Noah is online
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 -mt-12">
        {/* Noah ATS logo block */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl px-14 py-12 mb-10 flex items-baseline gap-3">
          <span className="text-white text-7xl md:text-8xl font-black tracking-tighter">
            Noah<span className="text-[#ffd84d]">.</span>
          </span>
          <span className="text-white/80 text-sm md:text-base font-semibold uppercase tracking-[0.35em]">ATS</span>
        </div>

        {/* Tagline */}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white text-center mb-3">
          Recruitment op autopilot
        </h1>
        <p className="text-white/70 text-base md:text-lg text-center max-w-lg mb-10 font-light tracking-wide">
          De toekomst zit hier. <span className="text-white font-medium">AI-gedreven ATS.</span>
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
