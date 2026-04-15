import Link from "next/link";
import Layout from "../components/Layout";

const TEAM = [
  {
    name: "Alexandra Chen",
    role: "CEO & Co-Founder",
    bio: "Former Goldman Sachs quant with 12 years in algorithmic trading and blockchain infrastructure.",
    initials: "AC",
    color:
      "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400",
  },
  {
    name: "Marcus Rivera",
    role: "CTO & Co-Founder",
    bio: "Ex-Ethereum Foundation contributor. Built core consensus modules for 3 Layer-2 protocols.",
    initials: "MR",
    color:
      "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
  },
  {
    name: "Priya Nair",
    role: "Head of AI Research",
    bio: "PhD in Machine Learning from MIT. Pioneered the LSTM-GARCH hybrid model powering our predictions.",
    initials: "PN",
    color:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
  },
  {
    name: "James Okonkwo",
    role: "Chief Security Officer",
    bio: "15 years in cybersecurity. Led smart contract audit teams at two of the top Web3 security firms.",
    initials: "JO",
    color:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
  },
];

const MILESTONES = [
  {
    year: "2021",
    title: "Founded",
    desc: "BlockGuardian incorporated with seed funding of $3.2M.",
  },
  {
    year: "2022",
    title: "Series A",
    desc: "$18M raised. Launched core portfolio monitoring platform.",
  },
  {
    year: "2023",
    title: "AI Engine",
    desc: "Deployed LSTM-GARCH ensemble model with 91%+ accuracy.",
  },
  {
    year: "2024",
    title: "Scale",
    desc: "Surpassed $1B in monitored assets. 300+ enterprise clients.",
  },
  {
    year: "2025",
    title: "Today",
    desc: "Over $2.4B monitored. Expanding to 10 new blockchain networks.",
  },
];

export default function About({ darkMode, toggleDarkMode }) {
  return (
    <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode} title="About">
      <div className="max-w-5xl mx-auto animate-fade-in">
        {/* Hero */}
        <div className="text-center mb-16 pt-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200/60 dark:border-indigo-700/50 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Est. 2021 · San Francisco, CA
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-5 tracking-tight">
            Securing the{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
              future of finance
            </span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            BlockGuardian was built by traders, engineers, and security
            researchers who were tired of fragmented tooling. We unified
            blockchain analytics, AI-driven insights, and enterprise security
            into a single platform.
          </p>
        </div>

        {/* Mission */}
        <div className="card p-8 sm:p-12 mb-12 bg-gradient-to-br from-indigo-50 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/20 border-indigo-100 dark:border-indigo-900/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Our Mission
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                We believe every investor — from retail participants to
                institutional funds — deserves access to the same caliber of
                risk intelligence that was once exclusive to Wall Street.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                By combining on-chain transparency with machine learning, we
                make blockchain assets as manageable as traditional securities,
                without sacrificing decentralization.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "$2.4B+", label: "Assets Monitored" },
                { value: "450+", label: "Active Users" },
                { value: "99.9%", label: "Uptime SLA" },
                { value: "12ms", label: "Avg Latency" },
              ].map(({ value, label }) => (
                <div key={label} className="card p-5 text-center">
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                    {value}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Our Journey
          </h2>
          <div className="relative">
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-300 to-violet-300 dark:from-indigo-700 dark:to-violet-700 -translate-x-1/2" />
            <div className="space-y-8">
              {MILESTONES.map(({ year, title, desc }, i) => (
                <div
                  key={year}
                  className={`relative flex items-start gap-6 ${i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"} pl-12 sm:pl-0`}
                >
                  <div className="absolute left-0 sm:left-1/2 w-8 h-8 -translate-x-1/2 bg-white dark:bg-gray-900 border-2 border-indigo-500 rounded-full flex items-center justify-center z-10">
                    <span className="w-3 h-3 rounded-full bg-indigo-500" />
                  </div>
                  <div
                    className={`sm:w-5/12 ${i % 2 === 0 ? "sm:text-right sm:pr-10" : "sm:text-left sm:pl-10"}`}
                  >
                    <div className="card p-4">
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        {year}
                      </span>
                      <h3 className="font-semibold text-gray-900 dark:text-white mt-0.5">
                        {title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {desc}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:block sm:w-5/12" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            The Team
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
            World-class engineers, researchers, and finance professionals united
            by one goal.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {TEAM.map(({ name, role, bio, initials, color }) => (
              <div key={name} className="card-hover p-6 flex gap-4">
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${color}`}
                >
                  {initials}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {name}
                  </h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-2">
                    {role}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="card overflow-hidden mb-8">
          <div className="relative p-10 text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-95 dark:opacity-90" />
            <div className="relative">
              <h2 className="text-2xl font-bold text-white mb-3">
                Ready to get started?
              </h2>
              <p className="text-indigo-200 mb-6 max-w-sm mx-auto">
                Join 450+ investors already using BlockGuardian.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-all duration-200 shadow-lg"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-700/60 text-white font-semibold rounded-xl hover:bg-indigo-700/80 border border-white/20 transition-all duration-200"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
