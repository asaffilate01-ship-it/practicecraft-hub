
-- Add Stripe columns to tenants and invoices
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_checkout_url text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_session_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
