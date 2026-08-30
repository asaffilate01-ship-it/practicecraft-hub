import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

type Caller = {
  userId: string;
  tenantId: string;
  staffRole: string | null;
  portalClientId: string | null;
};

const stripeApiVersion = "2025-08-27.basil";

function configuredOrigins(): Set<string> {
  const values = [
    Deno.env.get("PUBLIC_APP_URL") || "",
    ...(Deno.env.get("ALLOWED_ORIGINS") || "").split(","),
  ];
  return new Set(values.map((value) => value.trim().replace(/\/$/, "")).filter(Boolean));
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin")?.replace(/\/$/, "") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (origin && configuredOrigins().has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(req: Request, value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function safeRedirect(candidate: unknown, fallbackPath: string): string {
  const publicAppUrl = Deno.env.get("PUBLIC_APP_URL")?.replace(/\/$/, "");
  if (!publicAppUrl) throw new Error("PUBLIC_APP_URL is not configured");
  const fallback = `${publicAppUrl}${fallbackPath}`;
  if (typeof candidate !== "string" || !candidate) return fallback;
  try {
    const parsed = new URL(candidate);
    return configuredOrigins().has(parsed.origin) ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
}

function normalisePlanCode(value: unknown): "starter" | "pro" | "enterprise" | null {
  if (value === "professional") return "pro";
  if (value === "starter" || value === "pro" || value === "enterprise") return value;
  return null;
}

function priceIdFor(planCode: "starter" | "pro" | "enterprise"): string | null {
  const names: Record<typeof planCode, string[]> = {
    starter: ["STRIPE_PRICE_STARTER"],
    pro: ["STRIPE_PRICE_PRO", "STRIPE_PRICE_PROFESSIONAL"],
    enterprise: ["STRIPE_PRICE_ENTERPRISE"],
  };
  for (const name of names[planCode]) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  return null;
}

async function authenticate(req: Request, admin: ReturnType<typeof createClient>): Promise<Caller> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new ResponseError(401, "Authentication required");

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new ResponseError(401, "Invalid session");

  const userId = authData.user.id;
  const [{ data: profile }, { data: portalUser }] = await Promise.all([
    admin.from("profiles").select("tenant_id").eq("id", userId).maybeSingle(),
    admin
      .from("portal_users")
      .select("tenant_id,client_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (!profile?.tenant_id && !portalUser?.tenant_id) {
    throw new ResponseError(403, "No active practice or portal identity");
  }
  if (profile?.tenant_id && portalUser?.tenant_id && profile.tenant_id !== portalUser.tenant_id) {
    throw new ResponseError(403, "Conflicting account identities");
  }

  const tenantId = profile?.tenant_id || portalUser!.tenant_id;
  let staffRole: string | null = null;
  if (profile?.tenant_id) {
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();
    staffRole = role?.role || null;
  }

  return {
    userId,
    tenantId,
    staffRole,
    portalClientId: portalUser?.client_id || null,
  };
}

async function loadInvoice(admin: ReturnType<typeof createClient>, caller: Caller, invoiceId: string) {
  const { data: invoice, error } = await admin
    .from("invoices")
    .select("id,tenant_id,client_id,invoice_number,total,amount_paid,status,stripe_session_id,clients(legal_name,email)")
    .eq("id", invoiceId)
    .eq("tenant_id", caller.tenantId)
    .maybeSingle();
  if (error || !invoice) throw new ResponseError(404, "Invoice not found");
  if (caller.portalClientId && invoice.client_id !== caller.portalClientId) {
    throw new ResponseError(403, "Invoice access denied");
  }
  return invoice;
}

function requireStaff(caller: Caller): void {
  if (!caller.staffRole) throw new ResponseError(403, "Staff access required");
}

function requireBillingOwner(caller: Caller): void {
  if (!caller.staffRole || !["super_admin", "firm_owner"].includes(caller.staffRole)) {
    throw new ResponseError(403, "Firm owner access required");
  }
}

class ResponseError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeKey || !supabaseUrl || !serviceRoleKey) {
    return json(req, { error: "Payment service is not configured" }, 503);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: stripeApiVersion });
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const rawBody = await req.text();

  try {
    const caller = await authenticate(req, admin);
    const body = JSON.parse(rawBody || "{}");
    const action = body.action;

    if (action === "create-checkout") {
      requireBillingOwner(caller);
      const planCode = normalisePlanCode(body.planCode);
      if (!planCode) throw new ResponseError(400, "Unknown subscription plan");
      const priceId = priceIdFor(planCode);
      if (!priceId) throw new ResponseError(503, `Stripe price is not configured for ${planCode}`);

      const { data: tenant } = await admin
        .from("tenants")
        .select("id,firm_name,stripe_customer_id")
        .eq("id", caller.tenantId)
        .single();
      let customerId = tenant.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create(
          { name: tenant.firm_name || "Practice", metadata: { tenant_id: caller.tenantId } },
          { idempotencyKey: `tenant-customer-${caller.tenantId}` },
        );
        customerId = customer.id;
        await admin.from("tenants").update({ stripe_customer_id: customerId }).eq("id", caller.tenantId);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: caller.tenantId,
        success_url: safeRedirect(body.successUrl, "/settings?checkout=success"),
        cancel_url: safeRedirect(body.cancelUrl, "/settings?checkout=cancelled"),
        metadata: { tenant_id: caller.tenantId, plan_code: planCode },
        subscription_data: { metadata: { tenant_id: caller.tenantId, plan_code: planCode } },
      }, { idempotencyKey: `subscription-${caller.tenantId}-${planCode}` });

      return json(req, { url: session.url, sessionId: session.id });
    }

    if (action === "create-invoice-payment") {
      const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
      if (!invoiceId) throw new ResponseError(400, "invoiceId is required");
      const invoice = await loadInvoice(admin, caller, invoiceId);
      if (["paid", "void", "cancelled"].includes(invoice.status)) {
        throw new ResponseError(409, "This invoice is not payable");
      }
      const outstanding = Number(invoice.total) - Number(invoice.amount_paid || 0);
      const amountPence = Math.round(outstanding * 100);
      if (!Number.isSafeInteger(amountPence) || amountPence < 50) {
        throw new ResponseError(400, "Invoice has no payable balance");
      }

      if (invoice.stripe_session_id) {
        try {
          const existingSession = await stripe.checkout.sessions.retrieve(invoice.stripe_session_id);
          if (existingSession.status === "open" && existingSession.url) {
            return json(req, { url: existingSession.url, sessionId: existingSession.id, reused: true });
          }
          if (existingSession.status === "complete") {
            return json(req, {
              paid: existingSession.payment_status === "paid",
              paymentStatus: existingSession.payment_status,
              sessionId: existingSession.id,
            }, existingSession.payment_status === "paid" ? 200 : 409);
          }
        } catch {
          // A deleted or inaccessible old test session must not block a fresh,
          // tenant-authorised checkout attempt.
        }
      }

      const session = await stripe.checkout.sessions.create({
        customer_email: invoice.clients?.email || undefined,
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "gbp",
            product_data: { name: `Invoice ${invoice.invoice_number}` },
            unit_amount: amountPence,
          },
          quantity: 1,
        }],
        client_reference_id: invoice.id,
        success_url: safeRedirect(body.successUrl, `/portal/invoices/${invoice.id}?payment=success`),
        cancel_url: safeRedirect(body.cancelUrl, `/portal/invoices/${invoice.id}?payment=cancelled`),
        metadata: {
          invoice_id: invoice.id,
          tenant_id: caller.tenantId,
          amount_pence: String(amountPence),
        },
        payment_intent_data: { metadata: { invoice_id: invoice.id, tenant_id: caller.tenantId } },
      }, { idempotencyKey: `invoice-${invoice.id}-${amountPence}-${invoice.stripe_session_id || "initial"}` });

      const { error } = await admin
        .from("invoices")
        .update({ stripe_checkout_url: session.url, stripe_session_id: session.id, updated_at: new Date().toISOString() })
        .eq("id", invoice.id)
        .eq("tenant_id", caller.tenantId);
      if (error) throw error;
      return json(req, { url: session.url, sessionId: session.id });
    }

    if (action === "verify-payment") {
      const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
      if (!sessionId) throw new ResponseError(400, "sessionId is required");
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const invoiceId = session.metadata?.invoice_id;
      if (!invoiceId) throw new ResponseError(404, "Invoice payment session not found");
      await loadInvoice(admin, caller, invoiceId);
      return json(req, { paid: session.payment_status === "paid", paymentStatus: session.payment_status });
    }

    if (action === "payment-history") {
      requireStaff(caller);
      const { data, error } = await admin
        .from("invoices")
        .select("id,invoice_number,total,amount_paid,status,paid_at,payment_method,stripe_payment_intent_id,clients(legal_name)")
        .eq("tenant_id", caller.tenantId)
        .in("status", ["paid", "partially_paid"])
        .order("paid_at", { ascending: false })
        .limit(Math.min(Math.max(Number(body.limit) || 25, 1), 100));
      if (error) throw error;
      return json(req, { payments: data || [] });
    }

    if (action === "billing-portal") {
      requireBillingOwner(caller);
      const { data: tenant } = await admin
        .from("tenants")
        .select("stripe_customer_id")
        .eq("id", caller.tenantId)
        .single();
      if (!tenant.stripe_customer_id) throw new ResponseError(400, "No Stripe customer linked");
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: tenant.stripe_customer_id,
        return_url: safeRedirect(body.returnUrl, "/settings"),
      });
      return json(req, { url: portalSession.url });
    }

    return json(req, { error: "Unknown action" }, 400);
  } catch (error) {
    if (error instanceof ResponseError) return json(req, { error: error.message }, error.status);
    const message = error instanceof Error ? error.message : "Payment request failed";
    console.error("Stripe action failed", message);
    return json(req, { error: "Payment request failed" }, 500);
  }
});
