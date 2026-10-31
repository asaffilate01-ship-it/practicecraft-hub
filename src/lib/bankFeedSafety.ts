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

export type BankTransactionBinding = {
  tenant_id: string;
  client_id: string;
  bank_connection_id: string;
};

/** Before posting journals, refuse source lines with a mismatched bank/client binding. */
export function requireConsistentBankTransaction(
  transaction: BankTransactionBinding,
  connections: readonly BankConnectionScope[],
  tenantId: string,
  selectedClientId?: string | null,
): void {
  if (!tenantId || transaction.tenant_id !== tenantId ||
      !transaction.client_id ||
      (selectedClientId && transaction.client_id !== selectedClientId)) {
    throw new Error("Bank transaction is outside the authorised client workspace");
  }
  const bank = connections.find(connection => connection.id === transaction.bank_connection_id);
  if (!bank || bank.tenant_id !== tenantId || bank.client_id !== transaction.client_id) {
    throw new Error("Bank transaction does not match its bank account and client; posting blocked");
  }
}

