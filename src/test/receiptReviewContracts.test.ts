// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
describe("TaxLounge OCR intake safety", () => {
  it("returns no model-generated journal or financial approval without separate RPC", () => {
    const scanner = readFileSync("src/components/bookkeeping/ReceiptUploader.tsx", "utf8");
    expect(scanner).not.toContain('from("journal_entries")');
    expect(scanner).not.toContain('from("journal_lines")');
    expect(scanner).toContain('navigate(`/receipt-reviews?');
    const queue = readFileSync("src/pages/ReceiptReviewQueue.tsx", "utf8");
    expect(queue).toContain('supabase.rpc("post_receipt_review"');
    expect(queue).not.toContain('from("journal_entries")');
  });
  it("validates AI output BEFORE uploading and writing protected extraction records", () => {
    const api = readFileSync("supabase/functions/receipt-ocr/index.ts", "utf8");
    const approval = api.indexOf("validateReceipt(JSON.parse");
    const upload = api.indexOf(".upload(filePath, file");
    const save = api.indexOf('extractionWriter\n      .from("receipt_extractions")');
    expect(approval).toBeGreaterThan(0);
    expect(upload).toBeGreaterThan(approval);
    expect(save).toBeGreaterThan(upload);
    expect(api).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(api).toContain('await requirePermissions(supabase, actor, ["documents.upload", "ledger.view", "ocr.view"])');
  });
});
