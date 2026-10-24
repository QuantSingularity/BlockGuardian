import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "../../pages/dashboard";
import PortfoliosPage from "../../pages/portfolios";
import { useAuth } from "../../context/AuthContext";
import { portfolioAPI } from "../../services/api";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../services/api", () => ({ portfolioAPI: { list: jest.fn() } }));

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("../../context/ToastContext", () => ({
  useToast: () => mockToast,
}));

jest.mock("../../components/layout/DashboardLayout", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ children, title }) =>
      React.createElement("div", { "data-title": title }, children),
  };
});

jest.mock("../../components/portfolio/CreatePortfolioModal", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ isOpen, onClose, onCreated }) =>
      isOpen
        ? React.createElement(
            "div",
            { role: "dialog" },
            React.createElement("button", { onClick: onClose }, "close-modal"),
            React.createElement("button", { onClick: onCreated }, "created"),
          )
        : null,
  };
});

const sample = [
  {
    id: 1,
    name: "Growth",
    portfolio_type: "personal",
    risk_level: "high",
    base_currency: "USD",
    total_value: 12000,
    cash_balance: 2000,
    invested_amount: 10000,
    unrealized_pnl: 1000,
    realized_pnl: 250,
    description: "Aggressive",
    created_at: "2026-01-15T12:00:00Z",
    risk_violations: [{}, {}],
  },
  {
    id: 2,
    name: "Safe",
    portfolio_type: "retirement",
    risk_level: "custom_level",
    base_currency: "EUR",
    total_value: 5000,
    cash_balance: 500,
    invested_amount: 4500,
    unrealized_pnl: -300,
    realized_pnl: 0,
    risk_violations: [{}],
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { first_name: "Jane" } });
});

describe("DashboardPage", () => {
  it("shows a loader until data arrives", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: [] });
    render(<DashboardPage />);
    expect(screen.getByText("Loading your dashboard...")).toBeInTheDocument();
    expect(await screen.findByText(/Welcome back, Jane/)).toBeInTheDocument();
    expect(portfolioAPI.list).toHaveBeenCalledWith({ per_page: 50 });
  });

  it("shows the empty state and opens the create modal", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: [] });
    render(<DashboardPage />);
    expect(
      await screen.findByText("Create your first portfolio"),
    ).toBeInTheDocument();
    expect(screen.getByText(/0 portfolios\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create Portfolio" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByText("close-modal"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("treats a missing portfolios field as empty", async () => {
    portfolioAPI.list.mockResolvedValue({});
    render(<DashboardPage />);
    expect(
      await screen.findByText("Create your first portfolio"),
    ).toBeInTheDocument();
  });

  it("aggregates totals across portfolios", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: sample });
    render(<DashboardPage />);
    expect(await screen.findByText("$17,000.00")).toBeInTheDocument();
    expect(screen.getByText("$2,500.00")).toBeInTheDocument();
    expect(screen.getByText("$700.00")).toBeInTheDocument();
    expect(screen.getByText("$250.00")).toBeInTheDocument();
    expect(screen.getByText("Gain")).toBeInTheDocument();
    expect(screen.getByText(/2 portfolios\./)).toBeInTheDocument();
  });

  it("computes the return percentage from invested capital", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: sample });
    render(<DashboardPage />);
    expect(await screen.findByText(/4\.83%/)).toBeInTheDocument();
  });

  it("reports a loss when unrealized P&L is negative", async () => {
    portfolioAPI.list.mockResolvedValue({
      portfolios: [{ ...sample[1], id: 9 }],
    });
    render(<DashboardPage />);
    expect(await screen.findByText("Loss")).toBeInTheDocument();
    expect(screen.getByText(/1 portfolio\./)).toBeInTheDocument();
  });

  it("uses a zero return when nothing is invested", async () => {
    portfolioAPI.list.mockResolvedValue({
      portfolios: [{ id: 1, name: "Cash", risk_level: "low" }],
    });
    render(<DashboardPage />);
    expect(await screen.findByText(/0\.00%/)).toBeInTheDocument();
  });

  it("renders portfolio cards with links, labels and alerts", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: sample });
    render(<DashboardPage />);
    const growth = await screen.findByText("Growth");
    expect(growth.closest("a")).toHaveAttribute("href", "/portfolios/1");
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Custom Level")).toBeInTheDocument();
    expect(screen.getByText("Retirement")).toBeInTheDocument();
    expect(screen.getByText("2 risk alerts")).toBeInTheDocument();
    expect(screen.getByText("1 risk alert")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View all/ })).toHaveAttribute(
      "href",
      "/portfolios",
    );
  });

  it("shows at most six portfolio cards", async () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      ...sample[0],
      id: i + 1,
      name: `P${i + 1}`,
      risk_violations: [],
    }));
    portfolioAPI.list.mockResolvedValue({ portfolios: many });
    render(<DashboardPage />);
    await screen.findByText("P1");
    expect(screen.getByText("P6")).toBeInTheDocument();
    expect(screen.queryByText("P7")).not.toBeInTheDocument();
  });

  it("reports load failures with a toast", async () => {
    portfolioAPI.list.mockRejectedValue(new Error("Backend down"));
    render(<DashboardPage />);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Backend down"),
    );
    expect(await screen.findByText(/Welcome back/)).toBeInTheDocument();
  });

  it("uses a generic load error message", async () => {
    portfolioAPI.list.mockRejectedValue({});
    render(<DashboardPage />);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Failed to load portfolios"),
    );
  });

  it("reloads after a portfolio is created", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: sample });
    render(<DashboardPage />);
    await screen.findByText("Growth");
    fireEvent.click(screen.getByRole("button", { name: "New Portfolio" }));
    fireEvent.click(screen.getByText("created"));
    await waitFor(() => expect(portfolioAPI.list).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("PortfoliosPage", () => {
  it("lists portfolios with details", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: sample });
    render(<PortfoliosPage />);
    expect(await screen.findByText("Growth")).toBeInTheDocument();
    expect(portfolioAPI.list).toHaveBeenCalledWith({ per_page: 100 });
    expect(screen.getByText("2 portfolios")).toBeInTheDocument();
    expect(screen.getByText("Aggressive")).toBeInTheDocument();
    expect(screen.getByText(/Personal.*USD/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 15, 2026/)).toBeInTheDocument();
    expect(screen.getByText("2 alerts")).toBeInTheDocument();
    expect(screen.getByText("1 alert")).toBeInTheDocument();
    expect(screen.getByText("Growth").closest("a")).toHaveAttribute(
      "href",
      "/portfolios/1",
    );
  });

  it("shows a loader and then the empty state", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: [] });
    render(<PortfoliosPage />);
    expect(screen.getByText("Loading portfolios...")).toBeInTheDocument();
    expect(await screen.findByText("No portfolios yet")).toBeInTheDocument();
    expect(screen.getByText("0 portfolios")).toBeInTheDocument();
  });

  it("uses the singular label for one portfolio", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: [sample[0]] });
    render(<PortfoliosPage />);
    expect(await screen.findByText("1 portfolio")).toBeInTheDocument();
  });

  it("treats a missing portfolios field as empty", async () => {
    portfolioAPI.list.mockResolvedValue({});
    render(<PortfoliosPage />);
    expect(await screen.findByText("No portfolios yet")).toBeInTheDocument();
  });

  it("reports errors with a toast", async () => {
    portfolioAPI.list.mockRejectedValue(new Error("Boom"));
    render(<PortfoliosPage />);
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Boom"));
  });

  it("uses a generic error message", async () => {
    portfolioAPI.list.mockRejectedValue({});
    render(<PortfoliosPage />);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Failed to load portfolios"),
    );
  });

  it("opens the create modal from the header button and reloads after creating", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: sample });
    render(<PortfoliosPage />);
    await screen.findByText("Growth");
    fireEvent.click(screen.getByRole("button", { name: "New Portfolio" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByText("created"));
    await waitFor(() => expect(portfolioAPI.list).toHaveBeenCalledTimes(2));
  });

  it("opens the create modal from the empty state and closes it again", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: [] });
    render(<PortfoliosPage />);
    await screen.findByText("No portfolios yet");
    fireEvent.click(screen.getByRole("button", { name: "Create Portfolio" }));
    fireEvent.click(screen.getByText("close-modal"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
