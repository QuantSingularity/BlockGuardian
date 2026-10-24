import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useRouter } from "next/router";
import PortfolioDetailPage from "../../pages/portfolios/[id]";
import { portfolioAPI } from "../../services/api";

jest.mock("next/router", () => ({ useRouter: jest.fn() }));
jest.mock("../../services/api", () => ({
  portfolioAPI: {
    get: jest.fn(),
    holdings: jest.fn(),
    transactions: jest.fn(),
    performance: jest.fn(),
    allocation: jest.fn(),
    risk: jest.fn(),
    cancelTransaction: jest.fn(),
  },
}));

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("../../context/ToastContext", () => ({
  useToast: () => mockToast,
}));

jest.mock("../../components/layout/DashboardLayout", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ children, title }) =>
      React.createElement(
        "div",
        null,
        React.createElement("span", { "data-testid": "layout-title" }, title),
        children,
      ),
  };
});

const mockTradeProps = jest.fn();
jest.mock("../../components/portfolio/TradeModal", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: (props) => {
      mockTradeProps(props);
      return props.isOpen
        ? React.createElement(
            "div",
            { role: "dialog" },
            React.createElement(
              "span",
              { "data-testid": "trade-mode" },
              `${props.mode}:${props.presetSymbol || "none"}`,
            ),
            React.createElement(
              "button",
              { onClick: props.onSuccess },
              "trade-success",
            ),
            React.createElement(
              "button",
              { onClick: props.onClose },
              "trade-close",
            ),
          )
        : null;
    },
  };
});

jest.mock("../../components/portfolio/PortfolioSettingsForm", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ portfolio, onUpdated }) =>
      React.createElement(
        "div",
        null,
        React.createElement("span", null, `settings-for-${portfolio.name}`),
        React.createElement(
          "button",
          { onClick: () => onUpdated({ ...portfolio, name: "Renamed" }) },
          "apply-update",
        ),
      ),
  };
});

const push = jest.fn();

const portfolio = {
  id: 5,
  name: "Growth",
  description: "Long term growth",
  portfolio_type: "personal",
  risk_level: "high",
  base_currency: "USD",
  total_value: 12000,
  cash_balance: 2000,
  unrealized_pnl: 1500,
  realized_pnl: -200,
};

const holdings = [
  {
    id: 1,
    quantity: 2,
    average_cost: 100,
    current_price: 110,
    current_value: 220,
    unrealized_pnl: 20,
    unrealized_pnl_percent: 10,
    asset: { symbol: "AAA", name: "Alpha" },
  },
  {
    id: 2,
    quantity: 10,
    average_cost: 50,
    current_price: 40,
    current_value: 400,
    unrealized_pnl: -100,
    unrealized_pnl_percent: -20,
    asset: { symbol: "BBB", name: "Beta" },
  },
  {
    id: 3,
    quantity: 1,
    current_value: 10,
    asset: { symbol: "CCC", name: "Gamma" },
  },
];

const performance = {
  total_return: 1300,
  total_return_percent: 12.5,
  invested_amount: 10000,
  cash_balance: 2000,
  unrealized_pnl: 1500,
  realized_pnl: -200,
};

const allocation = {
  by_asset_type: { stock: 70, cryptocurrency: 30 },
  by_asset: { AAA: { value: 220, percentage: 35 } },
};

const risk = {
  risk_score: 30,
  volatility: 8,
  max_position_size: 0.1,
  max_sector_allocation: 0.3,
  stop_loss_threshold: 0.05,
  violations: [],
};

const transactions = [
  {
    id: 1,
    transaction_type: "buy",
    status: "completed",
    quantity: 2,
    price: 100,
    net_amount: 200,
    currency: "USD",
    executed_at: "2026-02-01T10:30:00Z",
  },
  {
    id: 2,
    transaction_type: "sell",
    status: "pending",
    quantity: 1,
    price: 110,
    net_amount: 110,
    currency: "USD",
    created_at: "2026-02-02T10:30:00Z",
  },
  {
    id: 3,
    transaction_type: "dividend",
    status: "failed",
    quantity: 0,
    price: 0,
    net_amount: 5,
    currency: "USD",
    created_at: "2026-02-03T10:30:00Z",
  },
  {
    id: 4,
    transaction_type: "fee",
    status: "processing",
    quantity: 0,
    price: 0,
    net_amount: 1,
    currency: "USD",
    created_at: "2026-02-04T10:30:00Z",
  },
];

const tab = (name) => fireEvent.click(screen.getByRole("button", { name }));

const renderPage = async () => {
  render(<PortfolioDetailPage />);
  await screen.findByRole("heading", { name: "Growth" });
};

beforeEach(() => {
  jest.clearAllMocks();
  useRouter.mockReturnValue({ push, query: { id: "5" } });
  portfolioAPI.get.mockResolvedValue(portfolio);
  portfolioAPI.holdings.mockResolvedValue(holdings);
  portfolioAPI.performance.mockResolvedValue(performance);
  portfolioAPI.allocation.mockResolvedValue(allocation);
  portfolioAPI.risk.mockResolvedValue(risk);
  portfolioAPI.transactions.mockResolvedValue({ transactions });
  portfolioAPI.cancelTransaction.mockResolvedValue({});
});

describe("loading", () => {
  it("shows a loader first and then the portfolio", async () => {
    render(<PortfolioDetailPage />);
    expect(screen.getByText("Loading portfolio...")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Growth" }),
    ).toBeInTheDocument();
    expect(portfolioAPI.get).toHaveBeenCalledWith("5");
    expect(portfolioAPI.holdings).toHaveBeenCalledWith("5");
    expect(screen.getByTestId("layout-title")).toHaveTextContent("Growth");
  });

  it("waits for the route id before fetching", () => {
    useRouter.mockReturnValue({ push, query: {} });
    render(<PortfolioDetailPage />);
    expect(portfolioAPI.get).not.toHaveBeenCalled();
    expect(screen.getByText("Loading portfolio...")).toBeInTheDocument();
  });

  it("reports a load failure and returns to the list", async () => {
    portfolioAPI.get.mockRejectedValue(new Error("Not found"));
    render(<PortfolioDetailPage />);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/portfolios"));
    expect(mockToast.error).toHaveBeenCalledWith("Not found");
  });

  it("uses a generic message for unknown load failures", async () => {
    portfolioAPI.holdings.mockRejectedValue({});
    render(<PortfolioDetailPage />);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Failed to load portfolio"),
    );
  });
});

describe("header and stat cards", () => {
  it("shows name, badges, description and the four stats", async () => {
    await renderPage();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("Long term growth")).toBeInTheDocument();
    expect(screen.getByText("$12,000.00")).toBeInTheDocument();
    expect(screen.getByText("$2,000.00")).toBeInTheDocument();
    expect(screen.getByText("$1,500.00")).toHaveClass("!text-emerald-600");
    expect(screen.getByText("-$200.00")).toHaveClass("!text-red-600");
  });

  it("omits the description when there is none", async () => {
    portfolioAPI.get.mockResolvedValue({ ...portfolio, description: "" });
    await renderPage();
    expect(screen.queryByText("Long term growth")).not.toBeInTheDocument();
  });

  it("falls back to a formatted label for unknown risk levels", async () => {
    portfolioAPI.get.mockResolvedValue({
      ...portfolio,
      risk_level: "ultra_safe",
    });
    await renderPage();
    expect(screen.getByText("Ultra Safe")).toBeInTheDocument();
  });
});

describe("overview tab", () => {
  it("shows the top holdings by value", async () => {
    await renderPage();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("BBB")).toBeInTheDocument();
    expect(within(rows[1]).getByText("AAA")).toBeInTheDocument();
    expect(within(rows[2]).getByText("CCC")).toBeInTheDocument();
  });

  it("limits the overview to five holdings", async () => {
    portfolioAPI.holdings.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        quantity: 1,
        current_value: 100 - i,
        asset: { symbol: `S${i}`, name: `N${i}` },
      })),
    );
    await renderPage();
    expect(screen.getAllByRole("row").slice(1)).toHaveLength(5);
  });

  it("shows an empty state with a buy shortcut", async () => {
    portfolioAPI.holdings.mockResolvedValue([]);
    await renderPage();
    expect(screen.getByText("No positions yet")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Buy Asset" })[1]);
    expect(screen.getByTestId("trade-mode")).toHaveTextContent("buy:none");
  });

  it("loads analytics and renders the allocation mini chart", async () => {
    await renderPage();
    expect(await screen.findByText("70.0%")).toBeInTheDocument();
    expect(screen.getByText("Stock")).toBeInTheDocument();
    expect(screen.getByText("Cryptocurrency")).toBeInTheDocument();
    expect(portfolioAPI.performance).toHaveBeenCalledWith("5");
  });

  it("shows a message while allocation is still loading", async () => {
    portfolioAPI.allocation.mockReturnValue(new Promise(() => {}));
    await renderPage();
    expect(screen.getByText(/Loading allocation/)).toBeInTheDocument();
  });

  it("shows a message when there are no positions to allocate", async () => {
    portfolioAPI.allocation.mockResolvedValue({ by_asset_type: {} });
    await renderPage();
    expect(await screen.findByText("No positions yet.")).toBeInTheDocument();
  });

  it("reports analytics failures", async () => {
    portfolioAPI.risk.mockRejectedValue(new Error("Risk offline"));
    await renderPage();
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Risk offline"),
    );
  });

  it("uses a generic analytics error", async () => {
    portfolioAPI.risk.mockRejectedValue({});
    await renderPage();
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Failed to load analytics"),
    );
  });
});

describe("holdings tab", () => {
  it("renders every position with cost, price, value and P&L", async () => {
    await renderPage();
    tab("Holdings");
    expect(screen.getByText("Avg Cost")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("+10.00%")).toBeInTheDocument();
    expect(screen.getByText("-20.00%")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Sell" }).length,
    ).toBeGreaterThan(3);
  });

  it("shows an empty state", async () => {
    portfolioAPI.holdings.mockResolvedValue([]);
    await renderPage();
    tab("Holdings");
    expect(screen.getAllByText("No positions yet").length).toBeGreaterThan(0);
  });

  it("opens the sell dialog for the chosen symbol", async () => {
    await renderPage();
    tab("Holdings");
    const row = screen.getByText("Beta").closest("tr");
    fireEvent.click(within(row).getByRole("button", { name: "Sell" }));
    expect(screen.getByTestId("trade-mode")).toHaveTextContent("sell:BBB");
  });

  it("opens the buy dialog from the empty holdings state", async () => {
    portfolioAPI.holdings.mockResolvedValue([]);
    await renderPage();
    tab("Holdings");
    const buttons = screen.getAllByRole("button", { name: "Buy Asset" });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(screen.getByTestId("trade-mode")).toHaveTextContent("buy:none");
  });
});

describe("transactions tab", () => {
  it("loads lazily and lists transactions with badges", async () => {
    await renderPage();
    expect(portfolioAPI.transactions).not.toHaveBeenCalled();
    tab("Transactions");
    expect(await screen.findByText("Completed")).toBeInTheDocument();
    expect(portfolioAPI.transactions).toHaveBeenCalledWith("5", {
      per_page: 50,
    });
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Completed")).toHaveClass("badge-green");
    expect(table.getByText("Pending")).toHaveClass("badge-yellow");
    expect(table.getByText("Failed")).toHaveClass("badge-red");
    expect(table.getByText("Processing")).toHaveClass("badge-yellow");
    expect(table.getByText("Buy")).toHaveClass("badge-green");
    expect(table.getByText("Sell")).toHaveClass("badge-red");
    expect(table.getByText("Dividend")).toHaveClass("badge-blue");
  });

  it("only offers cancellation for pending and processing transactions", async () => {
    await renderPage();
    tab("Transactions");
    await screen.findByText("Completed");
    expect(screen.getAllByRole("button", { name: "Cancel" })).toHaveLength(2);
  });

  it("cancels a transaction and reloads the list", async () => {
    await renderPage();
    tab("Transactions");
    await screen.findByText("Completed");
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    await waitFor(() =>
      expect(portfolioAPI.cancelTransaction).toHaveBeenCalledWith("5", 2),
    );
    expect(mockToast.success).toHaveBeenCalledWith("Transaction cancelled");
    await waitFor(() =>
      expect(portfolioAPI.transactions).toHaveBeenCalledTimes(2),
    );
  });

  it("reports a cancellation failure", async () => {
    portfolioAPI.cancelTransaction.mockRejectedValue(new Error("Too late"));
    await renderPage();
    tab("Transactions");
    await screen.findByText("Completed");
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Too late"),
    );
  });

  it("uses a generic cancellation error", async () => {
    portfolioAPI.cancelTransaction.mockRejectedValue({});
    await renderPage();
    tab("Transactions");
    await screen.findByText("Completed");
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        "Failed to cancel transaction",
      ),
    );
  });

  it("shows an empty state when there is no activity", async () => {
    portfolioAPI.transactions.mockResolvedValue({});
    await renderPage();
    tab("Transactions");
    expect(await screen.findByText("No transactions yet")).toBeInTheDocument();
  });

  it("reports load failures", async () => {
    portfolioAPI.transactions.mockRejectedValue(new Error("Nope"));
    await renderPage();
    tab("Transactions");
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Nope"));
    expect(screen.getByText("Loading transactions...")).toBeInTheDocument();
  });

  it("uses a generic transaction load error", async () => {
    portfolioAPI.transactions.mockRejectedValue({});
    await renderPage();
    tab("Transactions");
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        "Failed to load transactions",
      ),
    );
  });

  it("does not refetch when revisiting the tab", async () => {
    await renderPage();
    tab("Transactions");
    await screen.findByText("Completed");
    tab("Holdings");
    tab("Transactions");
    expect(portfolioAPI.transactions).toHaveBeenCalledTimes(1);
  });
});

describe("analytics tab", () => {
  it("shows performance, allocation and risk sections", async () => {
    await renderPage();
    tab("Analytics");
    expect(await screen.findByText("Performance summary")).toBeInTheDocument();
    expect(screen.getByText("$1,300.00")).toHaveClass("text-emerald-600");
    expect(screen.getByText("+12.50%")).toBeInTheDocument();
    expect(screen.getByText("$10,000.00")).toBeInTheDocument();
    expect(screen.getByText("Allocation breakdown")).toBeInTheDocument();
    expect(screen.getByText("Risk metrics")).toBeInTheDocument();
    expect(screen.getByText("30 / 100")).toBeInTheDocument();
  });

  it("shows a loader until analytics arrive", async () => {
    portfolioAPI.performance.mockReturnValue(new Promise(() => {}));
    await renderPage();
    tab("Analytics");
    expect(screen.getByText("Crunching analytics...")).toBeInTheDocument();
  });

  it("renders negative returns in red and tolerates missing metrics", async () => {
    portfolioAPI.performance.mockResolvedValue({
      total_return: -50,
      total_return_percent: -2.5,
    });
    portfolioAPI.allocation.mockResolvedValue(null);
    portfolioAPI.risk.mockResolvedValue(null);
    await renderPage();
    tab("Analytics");
    expect(await screen.findByText("-$50.00")).toHaveClass("text-red-600");
    expect(screen.getByText("-2.50%")).toBeInTheDocument();
    expect(screen.getByText(/No positions yet/)).toBeInTheDocument();
  });

  it("handles a null performance payload", async () => {
    portfolioAPI.performance.mockResolvedValue(null);
    await renderPage();
    tab("Analytics");
    expect(await screen.findByText("Performance summary")).toBeInTheDocument();
    expect(screen.getByText("+0.00%")).toBeInTheDocument();
  });
});

describe("settings tab", () => {
  it("renders the settings form and applies updates", async () => {
    await renderPage();
    tab("Settings");
    expect(screen.getByText("settings-for-Growth")).toBeInTheDocument();
    fireEvent.click(screen.getByText("apply-update"));
    expect(await screen.findByText("settings-for-Renamed")).toBeInTheDocument();
  });
});

describe("trading", () => {
  it("opens buy and sell dialogs from the header", async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole("button", { name: "Buy Asset" })[0]);
    expect(screen.getByTestId("trade-mode")).toHaveTextContent("buy:none");
    fireEvent.click(screen.getByText("trade-close"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sell" }));
    expect(screen.getByTestId("trade-mode")).toHaveTextContent("sell:none");
  });

  it("passes the portfolio id and holdings to the dialog", async () => {
    await renderPage();
    const latest = mockTradeProps.mock.calls.at(-1)[0];
    expect(latest.portfolioId).toBe("5");
    expect(latest.holdings).toHaveLength(3);
  });

  it("refreshes everything after a successful trade", async () => {
    await renderPage();
    await waitFor(() =>
      expect(portfolioAPI.performance).toHaveBeenCalledTimes(1),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Buy Asset" })[0]);
    fireEvent.click(screen.getByText("trade-success"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(portfolioAPI.get).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(portfolioAPI.performance).toHaveBeenCalledTimes(2),
    );
  });

  it("refreshes transactions after a trade made from that tab", async () => {
    await renderPage();
    tab("Transactions");
    await screen.findByText("Completed");
    fireEvent.click(screen.getAllByRole("button", { name: "Buy Asset" })[0]);
    fireEvent.click(screen.getByText("trade-success"));
    await waitFor(() =>
      expect(portfolioAPI.transactions).toHaveBeenCalledTimes(2),
    );
  });
});
