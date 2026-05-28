"use client";

import { useState, useTransition } from "react";
import { Loader2, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { vraagInzageLink } from "./actions";

export function MijnDataForm() {
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [succes, setSucces] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    setBezig(true);
    const fd = new FormData();
    fd.set("email", email);
    startTransition(async () => {
      const r = await vraagInzageLink(fd);
      setBezig(false);
      if (r?.error) {
        setFout(r.error);
        return;
      }
      setSucces(true);
    });
  }

  if (succes) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-emerald-900 text-sm">
        <div className="inline-flex items-center gap-2 font-bold mb-1">
          <CheckCircle2 size={18} className="text-emerald-600" />
          Check je inbox
        </div>
        <p>
          Als <b>{email}</b> bij ons bekend is, ontvang je binnen een paar minuten een mail met je persoonlijke inzage-link.
          De link is 1 uur geldig.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">E-mailadres</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="jouw@email.nl"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:border-[#333399]"
        />
      </div>
      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3 inline-flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {fout}
        </div>
      )}
      <button
        type="submit"
        disabled={bezig}
        className="w-full bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold py-3 rounded-lg inline-flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {bezig ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        Verstuur inzage-link
      </button>
    </form>
  );
}
