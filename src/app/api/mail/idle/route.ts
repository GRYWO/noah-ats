import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { decrypt } from "@/utils/crypto";
import { syncMailsVoorUser } from "@/utils/mail-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min max (Vercel Hobby limit)

/**
 * SSE endpoint: open IMAP IDLE en push event als nieuwe mail binnenkomt.
 * Houdt verbinding open tot ~5 min, dan moet client zelf reconnecten.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("mail_adres, mail_wachtwoord")
    .eq("id", user.id)
    .single();

  if (!profile?.mail_adres || !profile.mail_wachtwoord) {
    return new Response("Mail niet geconfigureerd", { status: 400 });
  }

  const encoder = new TextEncoder();
  const userId = user.id;
  const mailAdres = profile.mail_adres;
  const wachtwoord = profile.mail_wachtwoord;

  const stream = new ReadableStream({
    async start(controller) {
      let client: ImapFlow | null = null;
      let closed = false;

      const sendEvent = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      try {
        client = new ImapFlow({
          host: process.env.HOSTNET_IMAP_HOST ?? "imap.hostnet.nl",
          port: parseInt(process.env.HOSTNET_IMAP_PORT ?? "993"),
          secure: true,
          auth: { user: mailAdres, pass: decrypt(wachtwoord) },
          logger: false,
        });

        await client.connect();
        sendEvent({ type: "connected" });

        const lock = await client.getMailboxLock("INBOX");

        // Listen voor nieuwe mails
        client.on("exists", async () => {
          try {
            await syncMailsVoorUser(userId, 5); // alleen laatste 5 nieuwe
            sendEvent({ type: "new-mail" });
          } catch {}
        });

        // Keepalive heartbeat (elke 30s noop om timeout te vermijden)
        const keepalive = setInterval(() => {
          if (!closed) sendEvent({ type: "ping", t: Date.now() });
        }, 30_000);

        // Houd verbinding open tot maxDuration
        await new Promise((resolve) => setTimeout(resolve, 280_000));

        clearInterval(keepalive);
        lock.release();
      } catch (e) {
        sendEvent({ type: "error", message: (e as Error).message });
      } finally {
        if (client) await client.logout().catch(() => {});
        closed = true;
        try { controller.close(); } catch {}
      }
    },

    cancel() {
      // Client gesloten verbinding
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// Suppress unused import warning
void NextResponse;
