import Layout from "../components/Layout";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    content: [
      {
        sub: "Account Information",
        text: "When you register, we collect your name, email address, and a hashed representation of your password. We never store plaintext passwords.",
      },
      {
        sub: "Wallet Data",
        text: "If you connect a Web3 wallet, we record your public wallet address solely to display on-chain data relevant to your account. We have no access to your private keys.",
      },
      {
        sub: "Usage Data",
        text: "We collect anonymised telemetry — page visits, feature interactions, error logs — to improve platform reliability. This data cannot be linked back to you individually.",
      },
      {
        sub: "Communications",
        text: "If you contact support, we retain the correspondence to resolve your query and improve our services.",
      },
    ],
  },
  {
    title: "2. How We Use Your Information",
    content: [
      {
        sub: "Service Delivery",
        text: "To authenticate you, personalise your dashboard, and deliver AI-powered portfolio insights.",
      },
      {
        sub: "Security",
        text: "To detect fraud, prevent unauthorised access, and comply with legal obligations.",
      },
      {
        sub: "Improvement",
        text: "To analyse aggregate usage patterns and prioritise product development.",
      },
      {
        sub: "Communication",
        text: "To send transactional emails (account alerts, security notifications). We do not send marketing emails without explicit opt-in.",
      },
    ],
  },
  {
    title: "3. Data Sharing",
    content: [
      {
        sub: "We Never Sell Your Data",
        text: "We do not sell, rent, or trade your personal information to third parties for marketing purposes.",
      },
      {
        sub: "Service Providers",
        text: "We engage vetted sub-processors (cloud hosting, analytics, email delivery) under strict data-processing agreements that prohibit secondary use.",
      },
      {
        sub: "Legal Requirements",
        text: "We may disclose information if required by law, court order, or to protect the rights and safety of our users.",
      },
    ],
  },
  {
    title: "4. Data Retention",
    content: [
      {
        sub: "Active Accounts",
        text: "We retain your data for as long as your account is active or as needed to provide services.",
      },
      {
        sub: "Deletion Requests",
        text: "You may request account deletion at any time. We will purge your personal data within 30 days, subject to legal retention obligations.",
      },
      {
        sub: "Anonymised Data",
        text: "Aggregate, de-identified analytics data may be retained indefinitely for research and product improvement.",
      },
    ],
  },
  {
    title: "5. Security",
    content: [
      {
        sub: "Encryption",
        text: "All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Sensitive fields are additionally hashed.",
      },
      {
        sub: "Access Controls",
        text: "Strict role-based access controls ensure only authorised personnel can access production data, with full audit logging.",
      },
      {
        sub: "Incident Response",
        text: "In the event of a security breach affecting your data, we will notify you within 72 hours as required by applicable law.",
      },
    ],
  },
  {
    title: "6. Your Rights",
    content: [
      {
        sub: "Access & Portability",
        text: "You may request a copy of the personal data we hold about you in a machine-readable format.",
      },
      {
        sub: "Correction",
        text: "You may update or correct inaccurate information at any time via your account settings.",
      },
      {
        sub: "Deletion",
        text: "You have the right to request erasure of your personal data ('right to be forgotten').",
      },
      {
        sub: "Objection",
        text: "You may object to processing of your data for direct marketing or profiling purposes at any time.",
      },
    ],
  },
  {
    title: "7. Cookies",
    content: [
      {
        sub: "Essential Cookies",
        text: "We use strictly necessary cookies for authentication and session management. These cannot be disabled.",
      },
      {
        sub: "Analytics Cookies",
        text: "With your consent, we use analytics cookies to understand platform usage. You can opt out at any time via your browser settings.",
      },
      {
        sub: "No Tracking Cookies",
        text: "We do not use third-party advertising or cross-site tracking cookies.",
      },
    ],
  },
  {
    title: "8. Contact Us",
    content: [
      {
        sub: "Data Controller",
        text: "BlockGuardian Inc., 101 Market Street, San Francisco, CA 94105, USA.",
      },
      {
        sub: "Privacy Inquiries",
        text: "Email privacy@blockguardian.io — we aim to respond within 5 business days.",
      },
      {
        sub: "Updates",
        text: "We will notify you by email and in-app notice of any material changes to this policy at least 30 days before they take effect.",
      },
    ],
  },
];

export default function Privacy({ darkMode, toggleDarkMode }) {
  return (
    <Layout
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      title="Privacy Policy"
    >
      <div className="max-w-3xl mx-auto animate-fade-in py-4">
        <div className="mb-10">
          <span className="badge-indigo mb-4">Legal</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mt-3 mb-3">
            Privacy Policy
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Last updated:{" "}
            <strong className="text-gray-700 dark:text-gray-300">
              April 1, 2025
            </strong>
            &ensp;·&ensp;Effective:{" "}
            <strong className="text-gray-700 dark:text-gray-300">
              April 1, 2025
            </strong>
          </p>
          <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">
            BlockGuardian Inc. (&quot;we&quot;, &quot;our&quot;, or
            &quot;us&quot;) respects your privacy. This policy explains how we
            collect, use, and protect information about you when you use our
            platform.
          </p>
        </div>

        <div className="card p-5 mb-10">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Jump to section
          </p>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map(({ title }) => (
              <a
                key={title}
                href={`#${title.replace(/\s+/g, "-").toLowerCase()}`}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-150"
              >
                {title}
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-10">
          {SECTIONS.map(({ title, content }) => (
            <section
              key={title}
              id={title.replace(/\s+/g, "-").toLowerCase()}
              className="scroll-mt-24"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 pb-3 border-b border-gray-200 dark:border-gray-800">
                {title}
              </h2>
              <div className="space-y-4">
                {content.map(({ sub, text }) => (
                  <div key={sub} className="flex gap-4">
                    <div className="flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2" />
                    <div>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                        {sub}:{" "}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Questions about this policy?{" "}
            <a
              href="mailto:privacy@blockguardian.io"
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              privacy@blockguardian.io
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
