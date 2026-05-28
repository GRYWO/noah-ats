"use client";

import { useState, useTransition } from "react";
import { Loader2, ShieldCheck, ShieldOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { startMfaEnroll, verifyMfaEnroll, disableMfa } from "./mfa-actions";

type ActieveFactor = { id: string; friendly_name: string | null; created_at: string };

export function MfaSectie({ actieveFactor }: { actieveFactor: ActieveFactor | null }) {
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [, startTransition] = useTransition();

  async function start() {
    setFout(null);
    setBezig(true);
    startTransition(async () => {
      const r = await startMfaEnroll();
      setBezig(false);
      if (r.error) {
        setFout(r.error);
        return;
      }
      setFactorId(r.factorId!);
      setQrCode(r.qrCode!);
      setSecret(r.secret!);
      setEnrolling(true);
    });
  }

  async function bevestig(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setFout(null);
    setBezig(true);
    const fd = new FormData();
    fd.set("factor_id", factorId);
    fd.set("code", code);
    startTransition(async () => {
      const r = await verifyMfaEnroll(fd);
      setBezig(false);
      if (r.error) {
        setFout(r.error);
        return;
      }
      setEnrolled(true);
      setEnrolling(false);
      // Refresh page om factor te tonen
      window.location.reload();
    });
  }

  async function uitschakelen(factorId: string) {
    if (!confirm("Weet je zeker dat je 2FA wilt uitschakelen? Je account is dan minder beveiligd.")) return;
    setBezig(true);
    const fd = new FormData();
    fd.set("factor_id", factorId);
    startTransition(async () => {
      const r = await disableMfa(fd);
      setBezig(false);
      if (r.error) { setFout(r.error); return; }
      window.location.reload();
    });
  }

  // Status: al MFA actief?
  if (actieveFactor) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-gray-800 inline-flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" /> Tweestapsverificatie actief
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Geactiveerd op {new Date(actieveFactor.created_at).toLocaleDateString("nl-NL")}
              {actieveFactor.friendly_name && ` · ${actieveFactor.friendly_name}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => uitschakelen(actieveFactor.id)}
            disabled={bezig}
            className="text-sm text-red-600 hover:bg-red-50 border border-red-200 font-semibold px-4 py-2 rounded-md inline-flex items-center gap-1.5"
          >
            {bezig ? <Loader2 size={13} className="animate-spin" /> : <ShieldOff size={13} />}
            2FA uitschakelen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h2 className="font-bold text-gray-800 inline-flex items-center gap-2 mb-1">
        <ShieldCheck size={16} className="text-[#333399]" /> Tweestapsverificatie (2FA)
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Extra beveiligingslaag voor je account. Bij elke login vraag je naast je wachtwoord ook een 6-cijferige code uit je authenticator-app.
      </p>

      {!enrolling && !enrolled && (
        <button
          type="button"
          onClick={start}
          disabled={bezig}
          className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2 rounded-md text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          {bezig ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
          2FA inschakelen
        </button>
      )}

      {enrolling && (
        <form onSubmit={bevestig} className="bg-[#eef0ff] border border-[#d4d7f5] rounded-lg p-5">
          <h3 className="font-bold text-[#333399] mb-3">Stap 1 — Scan deze QR-code</h3>
          <p className="text-sm text-gray-700 mb-3">
            Open een authenticator-app (Google Authenticator, 1Password, Authy, Microsoft Authenticator) en scan de QR-code.
          </p>

          {qrCode && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCode} alt="QR code" className="bg-white p-3 rounded-md inline-block mb-3" />
          )}

          {secret && (
            <div className="mb-4 text-xs">
              <div className="text-gray-600 mb-1">Of voer dit handmatig in:</div>
              <code className="bg-white border border-gray-300 rounded px-2 py-1 font-mono text-gray-800">{secret}</code>
            </div>
          )}

          <h3 className="font-bold text-[#333399] mb-2">Stap 2 — Voer de code in</h3>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            className="px-4 py-3 border border-gray-300 rounded-md text-xl tracking-widest text-center font-mono w-40 mb-3 block"
          />

          {fout && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-2 mb-3 inline-flex items-center gap-1.5">
              <AlertCircle size={13} /> {fout}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={bezig || code.length !== 6}
              className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2 rounded-md text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {bezig ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Activeer 2FA
            </button>
            <button
              type="button"
              onClick={() => { setEnrolling(false); setCode(""); setFout(null); }}
              className="text-sm text-gray-600 hover:underline px-3"
            >
              Annuleer
            </button>
          </div>
        </form>
      )}

      {!enrolling && fout && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-2 inline-flex items-center gap-1.5">
          <AlertCircle size={13} /> {fout}
        </div>
      )}
    </div>
  );
}
