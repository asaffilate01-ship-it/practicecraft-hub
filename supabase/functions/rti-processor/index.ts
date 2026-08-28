import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Build GovTalk-compliant FPS XML
function buildFpsXml(draft: any, employer: any, credentials: any): string {
  const timestamp = new Date().toISOString();
  const taxYear = new Date().getFullYear().toString();

  const employeeLines = (draft.lines || []).map((l: any) => `
    <EmployeePaymentLine>
      <EmployeeName>${escapeXml(l.employeeName)}</EmployeeName>
      <NationalInsuranceNumber>${escapeXml(l.niNumber)}</NationalInsuranceNumber>
      <TaxCode>${escapeXml(l.taxCode)}</TaxCode>
      <GrossPayInPeriod>${l.grossPay.toFixed(2)}</GrossPayInPeriod>
      <TaxDeductedInPeriod>${l.tax.toFixed(2)}</TaxDeductedInPeriod>
      <NIContributionInPeriod>${l.ni.toFixed(2)}</NIContributionInPeriod>
      <GrossPayYTD>${l.ytdGross.toFixed(2)}</GrossPayYTD>
      <TaxDeductedYTD>${l.ytdTax.toFixed(2)}</TaxDeductedYTD>
    </EmployeePaymentLine>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>HMRC-PAYE-RTI-FPS</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>
      <TransactionID>${crypto.randomUUID()}</TransactionID>
      <Timestamp>${timestamp}</Timestamp>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>${escapeXml(credentials.gatewayId || '')}</SenderID>
        <Authentication>
          <Method>clear</Method>
          <Value>${escapeXml(credentials.gatewayPassword || '')}</Value>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <Body>
    <IRenvelope xmlns="http://www.govtalk.gov.uk/taxation/PAYE/RTI/FullPaymentSubmission/16-17/1">
      <IRheader>
        <Keys>
          <Key Type="TaxOfficeNumber">${escapeXml((employer.paye_reference || '').split('/')[0])}</Key>
          <Key Type="TaxOfficeReference">${escapeXml((employer.paye_reference || '').split('/')[1] || '')}</Key>
        </Keys>
        <PeriodEnd>${draft.paymentDate}</PeriodEnd>
        <IRmark Type="generic">PLACEHOLDER</IRmark>
      </IRheader>
      <FullPaymentSubmission>
        <EmpRefs>
          <OfficeNo>${escapeXml((employer.paye_reference || '').split('/')[0])}</OfficeNo>
          <PayeRef>${escapeXml((employer.paye_reference || '').split('/')[1] || '')}</PayeRef>
          <AORef>${escapeXml(employer.accounts_office_ref || '')}</AORef>
        </EmpRefs>
        <PaymentDate>${draft.paymentDate}</PaymentDate>
        <TaxPeriod>${draft.period}</TaxPeriod>
        <TaxYear>${taxYear}</TaxYear>
        ${employeeLines}
      </FullPaymentSubmission>
    </IRenvelope>
  </Body>
</GovTalkMessage>`;
}

// Build EPS XML
function buildEpsXml(draft: any, employer: any, credentials: any): string {
  const timestamp = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>HMRC-PAYE-RTI-EPS</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>
      <TransactionID>${crypto.randomUUID()}</TransactionID>
      <Timestamp>${timestamp}</Timestamp>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>${escapeXml(credentials.gatewayId || '')}</SenderID>
        <Authentication>
          <Method>clear</Method>
          <Value>${escapeXml(credentials.gatewayPassword || '')}</Value>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <Body>
    <IRenvelope xmlns="http://www.govtalk.gov.uk/taxation/PAYE/RTI/EmployerPaymentSummary/16-17/1">
      <IRheader>
        <Keys>
          <Key Type="TaxOfficeNumber">${escapeXml((employer.paye_reference || '').split('/')[0])}</Key>
          <Key Type="TaxOfficeReference">${escapeXml((employer.paye_reference || '').split('/')[1] || '')}</Key>
        </Keys>
        <IRmark Type="generic">PLACEHOLDER</IRmark>
      </IRheader>
      <EmployerPaymentSummary>
        <EmpRefs>
          <OfficeNo>${escapeXml((employer.paye_reference || '').split('/')[0])}</OfficeNo>
          <PayeRef>${escapeXml((employer.paye_reference || '').split('/')[1] || '')}</PayeRef>
          <AORef>${escapeXml(employer.accounts_office_ref || '')}</AORef>
        </EmpRefs>
        <TaxPeriod>${draft.period}</TaxPeriod>
        ${draft.noPaymentsToEmployees ? '<NoPaymentForPeriod>yes</NoPaymentForPeriod>' : ''}
        <RecoverableAmountsYTD>
          <TaxMonth>${draft.period}</TaxMonth>
          <SMPRecovered>${(draft.reclaim?.smpRecovered || 0).toFixed(2)}</SMPRecovered>
          <SPPRecovered>${(draft.reclaim?.sppRecovered || 0).toFixed(2)}</SPPRecovered>
          <SAPRecovered>${(draft.reclaim?.sapRecovered || 0).toFixed(2)}</SAPRecovered>
          <ShPPRecovered>${(draft.reclaim?.shppRecovered || 0).toFixed(2)}</ShPPRecovered>
          <NICCompensationOnSMP>${(draft.reclaim?.nicComp || 0).toFixed(2)}</NICCompensationOnSMP>
          <CISSuffered>${(draft.reclaim?.cisSuffered || 0).toFixed(2)}</CISSuffered>
        </RecoverableAmountsYTD>
      </EmployerPaymentSummary>
    </IRenvelope>
  </Body>
</GovTalkMessage>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData.user) throw new Error("Authentication failed");

    const { job_id } = await req.json();
    if (!job_id) throw new Error("job_id required");

    // Fetch the submission job
    const { data: job, error: jobErr } = await supabase
      .from("submission_jobs")
      .select("*")
      .eq("id", job_id)
      .single();
    if (jobErr || !job) throw new Error("Submission job not found");

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id",userData.user.id).single();
    if (!profile?.tenant_id || profile.tenant_id !== job.tenant_id) return new Response(JSON.stringify({error:"Submission job access denied"}),{status:403,headers:jsonHeaders});

    if (job.status !== "queued") {
      return new Response(JSON.stringify({ error: "Job is not in queued status" }), { status: 400, headers: jsonHeaders });
    }

    const attemptNo = (job.attempt_count || 0) + 1;
    const reason = "RTI live filing is blocked: the current-year HMRC schema and recognition test pack have not been validated";
    await supabase.from("submission_attempts").insert({
      job_id,
      attempt_no: attemptNo,
      status: "failed",
      finished_at: new Date().toISOString(),
      request_meta_redacted: { submission_type:job.submission_type },
      response_meta_redacted: { mode:"blocked",recognition_ready:false },
      error_class:"regulatory_readiness",
      error_message:reason,
    });
    await supabase.from("submission_jobs").update({
      status:"rejected",attempt_count:attemptNo,last_error:reason,response_json:{mode:"blocked",recognition_ready:false},
    }).eq("id", job_id);
    return new Response(JSON.stringify({
      status:"rejected",mode:"blocked",message:reason,
    }), { status:422,headers:jsonHeaders });

  } catch (e) {
    console.error("rti-processor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: jsonHeaders,
    });
  }
});
