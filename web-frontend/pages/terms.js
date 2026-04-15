import Link from "next/link";
import Layout from "../components/Layout";

const TERMS = [
  {
    title: "1. Acceptance of Terms",
    content:
      "By accessing or using BlockGuardian (the 'Service'), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you may not use the Service. These Terms constitute a legally binding agreement between you and BlockGuardian Inc.",
  },
  {
    title: "2. Eligibility",
    content:
      "You must be at least 18 years of age and legally capable of entering into contracts in your jurisdiction. By using the Service, you represent and warrant that you meet these requirements. The Service is not available where prohibited by law.",
  },
  {
    title: "3. Account Registration",
    content:
      "To access certain features you must register an account. You agree to provide accurate, current, and complete information and to keep it updated. You are responsible for safeguarding your credentials and for all activity that occurs under your account. Notify us immediately at security@blockguardian.io of any suspected unauthorised access.",
  },
  {
    title: "4. Service Description",
    content:
      "BlockGuardian provides blockchain portfolio monitoring, AI-driven analytics, market analysis tools, and smart contract exploration. All data, predictions, and recommendations are provided for informational purposes only. They do not constitute financial, investment, legal, or tax advice. You should consult a qualified professional before making investment decisions.",
  },
  {
    title: "5. Subscription & Payments",
    content:
      "Certain features require a paid subscription. Fees are charged in advance on a monthly or annual basis. All fees are non-refundable except as required by law. We reserve the right to change pricing with 30 days' notice. Continued use after a price change constitutes acceptance of the new fees.",
  },
  {
    title: "6. Intellectual Property",
    content:
      "All content, software, algorithms, trademarks, and materials on the Service are owned by or licensed to BlockGuardian Inc. and are protected by applicable intellectual property law. You are granted a limited, non-exclusive, non-transferable licence to access and use the Service for your personal or internal business purposes. You may not copy, modify, distribute, or reverse-engineer any part of the Service.",
  },
  {
    title: "7. Prohibited Uses",
    content:
      "You agree not to: (a) use the Service for unlawful purposes or in violation of any regulations; (b) attempt to gain unauthorised access to any part of the Service; (c) transmit malicious code or interfere with the Service's integrity; (d) scrape, harvest, or systematically extract data without prior written consent; (e) use the Service to manipulate markets or engage in fraudulent activities; (f) resell or sub-license access to the Service.",
  },
  {
    title: "8. Blockchain & Wallet Integration",
    content:
      "When you connect a cryptocurrency wallet, you acknowledge that: blockchain transactions are irreversible; we have no control over on-chain activity; network fees ('gas') are your sole responsibility; and wallet security, including private key management, is entirely your responsibility. We are not liable for losses arising from wallet compromises or user error.",
  },
  {
    title: "9. AI Recommendations Disclaimer",
    content:
      "AI-generated portfolio insights and recommendations are based on historical data and statistical modelling. Past performance is not indicative of future results. Markets are inherently unpredictable. BlockGuardian expressly disclaims any liability for investment decisions made in reliance on AI-generated content.",
  },
  {
    title: "10. Limitation of Liability",
    content:
      "To the maximum extent permitted by applicable law, BlockGuardian and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising out of or in connection with your use of the Service. Our aggregate liability shall not exceed the fees you paid in the 12 months preceding the claim.",
  },
  {
    title: "11. Indemnification",
    content:
      "You agree to defend, indemnify, and hold harmless BlockGuardian and its affiliates from any claims, damages, costs, and expenses (including reasonable legal fees) arising from your use of the Service, your violation of these Terms, or your violation of any third-party rights.",
  },
  {
    title: "12. Termination",
    content:
      "We may suspend or terminate your account at our discretion with or without notice if you breach these Terms or if required by law. Upon termination, your right to access the Service ceases immediately. Provisions that by their nature should survive termination (including liability limitations and dispute resolution) will do so.",
  },
  {
    title: "13. Governing Law & Disputes",
    content:
      "These Terms are governed by the laws of the State of California, USA, without regard to conflict-of-law principles. You agree to submit to the exclusive jurisdiction of the courts in San Francisco County, California, for any disputes arising under these Terms. Nothing in this clause limits our right to seek injunctive relief.",
  },
  {
    title: "14. Changes to Terms",
    content:
      "We may update these Terms at any time. We will notify you of material changes at least 30 days in advance via email and in-app notification. Continued use of the Service after the effective date constitutes acceptance of the revised Terms.",
  },
  {
    title: "15. Contact",
    content:
      "For legal inquiries, contact BlockGuardian Inc., 101 Market Street, San Francisco, CA 94105, or email legal@blockguardian.io.",
  },
];

export default function Terms({ darkMode, toggleDarkMode }) {
  return (
    <Layout
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      title="Terms of Service"
    >
      <div className="max-w-3xl mx-auto animate-fade-in py-4">
        {/* Header */}
        <div className="mb-10">
          <span className="badge-blue mb-4">Legal</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mt-3 mb-3">
            Terms of Service
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
          <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Important:</strong> Please read these Terms carefully
              before using BlockGuardian. By using our Service you agree to
              these Terms. Nothing in this document constitutes financial
              advice.
            </p>
          </div>
        </div>

        {/* Terms content */}
        <div className="space-y-8">
          {TERMS.map(({ title, content }) => (
            <section key={title} className="scroll-mt-24">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-800">
                {title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {content}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Questions or concerns about these Terms?
          </p>
          <Link
            href="/contact"
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium text-sm"
          >
            Contact our legal team →
          </Link>
        </div>
      </div>
    </Layout>
  );
}
