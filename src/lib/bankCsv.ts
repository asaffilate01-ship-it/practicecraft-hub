export type ParsedBankTransaction = {
  transaction_date: string;
  description: string;
  amount_pence: number;
  running_balance_pence: number | null;
  reference: string | null;
  transaction_type: "debit" | "credit";
  provider_transaction_id: string;
  metadata_json: { source: "csv"; source_row: number };
};

export type BankCsvResult = {
  transactions: ParsedBankTransaction[];
  errors: string[];
};

const aliases = {
  date: ["date", "transaction date", "posted date", "booking date"],
  description: ["description", "details", "transaction details", "narrative", "merchant", "payee"],
  amount: ["amount", "transaction amount", "value"],
  debit: ["debit", "debit amount", "withdrawal", "withdrawals", "paid out", "money out"],
  credit: ["credit", "credit amount", "deposit", "deposits", "paid in", "money in"],
  balance: ["balance", "running balance", "account balance"],
  reference: ["reference", "transaction reference", "bank reference", "memo"],
} as const;

const normaliseHeader = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

const parseRows = (input: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];
    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
};

const findColumn = (headers: string[], names: readonly string[]) => headers.findIndex((header) => names.includes(header));

const parseMoney = (value: string | undefined) => {
  if (!value?.trim()) return null;
  const negative = /^\s*\(.*\)\s*$/.test(value);
  const cleaned = value.replace(/[£,$\s()]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount)) return null;
  return Math.round((negative ? -Math.abs(amount) : amount) * 100);
};

const parseUkDate = (value: string | undefined) => {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const uk = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  let year: number;
  let month: number;
  let day: number;
  if (iso) {
    year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]);
  } else if (uk) {
    day = Number(uk[1]); month = Number(uk[2]); year = Number(uk[3]);
    if (year < 100) year += 2000;
  } else {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
};

const stableHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

export function parseBankCsv(input: string): BankCsvResult {
  const rows = parseRows(input.replace(/^\uFEFF/, ""));
  if (rows.length < 2) return { transactions: [], errors: ["The CSV does not contain any transaction rows."] };

  const headers = rows[0].map(normaliseHeader);
  const columns = {
    date: findColumn(headers, aliases.date),
    description: findColumn(headers, aliases.description),
    amount: findColumn(headers, aliases.amount),
    debit: findColumn(headers, aliases.debit),
    credit: findColumn(headers, aliases.credit),
    balance: findColumn(headers, aliases.balance),
    reference: findColumn(headers, aliases.reference),
  };

  const missing = [
    columns.date < 0 ? "date" : null,
    columns.description < 0 ? "description" : null,
    columns.amount < 0 && columns.debit < 0 && columns.credit < 0 ? "amount, or debit/credit" : null,
  ].filter(Boolean);
  if (missing.length) return { transactions: [], errors: [`Missing required column: ${missing.join(", ")}.`] };

  const transactions: ParsedBankTransaction[] = [];
  const errors: string[] = [];
  const occurrences = new Map<string, number>();

  rows.slice(1).forEach((row, rowIndex) => {
    const sourceRow = rowIndex + 2;
    const transactionDate = parseUkDate(row[columns.date]);
    const description = row[columns.description]?.trim();
    const directAmount = columns.amount >= 0 ? parseMoney(row[columns.amount]) : null;
    const debit = columns.debit >= 0 ? parseMoney(row[columns.debit]) : null;
    const credit = columns.credit >= 0 ? parseMoney(row[columns.credit]) : null;
    const amountPence = directAmount ?? ((credit ?? 0) - Math.abs(debit ?? 0));

    if (!transactionDate || !description || !amountPence) {
      errors.push(`Row ${sourceRow} was skipped because its date, description or amount is invalid.`);
      return;
    }

    const reference = columns.reference >= 0 ? row[columns.reference]?.trim() || null : null;
    const canonical = `${transactionDate}|${description.toLowerCase()}|${amountPence}|${reference?.toLowerCase() ?? ""}`;
    const occurrence = (occurrences.get(canonical) ?? 0) + 1;
    occurrences.set(canonical, occurrence);

    transactions.push({
      transaction_date: transactionDate,
      description,
      amount_pence: amountPence,
      running_balance_pence: columns.balance >= 0 ? parseMoney(row[columns.balance]) : null,
      reference,
      transaction_type: amountPence < 0 ? "debit" : "credit",
      provider_transaction_id: `csv_${stableHash(canonical)}_${occurrence}`,
      metadata_json: { source: "csv", source_row: sourceRow },
    });
  });

  return { transactions, errors };
}
