
-- Add comparative (prior year) columns to trial_balance_entries
ALTER TABLE public.trial_balance_entries
  ADD COLUMN IF NOT EXISTS comparative_debit_pence bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comparative_credit_pence bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS brought_forward boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_period_id uuid REFERENCES public.accounts_periods(id) ON DELETE SET NULL;

-- Add index for quick lookups when bringing forward
CREATE INDEX IF NOT EXISTS idx_tb_entries_source_period ON public.trial_balance_entries(source_period_id) WHERE source_period_id IS NOT NULL;
