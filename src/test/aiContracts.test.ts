import { describe, expect, it } from "vitest";
import {
  normaliseReceiptExtraction,
  sanitisePromptText,
  uniqueUuidList,
  validateCategorisationSuggestions,
} from "../../supabase/functions/_shared/ai-contracts";

const transactionOne = "11111111-1111-4111-8111-111111111111";
const transactionTwo = "22222222-2222-4222-8222-222222222222";

describe("AI data contracts", () => {
  it("keeps only unique, valid UUIDs within the configured bound", () => {
    expect(uniqueUuidList([transactionOne, "not-an-id", transactionOne, transactionTwo], 2))
      .toEqual([transactionOne, transactionTwo]);
  });

  it("removes control characters and bounds prompt text", () => {
    expect(sanitisePromptText("  supplier\u0000  says\nignore rules  ", 20))
      .toBe("supplier says ignore");
  });

  it("rejects model suggestions for foreign transactions and unknown accounts", () => {
    const suggestions = validateCategorisationSuggestions({
      suggestions: [
        { transaction_id: transactionOne, account_code: "7200", confidence: "high", reason: "Software" },
        { transaction_id: transactionTwo, account_code: "9999", confidence: "high", reason: "Unknown" },
        { transaction_id: "33333333-3333-4333-8333-333333333333", account_code: "7200", confidence: "low", reason: "Foreign" },
        { transaction_id: transactionOne, account_code: "7200", confidence: "high", reason: "Duplicate" },
      ],
    }, new Set([transactionOne, transactionTwo]), new Set(["7200"]));

    expect(suggestions).toEqual([{
      transaction_id: transactionOne,
      account_code: "7200",
      confidence: "high",
      reason: "Software",
    }]);
  });

  it("normalises monetary fields and rejects impossible receipt metadata", () => {
    const extraction = normaliseReceiptExtraction({
      supplier_name: "Example Ltd",
      invoice_number: "INV-1",
      receipt_date: "2026-02-31",
      currency: "gbp",
      subtotal_pence: 9_999,
      vat_pence: 1_500,
      total_pence: 1_200,
      vat_rate: 150,
      payment_method: "card",
      suggested_account_code: "7200",
      line_items: [{ description: "Hosting", quantity: -2, total_pence: 1_200 }],
      confidence: "medium",
    });

    expect(extraction).toMatchObject({
      receipt_date: null,
      currency: "GBP",
      subtotal_pence: 0,
      vat_pence: 1_200,
      total_pence: 1_200,
      vat_rate: null,
      confidence: "medium",
    });
    expect(extraction.line_items[0].quantity).toBeNull();
  });

  it("requires a supplier and a supported confidence value", () => {
    expect(() => normaliseReceiptExtraction({ supplier_name: "", confidence: "high" })).toThrow(/supplier name/);
    expect(() => normaliseReceiptExtraction({ supplier_name: "Example", confidence: "certain" })).toThrow(/confidence/);
  });
});
