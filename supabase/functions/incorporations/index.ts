import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

    // ─── CREATE APPLICATION ───
    if (req.method === "POST" && segments[0] === "applications" && segments.length === 1) {
      const body = await req.json();

      const { data, error } = await supabase.from("incorporation_applications").insert({
        tenant_id: tenantId,
        proposed_name: body.companyName || body.proposedName || null,
        entity_type: body.entityType || "ltd",
        sic_codes: body.sicCodes || [],
        articles_type: body.articlesType || "model",
        created_by_user_id: user.id,
      }).select().single();
      if (error) throw error;

      await supabase.from("incorp_status_history").insert({
        tenant_id: tenantId, application_id: data.id,
        to_status: "draft", changed_by_user_id: user.id,
      });

      return json(data, 201);
    }

    // ─── LIST APPLICATIONS ───
    if (req.method === "GET" && segments[0] === "applications" && segments.length === 1) {
      const status = url.searchParams.get("status");
      let query = supabase.from("incorporation_applications")
        .select("*").eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return json(data);
    }

    // ─── GET APPLICATION ───
    if (req.method === "GET" && segments[0] === "applications" && segments.length === 2 && segments[1] !== "status") {
      const appId = segments[1];
      const [appRes, peopleRes, sharesRes, docsRes, historyRes] = await Promise.all([
        supabase.from("incorporation_applications").select("*").eq("tenant_id", tenantId).eq("id", appId).single(),
        supabase.from("incorp_people").select("*").eq("tenant_id", tenantId).eq("application_id", appId),
        supabase.from("incorp_share_structure").select("*").eq("tenant_id", tenantId).eq("application_id", appId),
        supabase.from("incorp_documents").select("*").eq("tenant_id", tenantId).eq("application_id", appId),
        supabase.from("incorp_status_history").select("*").eq("tenant_id", tenantId).eq("application_id", appId).order("created_at", { ascending: false }),
      ]);
      if (appRes.error) throw appRes.error;

      return json({
        application: appRes.data,
        people: peopleRes.data || [],
        shareStructure: sharesRes.data || [],
        documents: docsRes.data || [],
        statusHistory: historyRes.data || [],
      });
    }

    // ─── UPDATE APPLICATION ───
    if (req.method === "PUT" && segments[0] === "applications" && segments.length === 2) {
      const appId = segments[1];
      const body = await req.json();
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (body.companyName !== undefined) updates.proposed_name = body.companyName;
      if (body.proposedName !== undefined) updates.proposed_name = body.proposedName;
      if (body.entityType !== undefined) updates.entity_type = body.entityType;
      if (body.registeredOfficeAddress !== undefined) updates.registered_office_json = body.registeredOfficeAddress;
      if (body.sailAddress !== undefined) updates.sail_address_json = body.sailAddress;
      if (body.sicCodes !== undefined) updates.sic_codes = body.sicCodes;
      if (body.articlesType !== undefined) updates.articles_type = body.articlesType;
      if (body.data !== undefined) updates.data_json = body.data;
      if (body.shareStructure !== undefined) updates.data_json = { ...(updates.data_json as object || {}), shareStructure: body.shareStructure };
      if (body.people !== undefined) updates.data_json = { ...(updates.data_json as object || {}), people: body.people };

      if (body.status !== undefined) {
        updates.status = body.status;
        await supabase.from("incorp_status_history").insert({
          tenant_id: tenantId, application_id: appId,
          to_status: body.status, notes: body.statusNote || null,
          changed_by_user_id: user.id,
        });
      }

      const { data, error } = await supabase.from("incorporation_applications")
        .update(updates).eq("tenant_id", tenantId).eq("id", appId)
        .select().single();
      if (error) throw error;
      return json(data);
    }

    // ─── ADD PERSON ───
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
      return json(data, 201);
    }

    // ─── ADD SHARES ───
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
      return json(data, 201);
    }

    // ─── VALIDATE ───
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
      const issues: Array<{ field: string; message: string; severity: string }> = [];

      if (!app.proposed_name) issues.push({ field: "companyName", message: "Company name is required", severity: "error" });
      if (!app.sic_codes?.length) issues.push({ field: "sicCodes", message: "At least one SIC code is required", severity: "error" });
      if (!people.some((p: { role: string }) => p.role === "director")) {
        issues.push({ field: "people", message: "At least one director is required", severity: "error" });
      }
      if (!people.some((p: { role: string }) => ["psc", "subscriber"].includes(p.role))) {
        issues.push({ field: "people", message: "At least one PSC/subscriber is required", severity: "error" });
      }
      if (!shares.length) issues.push({ field: "shareStructure", message: "Share structure is required", severity: "error" });

      // KYC check
      const kycPending = people.filter((p: { kyc_status: string }) => p.kyc_status !== "approved");
      if (kycPending.length) {
        issues.push({ field: "kyc", message: `${kycPending.length} person(s) have pending KYC checks`, severity: "warning" });
      }

      // Consent check
      const noConsent = people.filter((p: { role: string; consent_to_act: boolean }) =>
        p.role === "director" && !p.consent_to_act);
      if (noConsent.length) {
        issues.push({ field: "consent", message: `${noConsent.length} director(s) have not given consent to act`, severity: "error" });
      }

      const ok = !issues.some(i => i.severity === "error");

      return json({ ok, issues });
    }

    // ─── PAY ───
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
        tenant_id: tenantId, application_id: appId,
        to_status: "awaiting_payment", notes: "Payment received",
        changed_by_user_id: user.id,
      });

      return json({ success: true });
    }

    // ─── SUBMIT ───
    if (req.method === "POST" && segments[0] === "applications" && segments[2] === "submit") {
      const appId = segments[1];

      const { data: app } = await supabase.from("incorporation_applications")
        .select("*").eq("tenant_id", tenantId).eq("id", appId).single();
      if (!app) throw new Error("Application not found");
      if (app.payment_status !== "paid") throw new Error("Payment required before submission");

      // Create submission job
      const { data: job, error: jobErr } = await supabase.from("submission_jobs").insert({
        tenant_id: tenantId,
        job_type: "ch_incorporation",
        status: "queued",
        payload_json: {
          applicationId: appId,
          companyName: app.proposed_name,
          sicCodes: app.sic_codes,
          registeredOffice: app.registered_office_json,
        },
        created_by_user_id: user.id,
      }).select().single();
      if (jobErr) throw jobErr;

      await supabase.from("incorporation_applications").update({
        status: "submitted",
        updated_at: new Date().toISOString(),
      }).eq("tenant_id", tenantId).eq("id", appId);

      await supabase.from("incorp_status_history").insert({
        tenant_id: tenantId, application_id: appId,
        to_status: "submitted", changed_by_user_id: user.id,
      });

      await supabase.from("event_logs").insert({
        tenant_id: tenantId, event_type: "incorporation_submitted",
        source: "user", actor_user_id: user.id,
        payload_json: { applicationId: appId, submissionJobId: job.id },
      });

      return json({ submissionJobId: job.id }, 202);
    }

    // ─── STATUS (polling) ───
    if (req.method === "GET" && segments[0] === "applications" && segments[2] === "status") {
      const appId = segments[1];
      const { data, error } = await supabase.from("incorporation_applications")
        .select("id, status, payment_status, ch_submission_id, ch_company_number, ch_incorporation_date, updated_at")
        .eq("tenant_id", tenantId).eq("id", appId).single();
      if (error) throw error;
      return json(data);
    }

    // ─── POST-INCORPORATION: GO LIVE ───
    // Creates client record + registers + tasks from accepted application
    if (req.method === "POST" && segments[0] === "applications" && segments[2] === "go-live") {
      const appId = segments[1];

      const { data: app } = await supabase.from("incorporation_applications")
        .select("*").eq("tenant_id", tenantId).eq("id", appId).single();
      if (!app) throw new Error("Application not found");
      if (app.status !== "accepted") throw new Error("Application must be accepted before go-live");
      if (app.client_id) throw new Error("Client already created for this application");

      // Create client
      const { data: client, error: clientErr } = await supabase.from("clients").insert({
        tenant_id: tenantId,
        legal_name: app.proposed_name || "New Company",
        entity_type: "ltd",
        company_number: app.ch_company_number || null,
      }).select().single();
      if (clientErr) throw clientErr;

      // Link application to client
      await supabase.from("incorporation_applications")
        .update({ client_id: client.id, status: "completed", updated_at: new Date().toISOString() })
        .eq("id", appId);

      // Create company profile
      await supabase.from("company_profiles").insert({
        tenant_id: tenantId,
        client_id: client.id,
        company_number: app.ch_company_number || "",
        company_name: app.proposed_name || "",
        company_status: "active",
        sic_codes: app.sic_codes || [],
        registered_office_json: app.registered_office_json || {},
        incorporation_date: app.ch_incorporation_date || null,
      });

      // Create directors + PSC from incorp_people
      const { data: people } = await supabase.from("incorp_people")
        .select("*").eq("tenant_id", tenantId).eq("application_id", appId);

      if (people) {
        for (const p of people) {
          if (p.role === "director") {
            await supabase.from("company_register_directors").insert({
              tenant_id: tenantId, client_id: client.id,
              full_name: `${p.first_name} ${p.last_name}`.trim(),
              date_of_birth: p.date_of_birth,
              nationality: p.nationality,
              occupation: p.occupation,
              service_address_json: p.service_address_json || {},
              residential_address_json: p.residential_address_json || {},
              appointed_on: app.ch_incorporation_date || new Date().toISOString().split("T")[0],
            });
          }
          if (p.role === "psc" || (p.natures_of_control && p.natures_of_control.length > 0)) {
            await supabase.from("company_register_psc").insert({
              tenant_id: tenantId, client_id: client.id,
              full_name: `${p.first_name} ${p.last_name}`.trim(),
              date_of_birth: p.date_of_birth,
              nationality: p.nationality,
              service_address_json: p.service_address_json || {},
              natures_of_control: p.natures_of_control || [],
              notified_on: app.ch_incorporation_date || new Date().toISOString().split("T")[0],
            });
          }
        }
      }

      // Create share classes + members from incorp_share_structure
      const { data: shares } = await supabase.from("incorp_share_structure")
        .select("*").eq("tenant_id", tenantId).eq("application_id", appId);

      if (shares) {
        for (const s of shares) {
          const { data: sc } = await supabase.from("share_classes").insert({
            tenant_id: tenantId, client_id: client.id,
            class_code: s.class_name.substring(0, 3).toUpperCase(),
            class_name: s.class_name,
            currency: s.currency,
            nominal_value_pence: s.nominal_value_pence,
          }).select().single();

          // Create member from subscriber
          if (s.subscriber_person_id && sc) {
            const person = people?.find((p: { id: string }) => p.id === s.subscriber_person_id);
            if (person) {
              await supabase.from("company_register_members").insert({
                tenant_id: tenantId, client_id: client.id,
                full_name: `${person.first_name} ${person.last_name}`.trim(),
                share_class_id: sc.id,
                shares_held: s.shares_subscribed,
                date_became_member: app.ch_incorporation_date || new Date().toISOString().split("T")[0],
                address_json: person.residential_address_json || {},
              });
            }
          }
        }
      }

      // Emit domain event
      await supabase.from("domain_events").insert({
        tenant_id: tenantId,
        trigger: "client_created",
        payload: { clientId: client.id, source: "incorporation", applicationId: appId },
      });

      await supabase.from("incorp_status_history").insert({
        tenant_id: tenantId, application_id: appId,
        to_status: "completed", notes: `Client ${client.id} created`,
        changed_by_user_id: user.id,
      });

      return json({ clientId: client.id, companyNumber: app.ch_company_number });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 400;
    return json({ error: message }, status);
  }
});
