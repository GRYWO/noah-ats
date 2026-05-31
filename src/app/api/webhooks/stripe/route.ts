import { NextResponse } from "next/server";
import { getStripe } from "@/utils/stripe";
import { createAdminClient } from "@/utils/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Webhook secret ontbreekt" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: "Invalid signature: " + (e as Error).message }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        // Update factuur
        await admin.from("facturen").upsert({
          stripe_invoice_id: inv.id,
          abonnement_id: await getAbonnementIdViaCustomer(inv.customer as string),
          tenant_id: await getTenantIdViaCustomer(inv.customer as string),
          factuurnummer: inv.number ?? null,
          bedrag_excl_cent: inv.subtotal,
          btw_cent: ((inv as unknown as { tax?: number }).tax ?? 0),
          totaal_cent: inv.total,
          status: "betaald",
          type: (inv as unknown as { subscription?: unknown }).subscription ? "abonnement" : "setup_fee",
          factuurdatum: inv.created ? new Date(inv.created * 1000).toISOString().slice(0, 10) : null,
          vervaldatum: inv.due_date ? new Date(inv.due_date * 1000).toISOString().slice(0, 10) : null,
          betaald_op: new Date().toISOString(),
          pdf_url: inv.invoice_pdf ?? null,
        }, { onConflict: "stripe_invoice_id" });

        // Setup-fee betaald?
        const ab = await admin.from("abonnementen")
          .select("setup_fee_invoice_id")
          .eq("stripe_customer_id", inv.customer as string)
          .single();
        if (ab.data?.setup_fee_invoice_id === inv.id) {
          await admin.from("abonnementen")
            .update({ setup_fee_betaald: true })
            .eq("stripe_customer_id", inv.customer as string);
        }

        // Reset status naar actief (in geval van wanbetaling-recovery)
        await admin.from("abonnementen").update({
          status: "actief",
          read_only_sinds: null,
          geblokkeerd_sinds: null,
          updated_at: new Date().toISOString(),
        }).eq("stripe_customer_id", inv.customer as string);
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        await admin.from("facturen").upsert({
          stripe_invoice_id: inv.id,
          abonnement_id: await getAbonnementIdViaCustomer(inv.customer as string),
          tenant_id: await getTenantIdViaCustomer(inv.customer as string),
          factuurnummer: inv.number ?? null,
          bedrag_excl_cent: inv.subtotal,
          btw_cent: ((inv as unknown as { tax?: number }).tax ?? 0),
          totaal_cent: inv.total,
          status: "te_laat",
          factuurdatum: inv.created ? new Date(inv.created * 1000).toISOString().slice(0, 10) : null,
          vervaldatum: inv.due_date ? new Date(inv.due_date * 1000).toISOString().slice(0, 10) : null,
        }, { onConflict: "stripe_invoice_id" });

        await admin.from("abonnementen").update({
          status: "achterstallig",
          updated_at: new Date().toISOString(),
        }).eq("stripe_customer_id", inv.customer as string);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription & {
          current_period_start?: number;
          current_period_end?: number;
          items?: { data?: { current_period_start?: number; current_period_end?: number }[] };
        };
        const item0 = sub.items?.data?.[0];
        const pStart = sub.current_period_start ?? item0?.current_period_start;
        const pEinde = sub.current_period_end ?? item0?.current_period_end;
        await admin.from("abonnementen").update({
          huidige_periode_start: pStart ? new Date(pStart * 1000).toISOString() : null,
          huidige_periode_einde: pEinde ? new Date(pEinde * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", sub.id);

        // Setter-abonnement update (type=setter_stoel in metadata)
        const isSetterStoel = (sub.metadata as Record<string, string> | undefined)?.type === "setter_stoel";
        if (isSetterStoel && sub.metadata?.user_id) {
          await admin.from("profiles").update({
            abonnement_status: sub.status === "active" ? "actief"
              : sub.status === "past_due" ? "achterstallig"
              : sub.status === "canceled" ? "opgezegd"
              : "wachtend_betaling",
            stripe_subscription_id: sub.id,
            abonnement_actief_sinds: sub.status === "active" ? new Date().toISOString() : null,
          }).eq("id", sub.metadata.user_id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await admin.from("abonnementen").update({
          status: "geblokkeerd",
          beeindigd_op: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", sub.id);

        // Setter-abonnement opgezegd
        const isSetterStoel = (sub.metadata as Record<string, string> | undefined)?.type === "setter_stoel";
        if (isSetterStoel && sub.metadata?.user_id) {
          await admin.from("profiles").update({
            abonnement_status: "opgezegd",
            abonnement_opgezegd_op: new Date().toISOString(),
          }).eq("id", sub.metadata.user_id);
        }
        break;
      }

      // Setter heeft betaald in Stripe Checkout → unlock + welkomstmail
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = (session.metadata ?? {}) as Record<string, string>;
        if (meta.type === "setter_stoel" && meta.user_id) {
          // Setter-stoel betaald → activeer + welkomstmail met inloggegevens
          const { randomBytes } = await import("crypto");
          const { sendWelkomstmailUser } = await import("@/utils/email");
          const nieuwWachtwoord = randomBytes(6).toString("base64").replace(/[+/=]/g, "").slice(0, 10) + "1!";

          // Wachtwoord resetten en activeren
          await admin.auth.admin.updateUserById(meta.user_id, { password: nieuwWachtwoord });
          await admin.from("profiles").update({
            abonnement_status: "actief",
            abonnement_actief_sinds: new Date().toISOString(),
            stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
          }).eq("id", meta.user_id);

          // Welkomstmail met inloggegevens
          const { data: profile } = await admin
            .from("profiles")
            .select("voornaam, mail_adres, tenants(naam)")
            .eq("id", meta.user_id)
            .single();
          const { data: authUser } = await admin.auth.admin.getUserById(meta.user_id);
          const email = authUser?.user?.email ?? profile?.mail_adres;
          const tenants = Array.isArray(profile?.tenants) ? profile?.tenants[0] : profile?.tenants;

          if (email) {
            try {
              await sendWelkomstmailUser({
                naar: email,
                voornaam: profile?.voornaam ?? "",
                email,
                wachtwoord: nieuwWachtwoord,
                rolLabel: "Setter",
                bedrijf: tenants?.naam ?? "Noah ATS",
              });
            } catch (e) {
              console.error("Welkomstmail setter mislukt:", e);
            }
          }
        }

        // Bureau-abonnement betaald via Checkout → activeer
        if (meta.type === "bureau_abonnement" && meta.tenant_id) {
          const subId = typeof session.subscription === "string" ? session.subscription : null;
          await admin.from("abonnementen").update({
            status: "actief",
            stripe_subscription_id: subId,
            setup_fee_betaald: true,
            updated_at: new Date().toISOString(),
          }).eq("tenant_id", meta.tenant_id);

          // Markeer bureau ook als setup_fee_paid (legacy veld)
          await admin.from("tenants").update({
            setup_fee_paid: true,
          }).eq("id", meta.tenant_id);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[stripe-webhook]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

async function getAbonnementIdViaCustomer(customerId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("abonnementen")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data?.id ?? null;
}

async function getTenantIdViaCustomer(customerId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("abonnementen")
    .select("tenant_id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data?.tenant_id ?? null;
}
