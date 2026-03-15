import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STRIPE_PRICE_MAP: Record<string, string> = {
  starter: "price_1TBHs6FFogsDQVs4SwXrbImm",
  professional: "price_1TBHs8FFogsDQVs4S2o3m1he",
  enterprise: "price_1TBHs8FFogsDQVs4OySHznXl",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action } = body;

    // ── Create Checkout Session for subscription upgrade ──
    if (action === "create-checkout") {
      const { tenantId, planCode, successUrl, cancelUrl } = body;
      if (!tenantId || !planCode) {
        return new Response(JSON.stringify({ error: "tenantId and planCode required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const priceId = STRIPE_PRICE_MAP[planCode];
      if (!priceId) {
        return new Response(JSON.stringify({ error: `Unknown plan: ${planCode}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get or create Stripe customer for tenant
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, firm_name, stripe_customer_id")
        .eq("id", tenantId)
        .single();

      let customerId = tenant?.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: tenant?.firm_name || "Practice",
          metadata: { tenant_id: tenantId },
        });
        customerId = customer.id;
        await supabase.from("tenants").update({ stripe_customer_id: customerId }).eq("id", tenantId);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl || `${req.headers.get("origin")}/settings?checkout=success`,
        cancel_url: cancelUrl || `${req.headers.get("origin")}/settings?checkout=cancelled`,
        metadata: { tenant_id: tenantId, plan_code: planCode },
      });

      return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Create Payment Link for client invoice ──
    if (action === "create-invoice-payment") {
      const { invoiceId, tenantId } = body;
      if (!invoiceId || !tenantId) {
        return new Response(JSON.stringify({ error: "invoiceId and tenantId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: invoice } = await supabase
        .from("invoices")
        .select("*, clients(legal_name, email)")
        .eq("id", invoiceId)
        .single();

      if (!invoice) {
        return new Response(JSON.stringify({ error: "Invoice not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const totalPence = Math.round(Number(invoice.total) * 100);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "gbp",
            product_data: { name: `Invoice ${invoice.invoice_number}` },
            unit_amount: totalPence,
          },
          quantity: 1,
        }],
        success_url: `${req.headers.get("origin")}/portal/invoices/${invoiceId}?payment=success`,
        cancel_url: `${req.headers.get("origin")}/portal/invoices/${invoiceId}?payment=cancelled`,
        metadata: { invoice_id: invoiceId, tenant_id: tenantId },
      });

      // Store payment link on invoice
      await supabase.from("invoices")
        .update({ stripe_checkout_url: session.url, stripe_session_id: session.id })
        .eq("id", invoiceId);

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Webhook handler ──
    if (action === "webhook") {
      // Simplified webhook — in production use stripe.webhooks.constructEvent
      const event = body.event;
      if (!event) {
        return new Response(JSON.stringify({ error: "event required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const tenantId = session.metadata?.tenant_id;
        const planCode = session.metadata?.plan_code;
        const invoiceId = session.metadata?.invoice_id;

        if (tenantId && planCode) {
          // Subscription checkout completed — update tenant subscription
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("id")
            .eq("code", planCode)
            .single();

          if (plan) {
            await supabase.from("tenant_subscriptions")
              .update({
                plan_id: plan.id,
                status: "active",
                stripe_subscription_id: session.subscription,
                current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
              })
              .eq("tenant_id", tenantId);
          }
        }

        if (invoiceId) {
          // Invoice payment completed
          const { data: inv } = await supabase
            .from("invoices")
            .select("total")
            .eq("id", invoiceId)
            .single();

          await supabase.from("invoices")
            .update({
              status: "paid",
              amount_paid: inv?.total || 0,
              stripe_payment_intent_id: session.payment_intent,
            })
            .eq("id", invoiceId);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Get billing portal session ──
    if (action === "billing-portal") {
      const { tenantId, returnUrl } = body;
      const { data: tenant } = await supabase
        .from("tenants")
        .select("stripe_customer_id")
        .eq("id", tenantId)
        .single();

      if (!tenant?.stripe_customer_id) {
        return new Response(JSON.stringify({ error: "No Stripe customer linked" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: tenant.stripe_customer_id,
        return_url: returnUrl || `${req.headers.get("origin")}/settings`,
      });

      return new Response(JSON.stringify({ url: portalSession.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stripe function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
