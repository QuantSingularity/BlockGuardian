import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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

// ─── Mock data ────────────────────────────────────────────────────────────────
const userGrowthData = [
  { month: "Jan", users: 120 },
  { month: "Feb", users: 150 },
  { month: "Mar", users: 200 },
  { month: "Apr", users: 250 },
  { month: "May", users: 300 },
  { month: "Jun", users: 380 },
  { month: "Jul", users: 450 },
];
const transactionVolumeData = [
  { month: "Jan", volume: 1200000 },
  { month: "Feb", volume: 1500000 },
  { month: "Mar", volume: 1800000 },
  { month: "Apr", volume: 1600000 },
  { month: "May", volume: 2100000 },
  { month: "Jun", volume: 2400000 },
  { month: "Jul", volume: 2800000 },
];
const userTiersData = [
  { name: "Basic", value: 250 },
  { name: "Premium", value: 150 },
  { name: "Enterprise", value: 50 },
];
const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

const recentUsers = [
  {
    id: "USR001",
    name: "John Smith",
    email: "john.smith@example.com",
    joined: "Apr 9, 2025",
    tier: "Premium",
    status: "Active",
  },
  {
    id: "USR002",
    name: "Emily Johnson",
    email: "emily.johnson@example.com",
    joined: "Apr 8, 2025",
    tier: "Basic",
    status: "Active",
  },
  {
    id: "USR003",
    name: "Michael Brown",
    email: "michael.brown@example.com",
    joined: "Apr 7, 2025",
    tier: "Enterprise",
    status: "Active",
  },
  {
    id: "USR004",
    name: "Sarah Davis",
    email: "sarah.davis@example.com",
    joined: "Apr 5, 2025",
    tier: "Premium",
    status: "Inactive",
  },
  {
    id: "USR005",
    name: "Robert Wilson",
    email: "robert.wilson@example.com",
    joined: "Apr 3, 2025",
    tier: "Basic",
    status: "Active",
  },
];

const systemAlerts = [
  {
    title: "High API Usage",
    description: "API usage exceeded 85% of quota.",
    time: "2 hours ago",
    severity: "warning",
  },
  {
    title: "Database Backup Completed",
    description: "Scheduled database backup completed successfully.",
    time: "5 hours ago",
    severity: "info",
  },
  {
    title: "Failed Login Attempts",
    description: "Multiple failed login attempts from IP 192.168.1.105.",
    time: "1 day ago",
    severity: "critical",
  },
  {
    title: "System Update Available",
    description: "New system update v2.3.5 is available for installation.",
    time: "2 days ago",
    severity: "info",
  },
];

const recentTransactions = [
  {
    id: "TRX001",
    user: "John Smith",
    type: "Deposit",
    amount: "$25,000",
    date: "Apr 9, 2025",
    status: "Completed",
  },
  {
    id: "TRX002",
    user: "Emily Johnson",
    type: "Withdrawal",
    amount: "$10,000",
    date: "Apr 8, 2025",
    status: "Pending",
  },
  {
    id: "TRX003",
    user: "Michael Brown",
    type: "Trade",
    amount: "$50,000",
    date: "Apr 7, 2025",
    status: "Completed",
  },
  {
    id: "TRX004",
    user: "Sarah Davis",
    type: "Deposit",
    amount: "$15,000",
    date: "Apr 6, 2025",
    status: "Completed",
  },
  {
    id: "TRX005",
    user: "Robert Wilson",
    type: "Trade",
    amount: "$8,500",
    date: "Apr 5, 2025",
    status: "Failed",
  },
];

const TABS = [
  "dashboard",
  "users",
  "transactions",
  "analytics",
  "settings",
  "logs",
];
const TAB_LABELS = {
  dashboard: "Dashboard",
  users: "User Management",
  transactions: "Transactions",
  analytics: "Analytics",
  settings: "System Settings",
  logs: "System Logs",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusBadge = (status) => {
  const map = {
    Active: "badge-green",
    Inactive: "badge-red",
    Completed: "badge-green",
    Pending: "badge-yellow",
    Failed: "badge-red",
  };
  return map[status] || "badge-blue";
};

const alertColor = {
  warning: "badge-yellow",
  info: "badge-blue",
  critical: "badge-red",
};
const alertBorder = {
  warning:
    "border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20",
  info: "border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/20",
  critical:
    "border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20",
};

const tierBadge = {
  Basic: "badge-blue",
  Premium: "badge-indigo",
  Enterprise: "badge-green",
};

const QUICK_ACTIONS = [
  {
    label: "Add User",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    label: "Generate Report",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    label: "System Alerts",
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  },
  {
    label: "Settings",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
];

const SYSTEM_SETTINGS = [
  {
    label: "Maintenance Mode",
    desc: "Put the platform into read-only maintenance mode",
    on: false,
  },
  {
    label: "New User Registration",
    desc: "Allow new users to create accounts",
    on: true,
  },
  {
    label: "AI Recommendations",
    desc: "Enable AI-powered insights platform-wide",
    on: true,
  },
  {
    label: "Email Notifications",
    desc: "Send system email notifications to users",
    on: true,
  },
  {
    label: "2FA Enforcement",
    desc: "Require two-factor authentication for all admin accounts",
    on: false,
  },
];

const LOGS = [
  {
    time: "2025-04-09 14:32:11",
    level: "INFO",
    message: "User USR001 logged in from 203.0.113.42",
  },
  {
    time: "2025-04-09 14:15:03",
    level: "WARN",
    message: "API rate limit reached for client token bg_prod_7f3a",
  },
  {
    time: "2025-04-09 13:58:44",
    level: "INFO",
    message: "Database backup completed — 2.4 GB written to S3",
  },
  {
    time: "2025-04-09 13:22:01",
    level: "ERROR",
    message: "Failed login attempt from IP 192.168.1.105 (attempt 5/5)",
  },
  {
    time: "2025-04-09 12:44:17",
    level: "INFO",
    message: "Smart contract audit job completed for 0x4a3b...f9c2",
  },
  {
    time: "2025-04-09 11:30:55",
    level: "INFO",
    message: "Cron job: portfolio risk scores recalculated (450 portfolios)",
  },
  {
    time: "2025-04-09 10:12:08",
    level: "WARN",
    message: "Slow query detected: portfolios.getAll took 1842ms",
  },
  {
    time: "2025-04-09 09:05:23",
    level: "INFO",
    message: "System update v2.3.5 downloaded and staged for deployment",
  },
];
const logLevel = {
  INFO: "badge-blue",
  WARN: "badge-yellow",
  ERROR: "badge-red",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminPanel({ darkMode, toggleDarkMode }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sysSettings, setSysSettings] = useState(
    Object.fromEntries(SYSTEM_SETTINGS.map(({ label, on }) => [label, on])),
  );

  return (
    <Layout
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      title="Admin Panel"
    >
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Admin Panel
            </h1>
            <span className="badge-red">Restricted</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Manage users, monitor system performance, and oversee platform
            operations.
          </p>
        </div>

        <div className="mb-8 border-b border-gray-200 dark:border-gray-800">
          <nav className="-mb-px flex space-x-1 overflow-x-auto scrollbar-thin">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={
                  activeTab === tab
                    ? "tab-button-active"
                    : "tab-button-inactive"
                }
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Dashboard Tab ── */}
        {activeTab === "dashboard" && (
          <div className="animate-slide-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                {
                  label: "Total Users",
                  value: "450",
                  change: "+18.4% this month",
                  positive: true,
                },
                {
                  label: "Transaction Volume",
                  value: "$2.8M",
                  change: "+16.7% this month",
                  positive: true,
                },
                {
                  label: "Active Smart Contracts",
                  value: "32",
                  change: "+3 this month",
                  positive: true,
                },
                {
                  label: "System Health",
                  value: "98.5%",
                  change: "Uptime last 30 days",
                  positive: true,
                },
              ].map(({ label, value, change, positive }) => (
                <div key={label} className="stat-card">
                  <p className="stat-label">{label}</p>
                  <p className="stat-value">{value}</p>
                  <p
                    className={
                      positive ? "stat-change-positive" : "stat-change-negative"
                    }
                  >
                    {change}
                  </p>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="card p-6">
                <h2 className="section-title mb-4">User Growth</h2>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={userGrowthData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="adminUserGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#6366f1"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#6366f1"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="url(#adminUserGrad)"
                        name="Users"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="section-title mb-4">Transaction Volume</h2>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={transactionVolumeData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                      />
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <Tooltip
                        formatter={(v) => [
                          `$${(v / 1000000).toFixed(2)}M`,
                          "Volume",
                        ]}
                      />
                      <Bar
                        dataKey="volume"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                        name="Volume"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* User tiers + alerts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="card p-6">
                <h2 className="section-title mb-4">User Tier Distribution</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userTiersData}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {userTiersData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [v, "Users"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="section-title mb-4">System Alerts</h2>
                <div className="space-y-3">
                  {systemAlerts.map(
                    ({ title, description, time, severity }) => (
                      <div
                        key={title}
                        className={`p-3 rounded-xl border ${alertBorder[severity]}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={alertColor[severity]}>
                                {severity}
                              </span>
                              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                {title}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {description}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                            {time}
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Recent transactions */}
            <div className="card mb-8 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="section-title">Recent Transactions</h2>
                <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  View all
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      {["ID", "User", "Type", "Amount", "Date", "Status"].map(
                        (h) => (
                          <th key={h} className="table-header">
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recentTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <td className="table-cell font-mono text-xs">
                          {tx.id}
                        </td>
                        <td className="table-cell font-medium text-gray-900 dark:text-white">
                          {tx.user}
                        </td>
                        <td className="table-cell">{tx.type}</td>
                        <td className="table-cell font-semibold">
                          {tx.amount}
                        </td>
                        <td className="table-cell">{tx.date}</td>
                        <td className="table-cell">
                          <span className={statusBadge(tx.status)}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-6 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40 mb-8">
              <h2 className="section-title mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {QUICK_ACTIONS.map(({ label, icon }) => (
                  <button
                    key={label}
                    className="card-hover p-4 text-center flex flex-col items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  >
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
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
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── User Management Tab ── */}
        {activeTab === "users" && (
          <div className="animate-slide-up">
            <div className="card overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="section-title">All Users</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Search users…"
                    className="input w-48"
                  />
                  <button className="btn-primary text-sm">Add User</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      {[
                        "ID",
                        "Name",
                        "Email",
                        "Joined",
                        "Tier",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th key={h} className="table-header">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recentUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <td className="table-cell font-mono text-xs">{u.id}</td>
                        <td className="table-cell font-medium text-gray-900 dark:text-white">
                          {u.name}
                        </td>
                        <td className="table-cell text-gray-500 dark:text-gray-400">
                          {u.email}
                        </td>
                        <td className="table-cell">{u.joined}</td>
                        <td className="table-cell">
                          <span className={tierBadge[u.tier]}>{u.tier}</span>
                        </td>
                        <td className="table-cell">
                          <span className={statusBadge(u.status)}>
                            {u.status}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex gap-2">
                            <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                              Edit
                            </button>
                            <button className="text-xs text-red-500 hover:underline">
                              Suspend
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Transactions Tab ── */}
        {activeTab === "transactions" && (
          <div className="animate-slide-up">
            <div className="card overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="section-title">All Transactions</h2>
                <div className="flex items-center gap-3">
                  <select className="input w-36 appearance-none">
                    <option>All Types</option>
                    <option>Deposit</option>
                    <option>Withdrawal</option>
                    <option>Trade</option>
                  </select>
                  <button className="btn-secondary text-sm">Export CSV</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      {["ID", "User", "Type", "Amount", "Date", "Status"].map(
                        (h) => (
                          <th key={h} className="table-header">
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recentTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <td className="table-cell font-mono text-xs">
                          {tx.id}
                        </td>
                        <td className="table-cell font-medium text-gray-900 dark:text-white">
                          {tx.user}
                        </td>
                        <td className="table-cell">{tx.type}</td>
                        <td className="table-cell font-semibold">
                          {tx.amount}
                        </td>
                        <td className="table-cell">{tx.date}</td>
                        <td className="table-cell">
                          <span className={statusBadge(tx.status)}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Analytics Tab ── */}
        {activeTab === "analytics" && (
          <div className="animate-slide-up">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              {[
                {
                  label: "Avg. Session Duration",
                  value: "12m 34s",
                  change: "+8.2% vs last month",
                  positive: true,
                },
                {
                  label: "Daily Active Users",
                  value: "218",
                  change: "+5.1% vs last month",
                  positive: true,
                },
                {
                  label: "Avg. Portfolio Value",
                  value: "$52,300",
                  change: "-2.4% vs last month",
                  positive: false,
                },
              ].map(({ label, value, change, positive }) => (
                <div key={label} className="stat-card">
                  <p className="stat-label">{label}</p>
                  <p className="stat-value">{value}</p>
                  <p
                    className={
                      positive ? "stat-change-positive" : "stat-change-negative"
                    }
                  >
                    {change}
                  </p>
                </div>
              ))}
            </div>
            <div className="card p-6">
              <h2 className="section-title mb-4">Platform Usage Over Time</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={userGrowthData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="analyticsGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#analyticsGrad)"
                      name="Active Users"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── System Settings Tab — FIX: toggles are now stateful ── */}
        {activeTab === "settings" && (
          <div className="animate-slide-up max-w-2xl">
            <div className="card p-6 mb-6">
              <h2 className="section-title mb-1">System Settings</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Changes take effect immediately. Exercise caution with
                maintenance mode.
              </p>
              <div className="space-y-5">
                {SYSTEM_SETTINGS.map(({ label, desc }) => {
                  const isOn = sysSettings[label];
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
                        onClick={() =>
                          setSysSettings((p) => ({ ...p, [label]: !p[label] }))
                        }
                        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${isOn ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"}`}
                        aria-pressed={isOn}
                        aria-label={`Toggle ${label}`}
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
            <div className="card p-6 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">
                Danger Zone
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Purge Cache
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Clear all server-side caches. May temporarily increase
                    response times.
                  </p>
                </div>
                <button className="btn-danger text-sm flex-shrink-0">
                  Purge Cache
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── System Logs Tab ── */}
        {activeTab === "logs" && (
          <div className="animate-slide-up">
            <div className="card overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="section-title">System Logs</h2>
                <button className="btn-secondary text-sm">Download Logs</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full font-mono text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      <th className="table-header">Timestamp</th>
                      <th className="table-header">Level</th>
                      <th className="table-header">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {LOGS.map(({ time, level, message }) => (
                      <tr
                        key={time}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                          {time}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={logLevel[level]}>{level}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                          {message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
