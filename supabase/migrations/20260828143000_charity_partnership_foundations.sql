-- This timestamp originally duplicated
-- 20260828110648_66bedd35-f8de-47ba-9733-14b438ed6e3b.sql in full.
-- Keep the migration version for deployed environments, but make a clean replay safe.

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.charity_profiles,
  public.charity_applications,
  public.gift_aid_claims,
  public.gift_aid_donations,
  public.charity_annual_returns,
  public.partnership_profiles,
  public.partners,
  public.partnership_returns,
  public.llp_accounts_reviews
TO authenticated;

GRANT ALL ON
  public.charity_profiles,
  public.charity_applications,
  public.gift_aid_claims,
  public.gift_aid_donations,
  public.charity_annual_returns,
  public.partnership_profiles,
  public.partners,
  public.partnership_returns,
  public.llp_accounts_reviews
TO service_role;
