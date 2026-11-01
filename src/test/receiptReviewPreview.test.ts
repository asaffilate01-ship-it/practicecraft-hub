import { describe, expect, it } from "vitest";
import { buildReceiptPostingPreview, reviewNoteIsValid } from "@/lib/receiptReview";

const accounts = [
  { id: "expense", code: "5000", account_type: "expense", is_active: true },
  { id: "bank", code: "1000", account_type: "asset", is_active: true },
  { id: "vat", code: "1300", account_type: "asset", is_active: true },
  { id: "inactive", code: "5600", account_type: "expense", is_active: false },
];
const draft = { supplier_name: "Stationery", currency: "GBP", receipt_date: "2026-10-30", total_gross_pence: 1200, total_net_pence: 1000, total_vat_pence: 200 };
describe("TaxLounge reviewed receipt preview", () => {
  it("creates three balanced lines without posting", () => {
    const result = buildReceiptPostingPreview(draft, "expense", "bank", accounts);
    expect(result.lines).toHaveLength(3);
    expect(result.lines.filter(l => l.direction === "debit").reduce((v,l)=>v+l.amountPence,0)).toBe(1200);
    expect(result.lines.filter(l => l.direction === "credit").reduce((v,l)=>v+l.amountPence,0)).toBe(1200);
  });
  it("creates two balanced lines without VAT", () => {
    expect(buildReceiptPostingPreview({ ...draft, total_gross_pence: 1000, total_vat_pence: 0 }, "expense", "bank", accounts).lines).toHaveLength(2);
  });
  it("refuses invalid amounts and invalid calendar dates", () => {
    for (const changed of [
      { total_net_pence: 900 }, { total_gross_pence: 1200.5 },
      { total_vat_pence: -1 }, { total_net_pence: null },
      { receipt_date: "2026-02-30" }, { receipt_date: null },
      { currency: "USD" }, { supplier_name: "" },
    ]) expect(() => buildReceiptPostingPreview({ ...draft, ...changed }, "expense", "bank", accounts)).toThrow();
  });
  it("requires active and distinct practice accounts", () => {
    for (const [expense,bank] of [["bank","expense"],["expense","expense"],["inactive","bank"],["expense","vat"],["nope","bank"]])
      expect(() => buildReceiptPostingPreview(draft, expense, bank, accounts)).toThrow();
  });
  it("blocks VAT posting without a mapped VAT control", () => {
    expect(() => buildReceiptPostingPreview(draft,"expense","bank",accounts.filter(x=>x.code!=="1300"))).toThrow("VAT control");
  });
  it("requires a meaningful review note without storing document text", () => {
    expect(reviewNoteIsValid("Checked original invoice and VAT eligibility")).toBe(true);
    expect(reviewNoteIsValid("checked")).toBe(false);
    expect(reviewNoteIsValid("a".repeat(1001))).toBe(false);
  });
});
