export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <h2>1. Acceptance</h2>
        <p>
          By creating an account or using IQ Practice Cloud, you agree to these Terms. If you are using the platform on behalf of an organisation, you represent that you have authority to bind that organisation.
        </p>

        <h2>2. Service Description</h2>
        <p>
          IQ Practice Cloud is a cloud-based practice management platform for UK accounting firms. Services include bookkeeping, VAT MTD, payroll RTI, company secretarial, AML/KYC, billing, and client portal capabilities.
        </p>

        <h2>3. Accounts & Security</h2>
        <ul>
          <li>You must provide accurate registration information</li>
          <li>You are responsible for maintaining the security of your account credentials</li>
          <li>You must notify us immediately of any unauthorised access</li>
          <li>We reserve the right to suspend accounts that violate these Terms</li>
        </ul>

        <h2>4. Data Ownership</h2>
        <p>
          You retain ownership of all data you upload to the platform. We do not claim any intellectual property rights over your client data, documents, or financial records.
        </p>

        <h2>5. Subscriptions & Billing</h2>
        <ul>
          <li>Subscriptions are billed monthly or annually as selected</li>
          <li>Free trials last 14 days from account creation</li>
          <li>Cancellation takes effect at the end of the current billing period</li>
          <li>Refunds are at our discretion and assessed on a case-by-case basis</li>
        </ul>

        <h2>6. Acceptable Use</h2>
        <p>You must not:</p>
        <ul>
          <li>Use the platform for any unlawful purpose</li>
          <li>Attempt to access other tenants' data</li>
          <li>Reverse-engineer or resell the platform</li>
          <li>Upload malicious content or attempt to compromise security</li>
        </ul>

        <h2>7. Regulatory Submissions</h2>
        <p>
          While we facilitate submissions to HMRC and Companies House, your firm remains solely responsible for the accuracy and timeliness of all regulatory filings.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, IQ Practice Cloud shall not be liable for any indirect, incidental, or consequential damages arising from use of the platform.
        </p>

        <h2>9. Termination</h2>
        <p>
          Either party may terminate the agreement with 30 days' written notice. Upon termination, you may export your data for 90 days before it is permanently deleted.
        </p>

        <h2>10. Governing Law</h2>
        <p>
          These Terms are governed by the laws of England and Wales. Disputes shall be subject to the exclusive jurisdiction of the English courts.
        </p>

        <h2>11. Contact</h2>
        <p>
          Legal queries: <strong>legal@iqpracticecloud.com</strong>
        </p>
      </div>
    </div>
  );
}
