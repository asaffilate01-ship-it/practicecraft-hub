import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    if (!profile?.tenant_id) throw new Error("No tenant");

    const tenantId = profile.tenant_id;
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/incorporations\/?/, "");
    const segments = path.split("/").filter(Boolean);

    // POST /incorporations/applications — create new incorporation
    if (req.method === "POST" && segments[0] === "applications" && segments.length === 1) {
      const body = await req.json();
      const { proposedName, entityType, sicCodes, articlesType } = body;

      const { data, error } = await supabase.from("incorporation_applications").insert({
        tenant_id: tenantId,
        proposed_name: proposedName || null,
        entity_type: entityType || "ltd",
        sic_codes: sicCodes || [],
        articles_type: articlesType || "model",
        created_by_user_id: user.id,
      }).select().single();

      if (error) throw error;

      // Create initial status history
      await supabase.from("incorp_status_history").insert({
        tenant_id: tenantId,
        application_id: data.id,
        to_status: "draft",
        changed_by_user_id: user.id,
      });

      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /incorporations/applications — list
    if (req.method === "GET" && segments[0] === "applications" && segments.length === 1) {
      const status = url.searchParams.get("status");
      let query = supabase.from("incorporation_applications").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /incorporations/applications/:id
    if (req.method === "GET" && segments[0] === "applications" && segments.length === 2 && !segments[1].includes("/")) {
      const appId = segments[1];
      const [appRes, peopleRes, sharesRes, docsRes, historyRes] = await Promise.all([
        supabase.from("incorporation_applications").select("*").eq("tenant_id", tenantId).eq("id", appId).single(),
        supabase.from("incorp_people").select("*").eq("tenant_id", tenantId).eq("application_id", appId),
        supabase.from("incorp_share_structure").select("*").eq("tenant_id", tenantId).eq("application_id", appId),
        supabase.from("incorp_documents").select("*").eq("tenant_id", tenantId).eq("application_id", appId),
        supabase.from("incorp_status_history").select("*").eq("tenant_id", tenantId).eq("application_id", appId).order("created_at", { ascending: false }),
      ]);

      if (appRes.error) throw appRes.error;

      return new Response(JSON.stringify({
        application: appRes.data,
        people: peopleRes.data || [],
        shareStructure: sharesRes.data || [],
        documents: docsRes.data || [],
        statusHistory: historyRes.data || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PUT /incorporations/applications/:id — update/save step
    if (req.method === "PUT" && segments[0] === "applications" && segments.length === 2) {
      const appId = segments[1];
      const body = await req.json();
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (body.proposedName !== undefined) updates.proposed_name = body.proposedName;
      if (body.entityType !== undefined) updates.entity_type = body.entityType;
      if (body.registeredOffice !== undefined) updates.registered_office_json = body.registeredOffice;
      if (body.sailAddress !== undefined) updates.sail_address_json = body.sailAddress;
      if (body.sicCodes !== undefined) updates.sic_codes = body.sicCodes;
      if (body.articlesType !== undefined) updates.articles_type = body.articlesType;
      if (body.data !== undefined) updates.data_json = body.data;
      if (body.status !== undefined) {
        updates.status = body.status;
        await supabase.from("incorp_status_history").insert({
          tenant_id: tenantId,
          application_id: appId,
          to_status: body.status,
          notes: body.statusNote || null,
          changed_by_user_id: user.id,
        });
      }

      const { data, error } = await supabase.from("incorporation_applications")
        .update(updates)
        .eq("tenant_id", tenantId)
        .eq("id", appId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /incorporations/applications/:id/people — add person
    if (req.method === "POST" && segments[0] === "applications" && segments[2] === "people") {
      const appId = segments[1];
      const body = await req.json();

      const { data, error } = await supabase.from("incorp_people").insert({
        tenant_id: tenantId,
        application_id: appId,
        role: body.role || "director",
        title: body.title || null,
        first_name: body.firstName,
        middle_names: body.middleNames || null,
        last_name: body.lastName,
        date_of_birth: body.dateOfBirth || null,
        nationality: body.nationality || null,
        occupation: body.occupation || null,
        country_of_residence: body.countryOfResidence || null,
        service_address_json: body.serviceAddress || {},
        residential_address_json: body.residentialAddress || {},
        natures_of_control: body.naturesOfControl || [],
        consent_to_act: body.consentToAct || false,
      }).select().single();

      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /incorporations/applications/:id/shares — add share class
    if (req.method === "POST" && segments[0] === "applications" && segments[2] === "shares") {
      const appId = segments[1];
      const body = await req.json();

      const { data, error } = await supabase.from("incorp_share_structure").insert({
        tenant_id: tenantId,
        application_id: appId,
        class_name: body.className || "Ordinary",
        nominal_value_pence: body.nominalValuePence || 100,
        currency: body.currency || "GBP",
        total_shares: body.totalShares || 1,
        subscriber_person_id: body.subscriberPersonId || null,
        shares_subscribed: body.sharesSubscribed || 1,
        amount_paid_pence: body.amountPaidPence || 100,
        amount_unpaid_pence: body.amountUnpaidPence || 0,
      }).select().single();

      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /incorporations/applications/:id/validate
    if (req.method === "POST" && segments[0] === "applications" && segments[2] === "validate") {
      const appId = segments[1];

      const [appRes, peopleRes, sharesRes] = await Promise.all([
        supabase.from("incorporation_applications").select("*").eq("tenant_id", tenantId).eq("id", appId).single(),
        supabase.from("incorp_people").select("*").eq("tenant_id", tenantId).eq("application_id", appId),
        supabase.from("incorp_share_structure").select("*").eq("tenant_id", tenantId).eq("application_id", appId),
      ]);

      if (appRes.error) throw appRes.error;
      const app = appRes.data;
      const people = peopleRes.data || [];
      const shares = sharesRes.data || [];
      const errors: string[] = [];

      if (!app.proposed_name) errors.push("Company name is required");
      if (!app.sic_codes?.length) errors.push("At least one SIC code is required");
      if (!people.some((p: { role: string }) => p.role === "director")) errors.push("At least one director is required");
      if (!people.some((p: { role: string }) => p.role === "psc" || p.role === "subscriber")) errors.push("At least one PSC/subscriber is required");
      if (!shares.length) errors.push("Share structure is required");

      const kycPending = people.filter((p: { kyc_status: string }) => p.kyc_status !== "approved");
      if (kycPending.length) errors.push(`${kycPending.length} person(s) have pending KYC checks`);

      const valid = errors.length === 0;

      if (valid) {
        await supabase.from("incorporation_applications")
          .update({ status: "validated", updated_at: new Date().toISOString() })
          .eq("id", appId);
        await supabase.from("incorp_status_history").insert({
          tenant_id: tenantId, application_id: appId, to_status: "validated", changed_by_user_id: user.id,
        });
      }

      return new Response(JSON.stringify({ valid, errors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /incorporations/applications/:id/pay
    if (req.method === "POST" && segments[0] === "applications" && segments[2] === "pay") {
      const appId = segments[1];
      const body = await req.json();

      await supabase.from("incorporation_applications").update({
        payment_status: "paid",
        payment_reference: body.paymentReference || `pay_${Date.now()}`,
        payment_amount_pence: body.amountPence || 1200,
        updated_at: new Date().toISOString(),
      }).eq("tenant_id", tenantId).eq("id", appId);

      await supabase.from("incorp_status_history").insert({
        tenant_id: tenantId, application_id: appId, to_status: "paid", changed_by_user_id: user.id,
      });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /incorporations/applications/:id/submit
    if (req.method === "POST" && segments[0] === "applications" && segments[2] === "submit") {
      const appId = segments[1];

      // Verify payment
      const { data: app } = await supabase.from("incorporation_applications")
        .select("payment_status, status")
        .eq("tenant_id", tenantId)
        .eq("id", appId)
        .single();

      if (!app) throw new Error("Application not found");
      if (app.payment_status !== "paid") throw new Error("Payment required before submission");

      await supabase.from("incorporation_applications").update({
        status: "submitted",
        updated_at: new Date().toISOString(),
      }).eq("tenant_id", tenantId).eq("id", appId);

      await supabase.from("incorp_status_history").insert({
        tenant_id: tenantId, application_id: appId, to_status: "submitted", changed_by_user_id: user.id,
      });

      await supabase.from("event_logs").insert({
        tenant_id: tenantId,
        event_type: "incorporation_submitted",
        source: "user",
        actor_user_id: user.id,
        payload_json: { applicationId: appId },
      });

      return new Response(JSON.stringify({ success: true, status: "submitted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /incorporations/applications/:id/status
    if (req.method === "GET" && segments[0] === "applications" && segments[2] === "status") {
      const appId = segments[1];
      const { data, error } = await supabase.from("incorporation_applications")
        .select("id, status, payment_status, ch_submission_id, ch_company_number, ch_incorporation_date, updated_at")
        .eq("tenant_id", tenantId)
        .eq("id", appId)
        .single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 400;
    return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
