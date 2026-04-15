import Link from "next/link";
import Layout from "../components/Layout";

export default function Custom404({ darkMode, toggleDarkMode }) {
  return (
    <Layout
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      title="Page Not Found"
    >
      <div className="max-w-2xl mx-auto text-center py-20 animate-fade-in">
        {/* Illustration */}
        <div className="relative inline-block mb-8">
          <div className="w-32 h-32 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/20 rounded-3xl flex items-center justify-center mx-auto">
            <svg
              className="w-16 h-16 text-indigo-400 dark:text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <span className="absolute -top-2 -right-2 px-2.5 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-lg">
            404
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
          Page not found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 leading-relaxed max-w-md mx-auto">
          The block you&apos;re looking for doesn&apos;t exist on this chain. It
          may have been moved, renamed, or never deployed.
        </p>

        {/* Quick links */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <Link href="/" className="btn-primary">
            Go Home
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Dashboard
          </Link>
          <Link href="/contact" className="btn-secondary">
            Contact Support
          </Link>
        </div>

        {/* Popular pages */}
        <div className="card p-6 text-left">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
            Popular Pages
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                href: "/portfolio",
                label: "Portfolio",
                desc: "Manage your assets",
              },
              {
                href: "/market-analysis",
                label: "Market Analysis",
                desc: "Real-time market data",
              },
              {
                href: "/ai-recommendations",
                label: "AI Recommendations",
                desc: "AI-powered insights",
              },
              {
                href: "/blockchain-explorer",
                label: "Blockchain Explorer",
                desc: "Explore on-chain data",
              },
            ].map(({ href, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 group"
              >
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors duration-150">
                  <svg
                    className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
