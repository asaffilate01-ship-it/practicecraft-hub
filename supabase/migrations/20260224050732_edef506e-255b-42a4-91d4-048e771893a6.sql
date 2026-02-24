
-- Submission attempts: full audit trail per attempt
CREATE TABLE IF NOT EXISTS public.submission_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.submission_jobs(id) ON DELETE CASCADE,
  attempt_no int NOT NULL,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started','succeeded','failed','timed_out')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms int,
  request_meta_redacted jsonb,
  response_meta_redacted jsonb,
  http_status int,
  provider_code text,
  provider_message text,
  error_class text,
  error_message text,
  error_detail text,
  UNIQUE (job_id, attempt_no)
);

CREATE INDEX IF NOT EXISTS ix_attempts_job ON public.submission_attempts(job_id, attempt_no DESC);

-- RLS
ALTER TABLE public.submission_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation via job" ON public.submission_attempts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.submission_jobs sj
      WHERE sj.id = submission_attempts.job_id
        AND sj.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );
