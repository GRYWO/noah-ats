import webpush from "web-push";
import { createAdminClient } from "@/utils/supabase/admin";

// VAPID keys uit env vars
const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:yorith@grywo.nl";

let geconfigureerd = false;
function init() {
  if (geconfigureerd) return;
  if (!PUBLIC || !PRIVATE) return;
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  geconfigureerd = true;
}

/**
 * Push een notificatie naar één gebruiker (alle apparaten).
 * Verwijdert subscriptions die door de browser worden afgewezen (404/410).
 */
export async function stuurPushNaarUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<{ verstuurd: number; verwijderd: number }> {
  init();
  if (!geconfigureerd) {
    console.warn("[push] VAPID niet geconfigureerd — push overgeslagen");
    return { verstuurd: 0, verwijderd: 0 };
  }

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  let verstuurd = 0;
  let verwijderd = 0;

  await Promise.allSettled(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          JSON.stringify(payload)
        );
        verstuurd++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          // Subscription is verlopen → verwijderen
          await admin.from("push_subscriptions").delete().eq("id", s.id);
          verwijderd++;
        } else {
          console.error("[push] fout bij sturen:", err);
        }
      }
    })
  );

  return { verstuurd, verwijderd };
}
