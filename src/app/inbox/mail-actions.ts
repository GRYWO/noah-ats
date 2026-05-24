"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ImapFlow } from "imapflow";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { decrypt } from "@/utils/crypto";

async function getImapForUser(userId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("mail_adres")
    .eq("id", userId)
    .single();

  const admin = createAdminClient();
  const { data: secret } = await admin
    .from("profiles")
    .select("mail_wachtwoord")
    .eq("id", userId)
    .single();

  if (!profile?.mail_adres || !secret?.mail_wachtwoord) {
    throw new Error("Mailbox niet ingesteld");
  }

  return new ImapFlow({
    host: process.env.HOSTNET_IMAP_HOST ?? "imap.hostnet.nl",
    port: parseInt(process.env.HOSTNET_IMAP_PORT ?? "993"),
    secure: true,
    auth: { user: profile.mail_adres, pass: decrypt(secret.mail_wachtwoord) },
    logger: false,
  });
}

export async function mailVerwijderen(formData: FormData) {
  const uid = parseInt(formData.get("uid") as string);
  const mapPad = formData.get("map_pad") as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const client = await getImapForUser(user.id);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(mapPad);
    try {
      // Verplaats naar Prullenbak (zoek de trash map)
      const list = await client.list();
      const trash = list.find(m => m.specialUse === "\\Trash") ?? list.find(m => m.path.toLowerCase().includes("trash") || m.path.toLowerCase().includes("prullen"));

      if (trash && mapPad !== trash.path) {
        await client.messageMove(String(uid), trash.path, { uid: true });
      } else {
        // Al in trash: hard delete
        await client.messageDelete(String(uid), { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  revalidatePath("/inbox");
  redirect(`/inbox?map=${encodeURIComponent(mapPad)}`);
}

export async function mailVerplaatsen(formData: FormData) {
  const uid = parseInt(formData.get("uid") as string);
  const vanMap = formData.get("van_map") as string;
  const naarMap = formData.get("naar_map") as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const client = await getImapForUser(user.id);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(vanMap);
    try {
      await client.messageMove(String(uid), naarMap, { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  revalidatePath("/inbox");
  redirect(`/inbox?map=${encodeURIComponent(vanMap)}`);
}

export async function mailFlagToggle(formData: FormData) {
  const uid = parseInt(formData.get("uid") as string);
  const mapPad = formData.get("map_pad") as string;
  const huidigeFlag = formData.get("gevlagd") === "true";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const client = await getImapForUser(user.id);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(mapPad);
    try {
      if (huidigeFlag) {
        await client.messageFlagsRemove(String(uid), ["\\Flagged"], { uid: true });
      } else {
        await client.messageFlagsAdd(String(uid), ["\\Flagged"], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  revalidatePath("/inbox");
  redirect(`/inbox?map=${encodeURIComponent(mapPad)}&uid=${uid}`);
}

export async function mailOngelezen(formData: FormData) {
  const uid = parseInt(formData.get("uid") as string);
  const mapPad = formData.get("map_pad") as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const client = await getImapForUser(user.id);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(mapPad);
    try {
      await client.messageFlagsRemove(String(uid), ["\\Seen"], { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  revalidatePath("/inbox");
  redirect(`/inbox?map=${encodeURIComponent(mapPad)}`);
}
