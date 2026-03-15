export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <h2>1. Who We Are</h2>
        <p>
          IQ Practice Cloud is a multi-tenant SaaS platform for UK accounting firms. When your accounting practice uses our platform, we act as a <strong>data processor</strong> on behalf of your firm (the <strong>data controller</strong>).
        </p>

        <h2>2. Data We Collect</h2>
        <ul>
          <li><strong>Account data:</strong> Name, email address, firm name — collected at registration.</li>
          <li><strong>Client data:</strong> Your firm uploads client records (names, company numbers, UTRs, addresses). This data is isolated per tenant.</li>
          <li><strong>Usage data:</strong> Pages visited, features used, timestamps — for analytics and support.</li>
          <li><strong>Cookies:</strong> Essential session cookies for authentication. No third-party tracking cookies.</li>
        </ul>

        <h2>3. How We Use Your Data</h2>
        <ul>
          <li>To provide and maintain the platform</li>
          <li>To process regulatory filings (HMRC, Companies House) on your behalf</li>
          <li>To send transactional emails (password reset, notifications)</li>
          <li>To improve the product based on anonymised usage patterns</li>
        </ul>

        <h2>4. Data Retention</h2>
        <p>
          Account data is retained while your subscription is active. Client data is retained per your firm's configuration. Archived clients can be permanently deleted upon request.
        </p>

        <h2>5. Data Sharing</h2>
        <p>
          We do not sell your data. We share data only with:
        </p>
        <ul>
          <li><strong>HMRC</strong> — when you submit VAT returns or RTI payroll</li>
          <li><strong>Companies House</strong> — when you file secretarial changes</li>
          <li><strong>Payment providers</strong> — Stripe/GoCardless for billing (if configured by your firm)</li>
          <li><strong>Infrastructure providers</strong> — cloud hosting (EU/UK data centres)</li>
        </ul>

        <h2>6. Your Rights (GDPR / UK GDPR)</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Rectify inaccurate data</li>
          <li>Request deletion ("right to be forgotten")</li>
          <li>Data portability (export your data)</li>
          <li>Object to processing</li>
          <li>Withdraw consent at any time</li>
        </ul>
        <p>
          To exercise these rights, contact your firm administrator or email <strong>privacy@iqpracticecloud.com</strong>.
        </p>

        <h2>7. Security</h2>
        <p>
          All data is encrypted in transit (TLS) and at rest. Multi-tenant isolation is enforced via row-level security. Access is controlled through role-based permissions.
        </p>

        <h2>8. Cookies</h2>
        <p>
          We use only <strong>essential cookies</strong> for authentication and session management. No advertising or analytics tracking cookies are used.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We will notify registered users of material changes via email and update the "Last updated" date above.
        </p>

        <h2>10. Contact</h2>
        <p>
          Data Protection queries: <strong>privacy@iqpracticecloud.com</strong>
        </p>
      </div>
    </div>
  );
}
