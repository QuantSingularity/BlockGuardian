import Link from "next/link";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Layout from "../components/Layout";

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

const portfolioValueData = [
  { month: "Jan", value: 1000000 },
  { month: "Feb", value: 1050000 },
  { month: "Mar", value: 1120000 },
  { month: "Apr", value: 1080000 },
  { month: "May", value: 1150000 },
  { month: "Jun", value: 1220000 },
  { month: "Jul", value: 1245000 },
];

const assetAllocationData = [
  { name: "Stocks", value: 45 },
  { name: "Bonds", value: 25 },
  { name: "Crypto", value: 15 },
  { name: "Cash", value: 10 },
  { name: "Commodities", value: 5 },
];

const recentActivities = [
  {
    type: "Purchase",
    asset: "AAPL",
    amount: "$25,000",
    date: "Today, 10:30 AM",
    status: "Completed",
    positive: true,
  },
  {
    type: "Sale",
    asset: "TSLA",
    amount: "$18,500",
    date: "Yesterday, 3:45 PM",
    status: "Completed",
    positive: true,
  },
  {
    type: "Deposit",
    asset: "USD",
    amount: "$50,000",
    date: "Apr 7, 2025",
    status: "Completed",
    positive: true,
  },
  {
    type: "Rebalance",
    asset: "Portfolio",
    amount: "—",
    date: "Apr 5, 2025",
    status: "Completed",
    positive: null,
  },
  {
    type: "Dividend",
    asset: "VTI",
    amount: "$1,250",
    date: "Apr 3, 2025",
    status: "Completed",
    positive: true,
  },
];

const notifications = [
  {
    title: "Portfolio Rebalance Recommended",
    description:
      "Our AI suggests rebalancing to reduce technology exposure by 5%.",
    time: "2 hours ago",
    priority: "high",
  },
  {
    title: "New AI Insight Available",
    description: "A new market analysis report is available for your review.",
    time: "5 hours ago",
    priority: "medium",
  },
  {
    title: "Dividend Payment Received",
    description: "You received a dividend payment of $1,250 from VTI.",
    time: "2 days ago",
    priority: "low",
  },
  {
    title: "Smart Contract Executed",
    description: "Your automated trading smart contract executed successfully.",
    time: "3 days ago",
    priority: "medium",
  },
];

const upcomingEvents = [
  {
    title: "Quarterly Portfolio Review",
    date: "Apr 15, 2025",
    time: "10:00 AM",
  },
  {
    title: "Earnings Report: AAPL",
    date: "Apr 18, 2025",
    time: "After Market Close",
  },
  {
    title: "Fed Interest Rate Decision",
    date: "Apr 22, 2025",
    time: "2:00 PM",
  },
];

const TABS = ["overview", "portfolio", "activity", "notifications", "settings"];

const priorityColors = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

const priorityBadge = {
  high: "badge-red",
  medium: "badge-yellow",
  low: "badge-green",
};

const DEFAULT_SETTINGS = {
  "Email Notifications": true,
  "Two-Factor Authentication": false,
  "AI Recommendations": true,
  "Dark Mode": false,
};

export default function Dashboard({ darkMode, toggleDarkMode }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const toggleSetting = (label) => {
    setSettings((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <Layout
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      title="Dashboard"
    >
      <div className="max-w-7xl mx-auto animate-fade-in">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Welcome back! Here&apos;s an overview of your portfolio and recent
            activities.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-800">
          <nav className="-mb-px flex gap-1 overflow-x-auto scrollbar-thin">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-button capitalize ${
                  activeTab === tab
                    ? "tab-button-active"
                    : "tab-button-inactive"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="animate-slide-up">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {[
                {
                  label: "Total Portfolio Value",
                  value: "$1,245,000",
                  change: "+2.1%",
                  sub: "today",
                  positive: true,
                },
                {
                  label: "Monthly Return",
                  value: "+5.8%",
                  change: "+1.2%",
                  sub: "vs benchmark",
                  positive: true,
                },
                {
                  label: "YTD Return",
                  value: "+18.3%",
                  change: "+3.5%",
                  sub: "vs benchmark",
                  positive: true,
                },
                {
                  label: "Available Cash",
                  value: "$124,500",
                  change: "10%",
                  sub: "of portfolio",
                  positive: null,
                },
              ].map(({ label, value, change, sub, positive }) => (
                <div key={label} className="stat-card">
                  <p className="stat-label">{label}</p>
                  <p className="stat-value">{value}</p>
                  <p
                    className={
                      positive === true
                        ? "stat-change-positive"
                        : positive === false
                          ? "stat-change-negative"
                          : "text-sm text-gray-500 dark:text-gray-400"
                    }
                  >
                    {change}{" "}
                    <span className="text-gray-400 dark:text-gray-500 font-normal">
                      {sub}
                    </span>
                  </p>
                </div>
              ))}
            </div>

            {/* Portfolio Value Chart */}
            <div className="card p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="section-title">Portfolio Value</h2>
                <span className="badge badge-green">Live</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={portfolioValueData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="dashGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#6366f1"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6366f1"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                      className="dark:stroke-gray-700"
                    />
                    <Tooltip
                      formatter={(value) => [
                        `$${value.toLocaleString()}`,
                        "Value",
                      ]}
                      contentStyle={{
                        borderRadius: "0.75rem",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#dashGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Asset Allocation + Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="card p-6">
                <h2 className="section-title mb-5">Asset Allocation</h2>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {assetAllocationData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value}%`, "Allocation"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="section-title mb-4">Recent Activity</h2>
                <div className="space-y-3 max-h-56 overflow-y-auto scrollbar-thin">
                  {recentActivities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.type}:{" "}
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {activity.asset}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {activity.date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {activity.amount}
                        </p>
                        <span className="badge-green text-xs">
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  View All Activity
                </button>
              </div>
            </div>

            {/* Notifications + Upcoming Events */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="card p-6">
                <h2 className="section-title mb-4">Notifications</h2>
                <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
                  {notifications.map((n, index) => (
                    <div
                      key={index}
                      className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div
                        className={`flex-shrink-0 mt-1.5 w-2 h-2 rounded-full ${priorityColors[n.priority]}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {n.title}
                          </p>
                          <span
                            className={`badge ${priorityBadge[n.priority]} flex-shrink-0`}
                          >
                            {n.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {n.description}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {n.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  View All
                </button>
              </div>

              <div className="card p-6">
                <h2 className="section-title mb-4">Upcoming Events</h2>
                <div className="space-y-3">
                  {upcomingEvents.map((event, index) => (
                    <div
                      key={index}
                      className="flex gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {event.date} &middot; {event.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  View Calendar
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
              <h2 className="section-title mb-5">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Deposit", icon: "M12 4.5v15m7.5-7.5h-15" },
                  {
                    label: "Transfer",
                    icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
                  },
                  {
                    label: "Trade",
                    icon: "M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5",
                  },
                  {
                    label: "Reports",
                    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
                  },
                ].map(({ label, icon }) => (
                  <button
                    key={label}
                    className="group card-hover p-4 flex flex-col items-center gap-2.5 text-center"
                  >
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors duration-200">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d={icon}
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === "portfolio" && (
          <div className="card p-8 animate-slide-up">
            <h2 className="section-title mb-3">Portfolio Details</h2>
            <p className="text-gray-500 dark:text-gray-400">
              Visit the{" "}
              <Link
                href="/portfolio"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Portfolio page
              </Link>{" "}
              for full details including performance history, asset breakdown,
              risk metrics, and AI recommendations.
            </p>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="card p-6 animate-slide-up">
            <h2 className="section-title mb-5">Activity History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="table-header">Type</th>
                    <th className="table-header">Asset</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((a, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="table-cell font-medium">{a.type}</td>
                      <td className="table-cell text-indigo-600 dark:text-indigo-400 font-mono">
                        {a.asset}
                      </td>
                      <td className="table-cell font-semibold">{a.amount}</td>
                      <td className="table-cell text-gray-400 dark:text-gray-500">
                        {a.date}
                      </td>
                      <td className="table-cell">
                        <span className="badge-green">{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="card p-6 animate-slide-up">
            <h2 className="section-title mb-5">All Notifications</h2>
            <div className="space-y-3">
              {notifications.map((n, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer"
                >
                  <div
                    className={`flex-shrink-0 mt-1 w-2.5 h-2.5 rounded-full ${priorityColors[n.priority]}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {n.title}
                      </p>
                      <span
                        className={`badge ${priorityBadge[n.priority]} capitalize`}
                      >
                        {n.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {n.description}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                      {n.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="card p-6 animate-slide-up">
            <h2 className="section-title mb-6">Account Settings</h2>
            <div className="space-y-5 max-w-lg">
              {[
                {
                  label: "Email Notifications",
                  desc: "Receive alerts for portfolio changes and recommendations",
                },
                {
                  label: "Two-Factor Authentication",
                  desc: "Add an extra layer of security to your account",
                },
                {
                  label: "AI Recommendations",
                  desc: "Get personalized AI-powered portfolio suggestions",
                },
                {
                  label: "Dark Mode",
                  desc: "Use dark theme across the platform",
                },
              ].map(({ label, desc }) => {
                const isOn = label === "Dark Mode" ? darkMode : settings[label];
                const handleToggle = () => {
                  if (label === "Dark Mode") {
                    toggleDarkMode();
                  } else {
                    toggleSetting(label);
                  }
                };
                return (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {desc}
                      </p>
                    </div>
                    <button
                      onClick={handleToggle}
                      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${isOn ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"}`}
                      aria-label={`Toggle ${label}`}
                      aria-pressed={isOn}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${isOn ? "translate-x-5" : "translate-x-0"}`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
