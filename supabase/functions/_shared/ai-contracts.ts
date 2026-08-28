export const AI_PROMPT_VERSION = "2026-08-28.1";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type Confidence = "high" | "medium" | "low";

export type CategorisationSuggestion = {
  transaction_id: string;
  account_code: string;
  confidence: Confidence;
  reason: string;
};

export type ReceiptExtraction = {
  supplier_name: string;
  invoice_number: string | null;
  receipt_date: string | null;
  currency: string;
  subtotal_pence: number;
  vat_pence: number;
  total_pence: number;
  vat_rate: number | null;
  payment_method: string | null;
  suggested_account_code: string | null;
  line_items: Array<{
    description: string;
    quantity: number | null;
    unit_price_pence: number | null;
    total_pence: number;
  }>;
  confidence: Confidence;
};

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function uniqueUuidList(value: unknown, maximum = 50): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isUuid))].slice(0, maximum);
}

export function sanitisePromptText(value: unknown, maximum = 500): string {
  const withoutControls = Array.from(String(value ?? ""), (character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 ? " " : character;
  }).join("");
  return withoutControls
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function isConfidence(value: unknown): value is Confidence {
  return value === "high" || value === "medium" || value === "low";
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function finitePence(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

function validIsoDate(value: unknown): string | null {
  const text = sanitisePromptText(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text ? null : text;
}

export function validateCategorisationSuggestions(
  value: unknown,
  permittedTransactionIds: ReadonlySet<string>,
  permittedAccountCodes: ReadonlySet<string>,
): CategorisationSuggestion[] {
  const root = asObject(value);
  const rows = Array.isArray(root?.suggestions) ? root.suggestions : [];
  const accepted: CategorisationSuggestion[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const item = asObject(row);
    if (!item) continue;
    const transactionId = typeof item.transaction_id === "string" ? item.transaction_id : "";
    const accountCode = sanitisePromptText(item.account_code, 40);
    if (
      seen.has(transactionId)
      || !permittedTransactionIds.has(transactionId)
      || !permittedAccountCodes.has(accountCode)
      || !isConfidence(item.confidence)
      || !sanitisePromptText(item.reason, 300)
    ) continue;

    seen.add(transactionId);
    accepted.push({
      transaction_id: transactionId,
      account_code: accountCode,
      confidence: item.confidence,
      reason: sanitisePromptText(item.reason, 300),
    });
  }
  return accepted;
}

export function normaliseReceiptExtraction(value: unknown): ReceiptExtraction {
  const root = asObject(value);
  if (!root) throw new Error("AI extraction was not an object");

  const supplierName = sanitisePromptText(root.supplier_name, 200);
  if (!supplierName) throw new Error("AI extraction did not include a supplier name");
  if (!isConfidence(root.confidence)) throw new Error("AI extraction confidence is invalid");

  const receiptDate = validIsoDate(root.receipt_date);
  const currencyValue = sanitisePromptText(root.currency, 3).toUpperCase();
  const currency = /^[A-Z]{3}$/.test(currencyValue) ? currencyValue : "GBP";
  const totalPence = finitePence(root.total_pence);
  const vatPence = Math.min(finitePence(root.vat_pence), totalPence);
  const submittedSubtotal = finitePence(root.subtotal_pence, totalPence - vatPence);
  const subtotalPence = Math.abs(submittedSubtotal + vatPence - totalPence) <= 2
    ? submittedSubtotal
    : totalPence - vatPence;
  const rows = Array.isArray(root.line_items) ? root.line_items : [];

  return {
    supplier_name: supplierName,
    invoice_number: sanitisePromptText(root.invoice_number, 100) || null,
    receipt_date: receiptDate,
    currency,
    subtotal_pence: subtotalPence,
    vat_pence: vatPence,
    total_pence: totalPence,
    vat_rate: Number.isFinite(Number(root.vat_rate)) && Number(root.vat_rate) >= 0 && Number(root.vat_rate) <= 100
      ? Number(root.vat_rate)
      : null,
    payment_method: sanitisePromptText(root.payment_method, 60) || null,
    suggested_account_code: sanitisePromptText(root.suggested_account_code, 40) || null,
    line_items: rows.slice(0, 200).flatMap((row) => {
      const item = asObject(row);
      const description = sanitisePromptText(item?.description, 300);
      if (!item || !description) return [];
      return [{
        description,
        quantity: Number.isFinite(Number(item.quantity)) && Number(item.quantity) >= 0 ? Number(item.quantity) : null,
        unit_price_pence: Number.isFinite(Number(item.unit_price_pence)) ? finitePence(item.unit_price_pence) : null,
        total_pence: finitePence(item.total_pence),
      }];
    }),
    confidence: root.confidence,
  };
}
