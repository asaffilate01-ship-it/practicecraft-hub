import { describe, expect, it } from "vitest";
import { parseBankCsv } from "@/lib/bankCsv";

describe("parseBankCsv", () => {
  it("parses UK debit and credit statement columns", () => {
    const result = parseBankCsv([
      "Date,Description,Debit,Credit,Balance,Reference",
      '31/10/2025,"Laptop, Currys",1249.00,,8751.00,INV-92',
      "30/10/2025,Client receipt,,4800.00,10000.00,INV-1048",
    ].join("\n"));

    expect(result.errors).toEqual([]);
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject({ transaction_date: "2025-10-31", amount_pence: -124900, transaction_type: "debit" });
    expect(result.transactions[1]).toMatchObject({ amount_pence: 480000, transaction_type: "credit" });
  });

  it("reports missing required columns", () => {
    const result = parseBankCsv("Date,Note\n31/10/2025,Nothing");
    expect(result.transactions).toEqual([]);
    expect(result.errors[0]).toContain("Missing required column");
  });

  it("creates stable IDs so re-imports can be ignored", () => {
    const csv = "Date,Description,Amount\n2025-10-31,Software,-10.50";
    expect(parseBankCsv(csv).transactions[0].provider_transaction_id).toBe(parseBankCsv(csv).transactions[0].provider_transaction_id);
  });
});
