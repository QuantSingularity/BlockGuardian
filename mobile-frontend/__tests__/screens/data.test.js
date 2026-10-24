import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { RefreshControl, TextInput } from "react-native";
import BlockchainScreen from "../../src/screens/BlockchainScreen";
import DashboardScreen from "../../src/screens/DashboardScreen";
import MarketsScreen from "../../src/screens/MarketsScreen";
import PortfoliosScreen from "../../src/screens/PortfoliosScreen";
import AppNavigator from "../../src/navigation/AppNavigator";
import { useAuth } from "../../src/context/AuthContext";
import { assetAPI, blockchainAPI, portfolioAPI } from "../../src/lib/api";

jest.mock("../../src/context/AuthContext", () => ({ useAuth: jest.fn() }));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
};

jest.mock("../../src/context/ToastContext", () => ({
  useToast: () => mockToast,
}));

jest.mock("../../src/lib/api", () => ({
  assetAPI: { list: jest.fn(), search: jest.fn() },
  blockchainAPI: { explorer: jest.fn() },
  portfolioAPI: { list: jest.fn() },
}));

jest.mock("../../src/components/portfolio/CreatePortfolioModal", () => ({
  __esModule: true,
  default: ({ visible, onClose, onCreated }) => {
    const { Fragment, createElement: h } = require("react");
    const { Text, TouchableOpacity } = require("react-native");
    return visible
      ? h(
          Fragment,
          null,
          h(
            TouchableOpacity,
            { onPress: onClose },
            h(Text, null, "close-modal"),
          ),
          h(TouchableOpacity, { onPress: onCreated }, h(Text, null, "created")),
        )
      : null;
  },
}));

const navigation = { navigate: jest.fn(), reset: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    user: { first_name: "Jane" },
  });
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
    risk_violations: [{}],
  },
];

describe("authentication gate", () => {
  it("redirects signed out visitors instead of loading data", () => {
    useAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });
    render(<DashboardScreen navigation={navigation} />);
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: "Login" }],
    });
    expect(portfolioAPI.list).not.toHaveBeenCalled();
  });
});

describe("DashboardScreen", () => {
  it("loads portfolios and shows greeting, totals and cards", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: sample });
    const screen = render(<DashboardScreen navigation={navigation} />);
    expect(await screen.findByText("Growth")).toBeTruthy();
    expect(portfolioAPI.list).toHaveBeenCalledWith({ per_page: 50 });
    expect(screen.getByText("Welcome back, Jane")).toBeTruthy();
    expect(screen.getByText("2 portfolios")).toBeTruthy();
    expect(screen.getByText("$17,000.00")).toBeTruthy();
    expect(screen.getByText("$2,500.00")).toBeTruthy();
    expect(screen.getByText("$700.00")).toBeTruthy();
    expect(screen.getByText(/4\.83%/)).toBeTruthy();
    expect(screen.getByText("High")).toBeTruthy();
    expect(screen.getByText("Custom Level")).toBeTruthy();
  });

  it("colors unrealized P&L by sign", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: sample });
    const screen = render(<DashboardScreen navigation={navigation} />);
    await screen.findByText("Growth");
    expect(screen.getByText("$1,000.00 unrealized")).toHaveStyle({
      color: "#34d399",
    });
    expect(screen.getByText("-\u20ac300.00 unrealized")).toHaveStyle({
      color: "#f87171",
    });
  });

  it("uses the singular label for one portfolio and a zero return without invested capital", async () => {
    portfolioAPI.list.mockResolvedValue({
      portfolios: [{ id: 9, name: "Cash", risk_level: "low" }],
    });
    const screen = render(<DashboardScreen navigation={navigation} />);
    expect(await screen.findByText("1 portfolio")).toBeTruthy();
    expect(screen.getByText(/0\.00%/)).toBeTruthy();
  });

  it("navigates to a portfolio", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: sample });
    const screen = render(<DashboardScreen navigation={navigation} />);
    fireEvent.press(await screen.findByText("Growth"));
    expect(navigation.navigate).toHaveBeenCalledWith("PortfolioDetail", {
      id: 1,
      name: "Growth",
    });
  });

  it("shows an empty state that opens the create flow", async () => {
    portfolioAPI.list.mockResolvedValue({});
    const screen = render(<DashboardScreen navigation={navigation} />);
    expect(await screen.findByText("Create your first portfolio")).toBeTruthy();
    fireEvent.press(screen.getByText("Create Portfolio"));
    expect(screen.getByText("created")).toBeTruthy();
    fireEvent.press(screen.getByText("close-modal"));
    expect(screen.queryByText("created")).toBeNull();
  });

  it("reloads after a portfolio is created", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: sample });
    const screen = render(<DashboardScreen navigation={navigation} />);
    await screen.findByText("Growth");
    fireEvent.press(screen.UNSAFE_getByProps({ name: "add" }));
    fireEvent.press(screen.getByText("created"));
    await waitFor(() => expect(portfolioAPI.list).toHaveBeenCalledTimes(2));
  });

  it("reports load failures", async () => {
    portfolioAPI.list.mockRejectedValueOnce(new Error("Backend down"));
    render(<DashboardScreen navigation={navigation} />);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Backend down"),
    );
    portfolioAPI.list.mockRejectedValueOnce({});
    render(<DashboardScreen navigation={navigation} />);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Failed to load portfolios"),
    );
  });

  it("refreshes on pull to refresh", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: sample });
    const screen = render(<DashboardScreen navigation={navigation} />);
    await screen.findByText("Growth");
    await act(async () => {
      screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });
    expect(portfolioAPI.list).toHaveBeenCalledTimes(2);
  });
});

describe("PortfoliosScreen", () => {
  it("lists portfolios with details", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: sample });
    const screen = render(<PortfoliosScreen navigation={navigation} />);
    expect(await screen.findByText("Growth")).toBeTruthy();
    expect(portfolioAPI.list).toHaveBeenCalledWith({ per_page: 100 });
    expect(screen.getByText(/Personal.*USD/)).toBeTruthy();
    expect(screen.getByText("Created Jan 15, 2026")).toBeTruthy();
    expect(screen.getByText(/2 alerts/)).toBeTruthy();
    expect(screen.getByText(/1 alert$/)).toBeTruthy();
    expect(screen.getByText("Custom Level")).toBeTruthy();
  });

  it("navigates to a portfolio", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: sample });
    const screen = render(<PortfoliosScreen navigation={navigation} />);
    fireEvent.press(await screen.findByText("Safe"));
    expect(navigation.navigate).toHaveBeenCalledWith("PortfolioDetail", {
      id: 2,
      name: "Safe",
    });
  });

  it("shows an empty state and opens the create flow from either entry point", async () => {
    portfolioAPI.list.mockResolvedValue({ portfolios: [] });
    const screen = render(<PortfoliosScreen navigation={navigation} />);
    expect(await screen.findByText("No portfolios yet")).toBeTruthy();
    fireEvent.press(screen.getByText("Create Portfolio"));
    expect(screen.getByText("created")).toBeTruthy();
    fireEvent.press(screen.getByText("close-modal"));
    fireEvent.press(screen.UNSAFE_getByProps({ name: "add" }));
    fireEvent.press(screen.getByText("created"));
    await waitFor(() => expect(portfolioAPI.list).toHaveBeenCalledTimes(2));
  });

  it("treats a missing portfolios field as empty", async () => {
    portfolioAPI.list.mockResolvedValue({});
    const screen = render(<PortfoliosScreen navigation={navigation} />);
    expect(await screen.findByText("No portfolios yet")).toBeTruthy();
  });

  it("reports load failures and refreshes", async () => {
    portfolioAPI.list.mockRejectedValueOnce(new Error("Boom"));
    const screen = render(<PortfoliosScreen navigation={navigation} />);
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Boom"));
    portfolioAPI.list.mockRejectedValueOnce({});
    await act(async () => {
      screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });
    expect(mockToast.error).toHaveBeenCalledWith("Failed to load portfolios");
  });
});

describe("MarketsScreen", () => {
  const assets = [
    {
      id: 1,
      symbol: "AAPL",
      name: "Apple Inc.",
      asset_type: "stock",
      exchange: "NASDAQ",
      current_price: 189.5,
      currency: "USD",
      day_change_percent: 1.25,
    },
    {
      id: 2,
      symbol: "BTC",
      name: "Bitcoin",
      asset_type: "cryptocurrency",
      current_price: 60000,
      day_change_percent: -2.1,
    },
    {
      id: 3,
      symbol: "FLAT",
      name: "Flat",
      asset_type: "etf",
      current_price: 10,
    },
  ];

  const search = (screen) => screen.UNSAFE_getByType(TextInput);

  beforeEach(() => {
    assetAPI.list.mockResolvedValue(assets);
    assetAPI.search.mockResolvedValue([assets[1]]);
  });

  it("loads and lists assets", async () => {
    const screen = render(<MarketsScreen navigation={navigation} />);
    expect(await screen.findByText("AAPL")).toBeTruthy();
    expect(assetAPI.list).toHaveBeenCalledWith({ limit: 60 });
    expect(screen.getByText("Apple Inc.")).toBeTruthy();
    expect(screen.getByText("NASDAQ")).toBeTruthy();
    expect(screen.getByText("$189.50")).toBeTruthy();
    expect(screen.getAllByText("Cryptocurrency")).toHaveLength(2);
  });

  it("colors the 24 hour change and keeps a missing value neutral", async () => {
    const screen = render(<MarketsScreen navigation={navigation} />);
    await screen.findByText("AAPL");
    expect(screen.getByText("+1.25%")).toHaveStyle({ color: "#34d399" });
    expect(screen.getByText("-2.10%")).toHaveStyle({ color: "#f87171" });
    expect(screen.getByText("-")).toHaveStyle({ color: "#64748b" });
  });

  it("fetches the default list exactly once on mount", async () => {
    const screen = render(<MarketsScreen navigation={navigation} />);
    await screen.findByText("AAPL");
    expect(assetAPI.list).toHaveBeenCalledTimes(1);
    expect(assetAPI.search).not.toHaveBeenCalled();
  });

  it("shows an empty state", async () => {
    assetAPI.list.mockResolvedValue(null);
    const screen = render(<MarketsScreen navigation={navigation} />);
    expect(await screen.findByText("No assets found")).toBeTruthy();
  });

  it("reports load failures", async () => {
    assetAPI.list.mockRejectedValueOnce(new Error("Feed down"));
    render(<MarketsScreen navigation={navigation} />);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Feed down"),
    );
    assetAPI.list.mockRejectedValueOnce({});
    render(<MarketsScreen navigation={navigation} />);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        "Failed to load market data",
      ),
    );
  });

  it("fetches once per asset type change", async () => {
    const screen = render(<MarketsScreen navigation={navigation} />);
    await screen.findByText("AAPL");
    fireEvent.press(screen.getAllByText("Stock")[0]);
    await waitFor(() => expect(assetAPI.list).toHaveBeenCalledTimes(2));
    expect(assetAPI.list).toHaveBeenLastCalledWith({
      limit: 60,
      asset_type: "stock",
    });
    fireEvent.press(screen.getByText("All"));
    await waitFor(() => expect(assetAPI.list).toHaveBeenCalledTimes(3));
  });

  describe("search", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const settle = async () => {
      await act(async () => {
        await Promise.resolve();
      });
    };

    it("debounces and then searches", async () => {
      const screen = render(<MarketsScreen navigation={navigation} />);
      await settle();
      fireEvent.changeText(search(screen), "bit");
      expect(assetAPI.search).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(assetAPI.search).toHaveBeenCalledWith("bit", {});
      expect(screen.getByText("BTC")).toBeTruthy();
      expect(screen.queryByText("AAPL")).toBeNull();
    });

    it("repeats an active search with the new asset type", async () => {
      const screen = render(<MarketsScreen navigation={navigation} />);
      await settle();
      fireEvent.changeText(search(screen), "coin");
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      assetAPI.list.mockClear();
      assetAPI.search.mockClear();
      fireEvent.press(screen.getAllByText("Cryptocurrency")[0]);
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(assetAPI.search).toHaveBeenCalledWith("coin", {
        type: "cryptocurrency",
      });
      expect(assetAPI.list).not.toHaveBeenCalled();
    });

    it("ignores a single character", async () => {
      const screen = render(<MarketsScreen navigation={navigation} />);
      await settle();
      fireEvent.changeText(search(screen), "b");
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(assetAPI.search).not.toHaveBeenCalled();
    });

    it("restores the default list when the query is cleared", async () => {
      const screen = render(<MarketsScreen navigation={navigation} />);
      await settle();
      fireEvent.changeText(search(screen), "bit");
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      assetAPI.list.mockClear();
      fireEvent.changeText(search(screen), "");
      await settle();
      expect(assetAPI.list).toHaveBeenCalledTimes(1);
      expect(screen.getByText("AAPL")).toBeTruthy();
    });

    it("discards the result of a superseded search", async () => {
      let resolveFirst;
      assetAPI.search
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
        )
        .mockResolvedValueOnce([assets[1]]);
      const screen = render(<MarketsScreen navigation={navigation} />);
      await settle();
      fireEvent.changeText(search(screen), "ap");
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      fireEvent.changeText(search(screen), "bit");
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      await act(async () => {
        resolveFirst([assets[0]]);
      });
      expect(screen.getByText("BTC")).toBeTruthy();
      expect(screen.queryByText("AAPL")).toBeNull();
    });

    it("reports search failures", async () => {
      assetAPI.search.mockRejectedValueOnce(new Error("Search broke"));
      const screen = render(<MarketsScreen navigation={navigation} />);
      await settle();
      fireEvent.changeText(search(screen), "zzz");
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(mockToast.error).toHaveBeenCalledWith("Search broke");
      assetAPI.search.mockRejectedValueOnce({});
      fireEvent.changeText(search(screen), "zzzz");
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(mockToast.error).toHaveBeenCalledWith("Search failed");
    });
  });
});

describe("BlockchainScreen", () => {
  const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
  const connected = {
    connected: true,
    network: "hardhat",
    latest_block: 1234567,
    contracts: {
      testToken: {
        address: ADDRESS,
        name: "Test Token",
        symbol: "TST",
        totalSupply: "1000000000000000000000000",
      },
      tokenizedAsset: {
        address: ADDRESS,
        assetName: "Tower",
        assetSymbol: "TWR",
        assetValueCents: 12345600,
        totalSupply: "5000000000000000000",
        tradingEnabled: true,
      },
      portfolioManager: { address: ADDRESS, totalPortfolios: 1500 },
      tradingPlatform: {
        address: ADDRESS,
        totalOrders: 20,
        totalTrades: 7,
        tradingEnabled: false,
      },
      defiIntegration: {
        address: ADDRESS,
        totalStrategies: 3,
        totalInvestments: 9,
      },
    },
  };

  it("shows network stats and every contract card", async () => {
    blockchainAPI.explorer.mockResolvedValue(connected);
    const screen = render(<BlockchainScreen navigation={navigation} />);
    expect(await screen.findByText("Connected")).toBeTruthy();
    expect(screen.getByText("hardhat")).toBeTruthy();
    expect(screen.getByText("1,234,567")).toBeTruthy();
    expect(screen.getByText("Test Token (TST)")).toBeTruthy();
    expect(screen.getByText("1,000,000.00")).toBeTruthy();
    expect(screen.getByText("Tower (TWR)")).toBeTruthy();
    expect(screen.getByText("$123,456")).toBeTruthy();
    expect(screen.getByText("Trading on")).toBeTruthy();
    expect(screen.getByText("Trading off")).toBeTruthy();
    expect(screen.getByText("1,500")).toBeTruthy();
    expect(screen.getAllByText("0x1234...5678")).toHaveLength(5);
  });

  it("uses dashes for missing optional fields", async () => {
    blockchainAPI.explorer.mockResolvedValue({
      connected: true,
      network: "local",
      contracts: {
        testToken: { address: "short" },
        tokenizedAsset: {},
      },
    });
    const screen = render(<BlockchainScreen navigation={navigation} />);
    await screen.findByText("TestToken");
    expect(screen.getAllByText("- (-)")).toHaveLength(2);
    expect(screen.getByText("short")).toBeTruthy();
    expect(screen.getByText("Latest block").parent).toBeTruthy();
  });

  it("explains how to start a network when disconnected", async () => {
    blockchainAPI.explorer.mockResolvedValue({ connected: false });
    const screen = render(<BlockchainScreen navigation={navigation} />);
    expect(
      await screen.findByText("No local blockchain network reachable"),
    ).toBeTruthy();
    expect(screen.getByText("Offline")).toBeTruthy();
  });

  it("reports backend failures", async () => {
    blockchainAPI.explorer.mockRejectedValueOnce(new Error("Unreachable"));
    const screen = render(<BlockchainScreen navigation={navigation} />);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Unreachable"),
    );
    blockchainAPI.explorer.mockRejectedValueOnce({});
    await act(async () => {
      screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });
    expect(mockToast.error).toHaveBeenCalledWith("Failed to reach the backend");
  });
});

describe("AppNavigator", () => {
  it("renders without crashing", () => {
    expect(() => render(<AppNavigator />)).not.toThrow();
  });
});
