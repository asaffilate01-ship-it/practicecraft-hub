/** Pure, repeatable receipt validation used for PREVIEW only. SQL revalidates independently. */
export type ReceiptDraft = {
  supplier_name: string | null;
  currency: string | null;
  receipt_date: string | null;
  total_gross_pence: number | null;
  total_net_pence: number | null;
  total_vat_pence: number | null;
};
export type ReceiptAccount = {
  id: string;
  code: string;
  account_type: string;
  is_active: boolean;
};
export type PostingLine = { accountId: string; direction: "debit" | "credit"; amountPence: number; label: string };
export type ReceiptPostingPreview = {
  grossPence: number;
  netPence: number;
  vatPence: number;
  lines: PostingLine[];
};

function validIsoDate(value: string | null): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day;
}

export function reviewNoteIsValid(note: string): boolean {
  return note.trim().length >= 12 && note.trim().length <= 1000;
}

/** No journal writes or tax decisions happen here: UI validation precedes the RPC. */
export function buildReceiptPostingPreview(
  draft: ReceiptDraft,
  expenseAccountId: string,
  paymentAccountId: string,
  accounts: readonly ReceiptAccount[],
): ReceiptPostingPreview {
  if (!draft || draft.currency !== "GBP" || !validIsoDate(draft.receipt_date) ||
      !draft.supplier_name?.trim()) {
    throw new Error("Receipt supplier, date and GBP currency must be verified before posting");
  }
  const gross = draft.total_gross_pence;
  const net = draft.total_net_pence;
  const vat = draft.total_vat_pence;
  if (!Number.isSafeInteger(gross) || !Number.isSafeInteger(net) ||
      !Number.isSafeInteger(vat) || (gross ?? 0) <= 0 || (net ?? 0) <= 0 ||
      (vat ?? -1) < 0 || (gross ?? 0) > 100000000000 ||
      (net ?? 0) + (vat ?? 0) !== gross) {
    throw new Error("Receipt gross, net and VAT amounts do not reconcile in whole pence");
  }
  if (!expenseAccountId || !paymentAccountId || expenseAccountId === paymentAccountId) {
    throw new Error("Choose two different expense and payment ledger accounts");
  }
  const expense = accounts.find(a => a.id === expenseAccountId && a.is_active && a.account_type === "expense");
  const payment = accounts.find(a => a.id === paymentAccountId && a.is_active && a.code.startsWith("10"));
  if (!expense) throw new Error("Choose an active expense ledger account");
  if (!payment) throw new Error("Choose an active bank or cash ledger account");
  const lines: PostingLine[] = [{ accountId: expense.id, direction: "debit", amountPence: net!, label: "Expense" }];
  if (vat! > 0) {
    const vatAccount = accounts.find(a => a.code === "1300" && a.is_active);
    if (!vatAccount || vatAccount.id === expense.id || vatAccount.id === payment.id)
      throw new Error("VAT control account 1300 is required; verify whether VAT is recoverable");
    lines.push({ accountId: vatAccount.id, direction: "debit", amountPence: vat!, label: "Input VAT (subject to verification)" });
  }
  lines.push({ accountId: payment.id, direction: "credit", amountPence: gross!, label: "Bank/cash payment" });
  return { grossPence: gross!, netPence: net!, vatPence: vat!, lines };
}
