import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import MarketsPage from "../../pages/markets";
import { assetAPI } from "../../services/api";

jest.mock("../../services/api", () => ({
  assetAPI: { list: jest.fn(), search: jest.fn() },
}));

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("../../context/ToastContext", () => ({
  useToast: () => mockToast,
}));

jest.mock("../../components/layout/DashboardLayout", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ children }) => React.createElement("div", null, children),
  };
});

const assets = [
  {
    id: 1,
    symbol: "AAPL",
    name: "Apple Inc.",
    asset_type: "stock",
    exchange: "NASDAQ",
    sector: "Technology",
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

const searchBox = () => screen.getByPlaceholderText(/Search by symbol or name/);

beforeEach(() => {
  jest.clearAllMocks();
  assetAPI.list.mockResolvedValue(assets);
  assetAPI.search.mockResolvedValue([assets[1]]);
});

describe("MarketsPage", () => {
  it("loads and lists assets", async () => {
    render(<MarketsPage />);
    expect(screen.getByText("Loading market data...")).toBeInTheDocument();
    expect(await screen.findByText("AAPL")).toBeInTheDocument();
    expect(assetAPI.list).toHaveBeenCalledWith({ limit: 60 });
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
    expect(screen.getByText("Technology")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("Stock"),
    ).toBeInTheDocument();
    expect(screen.getByText("NASDAQ")).toBeInTheDocument();
    expect(screen.getByText("$189.50")).toBeInTheDocument();
  });

  it("colors the 24 hour change by direction", async () => {
    render(<MarketsPage />);
    await screen.findByText("AAPL");
    expect(screen.getByText("+1.25%")).toHaveClass("text-emerald-600");
    expect(screen.getByText("-2.10%")).toHaveClass("text-red-600");
    const flatRow = screen.getByText("FLAT").closest("tr");
    const changeCell = flatRow.querySelectorAll("td")[5];
    expect(changeCell).toHaveTextContent("-");
    expect(changeCell).toHaveClass("text-gray-400");
    expect(changeCell).not.toHaveClass("text-emerald-600");
    expect(changeCell).not.toHaveClass("text-red-600");
  });

  it("shows a dash when the exchange is unknown", async () => {
    render(<MarketsPage />);
    await screen.findByText("BTC");
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("shows an empty state when nothing matches", async () => {
    assetAPI.list.mockResolvedValue([]);
    render(<MarketsPage />);
    expect(await screen.findByText("No assets found")).toBeInTheDocument();
  });

  it("treats a null response as empty", async () => {
    assetAPI.list.mockResolvedValue(null);
    render(<MarketsPage />);
    expect(await screen.findByText("No assets found")).toBeInTheDocument();
  });

  it("reports load failures", async () => {
    assetAPI.list.mockRejectedValue(new Error("Feed down"));
    render(<MarketsPage />);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Feed down"),
    );
  });

  it("uses a generic load error", async () => {
    assetAPI.list.mockRejectedValue({});
    render(<MarketsPage />);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        "Failed to load market data",
      ),
    );
  });

  it("fetches the default list exactly once on mount", async () => {
    render(<MarketsPage />);
    await screen.findByText("AAPL");
    expect(assetAPI.list).toHaveBeenCalledTimes(1);
    expect(assetAPI.search).not.toHaveBeenCalled();
  });

  it("fetches once per asset type change", async () => {
    render(<MarketsPage />);
    await screen.findByText("AAPL");
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "stock" },
    });
    await waitFor(() => expect(assetAPI.list).toHaveBeenCalledTimes(2));
    expect(assetAPI.list).toHaveBeenLastCalledWith({
      limit: 60,
      asset_type: "stock",
    });
  });

  it("reloads with the asset type filter", async () => {
    render(<MarketsPage />);
    await screen.findByText("AAPL");
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "cryptocurrency" },
    });
    await waitFor(() =>
      expect(assetAPI.list).toHaveBeenLastCalledWith({
        limit: 60,
        asset_type: "cryptocurrency",
      }),
    );
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
      render(<MarketsPage />);
      await settle();
      fireEvent.change(searchBox(), { target: { value: "bit" } });
      expect(assetAPI.search).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(assetAPI.search).toHaveBeenCalledWith("bit", {});
      expect(screen.getByText("BTC")).toBeInTheDocument();
      expect(screen.queryByText("AAPL")).not.toBeInTheDocument();
    });

    it("includes the selected asset type in the search", async () => {
      render(<MarketsPage />);
      await settle();
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "stock" },
      });
      await settle();
      fireEvent.change(searchBox(), { target: { value: "app" } });
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(assetAPI.search).toHaveBeenCalledWith("app", { type: "stock" });
    });

    it("repeats an active search when the asset type changes", async () => {
      render(<MarketsPage />);
      await settle();
      fireEvent.change(searchBox(), { target: { value: "coin" } });
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      assetAPI.list.mockClear();
      assetAPI.search.mockClear();
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "cryptocurrency" },
      });
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(assetAPI.search).toHaveBeenCalledWith("coin", {
        type: "cryptocurrency",
      });
      expect(assetAPI.list).not.toHaveBeenCalled();
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
      render(<MarketsPage />);
      await settle();
      fireEvent.change(searchBox(), { target: { value: "ap" } });
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      fireEvent.change(searchBox(), { target: { value: "bit" } });
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      await act(async () => {
        resolveFirst([assets[0]]);
      });
      expect(screen.getByText("BTC")).toBeInTheDocument();
      expect(screen.queryByText("AAPL")).not.toBeInTheDocument();
    });

    it("ignores one character queries", async () => {
      render(<MarketsPage />);
      await settle();
      fireEvent.change(searchBox(), { target: { value: "b" } });
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(assetAPI.search).not.toHaveBeenCalled();
    });

    it("restores the default list when the query is cleared", async () => {
      render(<MarketsPage />);
      await settle();
      fireEvent.change(searchBox(), { target: { value: "bit" } });
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      assetAPI.list.mockClear();
      fireEvent.change(searchBox(), { target: { value: "" } });
      await settle();
      expect(assetAPI.list).toHaveBeenCalled();
      expect(screen.getByText("AAPL")).toBeInTheDocument();
    });

    it("reports search failures", async () => {
      assetAPI.search.mockRejectedValue(new Error("Search broke"));
      render(<MarketsPage />);
      await settle();
      fireEvent.change(searchBox(), { target: { value: "zzz" } });
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(mockToast.error).toHaveBeenCalledWith("Search broke");
    });

    it("uses a generic search error", async () => {
      assetAPI.search.mockRejectedValue({});
      render(<MarketsPage />);
      await settle();
      fireEvent.change(searchBox(), { target: { value: "zzz" } });
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(mockToast.error).toHaveBeenCalledWith("Search failed");
    });

    it("treats a null search result as empty", async () => {
      assetAPI.search.mockResolvedValue(null);
      render(<MarketsPage />);
      await settle();
      fireEvent.change(searchBox(), { target: { value: "zzz" } });
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(screen.getByText("No assets found")).toBeInTheDocument();
    });
  });
});
