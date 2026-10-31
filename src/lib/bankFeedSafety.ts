/** UI guard only. Supabase RLS and relational checks must also be enforced server-side. */
export type BankConnectionScope = {
  tenant_id: string;
  client_id: string;
  provider: string;
  id: string;
};

/** A manual record is not proof of a bank-provider consent or live connection. */
export function requireManualBankConnection<T extends BankConnectionScope>(
  candidate: T | null | undefined,
  tenantId: string,
  selectedClientId?: string | null,
): T {
  if (!tenantId || !candidate || candidate.tenant_id !== tenantId ||
      !candidate.client_id || (selectedClientId && candidate.client_id !== selectedClientId)) {
    throw new Error("Bank account is outside the authorised client workspace");
  }
  if (candidate.provider !== "manual") {
    throw new Error("Automatic bank connections are unavailable; choose a manual bank account");
  }
  return candidate;
}

/** Cap upload work without storing CSV contents or bank details in browser preferences. */
export function validateBankCsvFile(file: { name: string; size: number }): void {
  if (!file || !/\.csv$/i.test(file.name)) throw new Error("Choose a .csv bank statement");
  if (!Number.isSafeInteger(file.size) || file.size <= 0) throw new Error("The CSV file is empty or invalid");
  if (file.size > 5 * 1024 * 1024) throw new Error("CSV exceeds 5 MB; split it into smaller statements");
}
