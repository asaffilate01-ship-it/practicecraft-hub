import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const stripeApiVersion = "2025-08-27.basil";

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalisePlanCode(value: unknown): "starter" | "pro" | "enterprise" | null {
  if (value === "professional") return "pro";
  if (value === "starter" || value === "pro" || value === "enterprise") return value;
  return null;
}

async function claimEvent(admin: ReturnType<typeof createClient>, event: Stripe.Event): Promise<boolean> {
  const { data, error } = await admin.rpc("claim_stripe_webhook_event", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_livemode: event.livemode,
  });
  if (error) throw error;
  return data === true;
}

async function markEvent(
  admin: ReturnType<typeof createClient>,
  eventId: string,
  status: "processed" | "failed",
  lastError: string | null,
): Promise<void> {
  await admin
    .from("stripe_webhook_events")
    .update({
      status,
      last_error: lastError,
      processed_at: status === "processed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);
}

async function recordInvoicePayment(
  admin: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const invoiceId = session.metadata?.invoice_id;
  const tenantId = session.metadata?.tenant_id;
  if (!invoiceId || !tenantId || session.payment_status !== "paid") return;

  const { data: invoice } = await admin
    .from("invoices")
    .select("id,tenant_id,total,amount_paid,status")
    .eq("id", invoiceId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!invoice || invoice.status === "paid") return;

  const expectedPence = Math.round((Number(invoice.total) - Number(invoice.amount_paid || 0)) * 100);
  const metadataPence = Number(session.metadata?.amount_pence || 0);
  if (session.currency !== "gbp" || session.amount_total !== expectedPence || metadataPence !== expectedPence) {
    throw new Error(`Invoice payment amount mismatch for ${invoiceId}`);
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id || null;
  const { error } = await admin
    .from("invoices")
    .update({
      status: "paid",
      amount_paid: invoice.total,
      paid_at: new Date().toISOString(),
      payment_method: "stripe",
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("tenant_id", tenantId)
    .neq("status", "paid");
  if (error) throw error;

  await admin.from("audit_log").insert({
    tenant_id: tenantId,
    action: "payment_received",
    entity_name: "invoice",
    entity_id: invoiceId,
    after_json: {
      amount: invoice.total,
      stripe_event_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
    },
  });
}

async function applySubscriptionCheckout(
  stripe: Stripe,
  admin: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const tenantId = session.metadata?.tenant_id;
  const planCode = normalisePlanCode(session.metadata?.plan_code);
  if (!tenantId || !planCode || !session.subscription) return;

  const { data: tenant } = await admin
    .from("tenants")
    .select("id,stripe_customer_id")
    .eq("id", tenantId)
    .maybeSingle();
  const sessionCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;
  if (!tenant || !sessionCustomerId || tenant.stripe_customer_id !== sessionCustomerId) {
    throw new Error(`Subscription customer mismatch for tenant ${tenantId}`);
  }

  const { data: plan } = await admin.from("subscription_plans").select("id").eq("code", planCode).maybeSingle();
  if (!plan) throw new Error(`Unknown subscription plan ${planCode}`);

  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemPeriodEnd = subscription.items.data[0]?.current_period_end;
  const periodEnd = itemPeriodEnd ? new Date(itemPeriodEnd * 1000).toISOString() : new Date().toISOString();

  const { error } = await admin
    .from("tenant_subscriptions")
    .update({
      plan_id: plan.id,
      status: subscription.status === "active" || subscription.status === "trialing" ? "active" : "past_due",
      stripe_customer_id: sessionCustomerId,
      stripe_subscription_id: subscriptionId,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId);
  if (error) throw error;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const signature = req.headers.get("stripe-signature");
  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Webhook service is not configured" }, 503);
  }
  if (!signature) return json({ error: "Stripe signature is required" }, 401);

  const stripe = new Stripe(stripeKey, { apiVersion: stripeApiVersion });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, webhookSecret);
  } catch {
    return json({ error: "Invalid Stripe signature" }, 400);
  }

  const expectedLiveMode = stripeKey.startsWith("sk_live_");
  if (event.livemode !== expectedLiveMode) return json({ error: "Stripe mode mismatch" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  if (!(await claimEvent(admin, event))) return json({ received: true, duplicate: true });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await recordInvoicePayment(admin, session);
      await applySubscriptionCheckout(stripe, admin, session);
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await admin
        .from("tenant_subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", subscription.id);
    } else if (event.type === "invoice.payment_failed") {
      const stripeInvoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof stripeInvoice.parent?.subscription_details?.subscription === "string"
        ? stripeInvoice.parent.subscription_details.subscription
        : stripeInvoice.parent?.subscription_details?.subscription?.id;
      if (subscriptionId) {
        await admin
          .from("tenant_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscriptionId);
      }
    }

    await markEvent(admin, event.id, "processed", null);
    return json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    await markEvent(admin, event.id, "failed", message.slice(0, 500));
    console.error("Stripe webhook processing failed", event.id, event.type, message);
    return json({ error: "Webhook processing failed" }, 500);
  }
});
