import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useRouter } from "next/router";
import AllocationChart from "../../components/portfolio/AllocationChart";
import CreatePortfolioModal from "../../components/portfolio/CreatePortfolioModal";
import PortfolioSettingsForm from "../../components/portfolio/PortfolioSettingsForm";
import RiskPanel from "../../components/portfolio/RiskPanel";
import TradeModal from "../../components/portfolio/TradeModal";
import { assetAPI, portfolioAPI } from "../../services/api";

jest.mock("next/router", () => ({ useRouter: jest.fn() }));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
};

jest.mock("../../context/ToastContext", () => ({
  useToast: () => mockToast,
}));

jest.mock("../../services/api", () => ({
  portfolioAPI: {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    buy: jest.fn(),
    sell: jest.fn(),
  },
  assetAPI: { list: jest.fn(), search: jest.fn() },
}));

const push = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useRouter.mockReturnValue({ push });
});

describe("AllocationChart", () => {
  it("shows an empty message when there is no allocation", () => {
    render(<AllocationChart />);
    expect(screen.getByText(/No positions yet/)).toBeInTheDocument();
  });

  it("lists asset types with formatted labels and percentages", () => {
    render(
      <AllocationChart
        byAssetType={{ stock: 60.126, mutual_fund: 39.874 }}
        byAsset={{}}
      />,
    );
    expect(screen.getByText("By asset type")).toBeInTheDocument();
    expect(screen.getByText("Stock")).toBeInTheDocument();
    expect(screen.getByText("Mutual Fund")).toBeInTheDocument();
    expect(screen.getByText("60.13%")).toBeInTheDocument();
    expect(screen.getByText("39.87%")).toBeInTheDocument();
    expect(screen.queryByText("By position")).not.toBeInTheDocument();
  });

  it("lists positions sorted by value descending", () => {
    render(
      <AllocationChart
        byAssetType={{ stock: 100 }}
        byAsset={{
          MSFT: { value: 500, percentage: 25 },
          AAPL: { value: 1500, percentage: 75 },
        }}
      />,
    );
    expect(screen.getByText("By position")).toBeInTheDocument();
    const rows = screen.getAllByText(/^(AAPL|MSFT)$/);
    expect(rows.map((r) => r.textContent)).toEqual(["AAPL", "MSFT"]);
    expect(screen.getByText(/\$1,500\.00 \(75\.0%\)/)).toBeInTheDocument();
  });

  it("cycles colors when there are more types than palette entries", () => {
    const many = {};
    for (let i = 0; i < 10; i += 1) many[`type_${i}`] = 10;
    render(<AllocationChart byAssetType={many} />);
    expect(screen.getAllByText("10%")).toHaveLength(10);
  });
});

describe("RiskPanel", () => {
  const base = {
    risk_score: 15,
    volatility: 12.345,
    max_position_size: 0.1,
    max_sector_allocation: 0.3,
    stop_loss_threshold: 0.05,
    violations: [],
  };

  it("renders nothing without risk data", () => {
    const { container } = render(<RiskPanel risk={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows score, volatility and limits", () => {
    render(<RiskPanel risk={base} />);
    expect(screen.getByText("15 / 100")).toBeInTheDocument();
    expect(screen.getByText("12.35%")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
    expect(
      screen.getByText(/No risk limit violations detected/),
    ).toBeInTheDocument();
  });

  it.each([
    [10, "text-emerald-600"],
    [20, "text-emerald-600"],
    [21, "text-amber-600"],
    [50, "text-amber-600"],
    [51, "text-red-600"],
  ])("colors a score of %s with %s", (score, cls) => {
    render(<RiskPanel risk={{ ...base, risk_score: score }} />);
    expect(screen.getByText(`${score} / 100`)).toHaveClass(cls);
  });

  it("caps the score bar at 100 percent", () => {
    const { container } = render(
      <RiskPanel risk={{ ...base, risk_score: 140, volatility: 250 }} />,
    );
    const bars = container.querySelectorAll("[style]");
    expect(bars[0]).toHaveStyle({ width: "100%" });
    expect(bars[1]).toHaveStyle({ width: "100%" });
  });

  it("defaults missing numbers to zero and dashes missing limits", () => {
    render(<RiskPanel risk={{}} />);
    expect(screen.getByText("0 / 100")).toBeInTheDocument();
    expect(screen.getByText("0.00%")).toBeInTheDocument();
    expect(screen.getAllByText("-")).toHaveLength(3);
  });

  it("describes position size and sector violations", () => {
    render(
      <RiskPanel
        risk={{
          ...base,
          violations: [
            { type: "position_size", asset: "AAPL", current: 0.25, limit: 0.1 },
            {
              type: "sector_allocation",
              sector: "real_estate",
              current: 0.45,
              limit: 0.3,
            },
          ],
        }}
      />,
    );
    expect(
      screen.getByText("AAPL exceeds max position size"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Real Estate sector exceeds max allocation"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Currently 25\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/Limit\s+10\.0%/)).toBeInTheDocument();
  });

  it("treats a missing violations list as no violations", () => {
    render(<RiskPanel risk={{ ...base, violations: undefined }} />);
    expect(
      screen.getByText(/No risk limit violations detected/),
    ).toBeInTheDocument();
  });
});

describe("CreatePortfolioModal", () => {
  const setup = (props = {}) => {
    const onClose = jest.fn();
    const onCreated = jest.fn();
    render(
      <CreatePortfolioModal
        isOpen
        onClose={onClose}
        onCreated={onCreated}
        {...props}
      />,
    );
    return { onClose, onCreated };
  };

  it("renders nothing when closed", () => {
    render(<CreatePortfolioModal isOpen={false} onClose={jest.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("starts with sensible defaults", () => {
    setup();
    expect(screen.getByLabelText("Type")).toHaveValue("personal");
    expect(screen.getByLabelText("Risk level")).toHaveValue("moderate");
    expect(screen.getByLabelText("Base currency")).toHaveValue("USD");
    expect(screen.getByLabelText("Starting cash")).toHaveValue(10000);
  });

  it("requires a portfolio name", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Create Portfolio" }));
    expect(
      await screen.findByText("Portfolio name is required"),
    ).toBeInTheDocument();
    expect(portfolioAPI.create).not.toHaveBeenCalled();
  });

  it("submits the trimmed payload and reports success", async () => {
    portfolioAPI.create.mockResolvedValue({ id: 1 });
    const { onCreated } = setup();
    fireEvent.change(screen.getByLabelText(/Portfolio name/), {
      target: { value: "  Growth  " },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "  Long term  " },
    });
    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "retirement" },
    });
    fireEvent.change(screen.getByLabelText("Risk level"), {
      target: { value: "high" },
    });
    fireEvent.change(screen.getByLabelText("Base currency"), {
      target: { value: "EUR" },
    });
    fireEvent.change(screen.getByLabelText("Starting cash"), {
      target: { value: "2500.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Portfolio" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(portfolioAPI.create).toHaveBeenCalledWith({
      name: "Growth",
      description: "Long term",
      portfolio_type: "retirement",
      risk_level: "high",
      base_currency: "EUR",
      initial_cash: 2500.5,
    });
    expect(mockToast.success).toHaveBeenCalledWith(
      "Portfolio created successfully",
    );
  });

  it("omits an empty description and sends zero cash when blank", async () => {
    portfolioAPI.create.mockResolvedValue({});
    setup();
    fireEvent.change(screen.getByLabelText(/Portfolio name/), {
      target: { value: "Simple" },
    });
    fireEvent.change(screen.getByLabelText("Starting cash"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Portfolio" }));
    await waitFor(() => expect(portfolioAPI.create).toHaveBeenCalled());
    const payload = portfolioAPI.create.mock.calls[0][0];
    expect(payload.description).toBeUndefined();
    expect(payload.initial_cash).toBe(0);
  });

  it("resets the form after a successful create", async () => {
    portfolioAPI.create.mockResolvedValue({});
    setup();
    const name = screen.getByLabelText(/Portfolio name/);
    fireEvent.change(name, { target: { value: "Temp" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Portfolio" }));
    await waitFor(() => expect(name).toHaveValue(""));
  });

  it("shows an error toast when the request fails", async () => {
    portfolioAPI.create.mockRejectedValue(new Error("Name taken"));
    const { onCreated } = setup();
    fireEvent.change(screen.getByLabelText(/Portfolio name/), {
      target: { value: "Dup" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Portfolio" }));
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Name taken"),
    );
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("falls back to a generic error message", async () => {
    portfolioAPI.create.mockRejectedValue({});
    setup();
    fireEvent.change(screen.getByLabelText(/Portfolio name/), {
      target: { value: "Dup" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Portfolio" }));
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        "Failed to create portfolio",
      ),
    );
  });

  it("clears the form and closes on cancel", () => {
    const { onClose } = setup();
    fireEvent.change(screen.getByLabelText(/Portfolio name/), {
      target: { value: "Draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/Portfolio name/)).toHaveValue("");
  });

  it("closes through the dialog close button", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not require an onCreated callback", async () => {
    portfolioAPI.create.mockResolvedValue({});
    render(<CreatePortfolioModal isOpen onClose={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(/Portfolio name/), {
      target: { value: "Solo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Portfolio" }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
  });
});

describe("TradeModal", () => {
  const assets = [
    {
      id: 1,
      symbol: "AAPL",
      name: "Apple",
      current_price: 150,
      currency: "USD",
    },
    { id: 2, symbol: "BTC", name: "Bitcoin", current_price: 60000 },
  ];
  const holdings = [
    {
      id: 10,
      quantity: 5,
      asset: { id: 1, symbol: "AAPL", name: "Apple", current_price: 150 },
    },
    {
      id: 11,
      quantity: 2,
      asset: { id: 2, symbol: "BTC", name: "Bitcoin", current_price: 60000 },
    },
    { id: 12, quantity: 0, asset: { id: 3, symbol: "ZERO", name: "Zero" } },
    { id: 13, quantity: 4, asset: null },
  ];

  beforeEach(() => {
    assetAPI.list.mockResolvedValue(assets);
    assetAPI.search.mockResolvedValue([assets[1]]);
  });

  describe("buy mode", () => {
    const renderBuy = (props = {}) => {
      const onClose = jest.fn();
      const onSuccess = jest.fn();
      render(
        <TradeModal
          isOpen
          mode="buy"
          portfolioId={7}
          onClose={onClose}
          onSuccess={onSuccess}
          {...props}
        />,
      );
      return { onClose, onSuccess };
    };

    it("loads popular assets when opened", async () => {
      renderBuy();
      expect(await screen.findByLabelText("Select AAPL")).toBeInTheDocument();
      expect(assetAPI.list).toHaveBeenCalledWith({ limit: 12 });
      expect(assetAPI.list).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("dialog", { name: "Buy Asset" })).toBeVisible();
    });

    it("shows an empty message when no assets load", async () => {
      assetAPI.list.mockRejectedValue(new Error("down"));
      renderBuy();
      expect(await screen.findByText("No assets found")).toBeInTheDocument();
    });

    it("treats a null result as an empty list", async () => {
      assetAPI.list.mockResolvedValue(null);
      renderBuy();
      expect(await screen.findByText("No assets found")).toBeInTheDocument();
    });

    it("disables the submit button until an asset is selected", async () => {
      renderBuy();
      await screen.findByLabelText("Select AAPL");
      expect(screen.getByRole("button", { name: /^Buy/ })).toBeDisabled();
    });

    it("selects an asset, prefilling the price and estimating the total", async () => {
      renderBuy();
      fireEvent.click(await screen.findByLabelText("Select AAPL"));
      expect(screen.getByLabelText("Price per unit")).toHaveValue(150);
      expect(screen.getByLabelText("Quantity")).toHaveValue(1);
      expect(screen.getByText(/Market:/)).toHaveTextContent("Market: $150.00");
      expect(screen.getByText("Estimated total").nextSibling).toHaveTextContent(
        "$150.00",
      );
      fireEvent.change(screen.getByLabelText("Quantity"), {
        target: { value: "3" },
      });
      expect(screen.getByText("Estimated total").nextSibling).toHaveTextContent(
        "$450.00",
      );
      expect(screen.getByRole("button", { name: "Buy AAPL" })).toBeEnabled();
    });

    it("uses an empty price when the asset has none", async () => {
      assetAPI.list.mockResolvedValue([{ id: 9, symbol: "NOPE", name: "N" }]);
      renderBuy();
      fireEvent.click(await screen.findByLabelText("Select NOPE"));
      expect(screen.getByLabelText("Price per unit")).toHaveValue(null);
    });

    it("debounces searches and shows the results", async () => {
      jest.useFakeTimers();
      try {
        renderBuy();
        await act(async () => {
          await Promise.resolve();
        });
        fireEvent.change(screen.getByPlaceholderText(/Search by symbol/), {
          target: { value: "bit" },
        });
        expect(screen.getByText("Searching...")).toBeInTheDocument();
        expect(assetAPI.search).not.toHaveBeenCalled();
        await act(async () => {
          jest.advanceTimersByTime(400);
        });
        expect(assetAPI.search).toHaveBeenCalledWith("bit");
        expect(screen.getByLabelText("Select BTC")).toBeInTheDocument();
        expect(screen.queryByLabelText("Select AAPL")).not.toBeInTheDocument();
      } finally {
        jest.useRealTimers();
      }
    });

    it("does not search for a single character", async () => {
      renderBuy();
      await screen.findByLabelText("Select AAPL");
      fireEvent.change(screen.getByPlaceholderText(/Search by symbol/), {
        target: { value: "b" },
      });
      expect(assetAPI.search).not.toHaveBeenCalled();
    });

    it("handles a failed search", async () => {
      jest.useFakeTimers();
      try {
        assetAPI.search.mockRejectedValue(new Error("fail"));
        renderBuy();
        await act(async () => {
          await Promise.resolve();
        });
        fireEvent.change(screen.getByPlaceholderText(/Search by symbol/), {
          target: { value: "xyz" },
        });
        await act(async () => {
          jest.advanceTimersByTime(400);
        });
        expect(screen.getByText("No assets found")).toBeInTheDocument();
      } finally {
        jest.useRealTimers();
      }
    });

    const pick = async () => {
      fireEvent.click(await screen.findByLabelText("Select AAPL"));
    };
    const submit = () =>
      fireEvent.click(screen.getByRole("button", { name: /^Buy AAPL/ }));

    it("validates quantity and price", async () => {
      renderBuy();
      await pick();
      fireEvent.change(screen.getByLabelText("Quantity"), {
        target: { value: "0" },
      });
      submit();
      expect(
        await screen.findByText("Quantity must be greater than zero"),
      ).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Quantity"), {
        target: { value: "2" },
      });
      fireEvent.change(screen.getByLabelText("Price per unit"), {
        target: { value: "-5" },
      });
      submit();
      expect(
        await screen.findByText("Price must be greater than zero"),
      ).toBeInTheDocument();
      expect(portfolioAPI.buy).not.toHaveBeenCalled();
    });

    it("submits a buy order and reports success", async () => {
      portfolioAPI.buy.mockResolvedValue({ ok: true });
      const { onSuccess } = renderBuy();
      await pick();
      fireEvent.change(screen.getByLabelText("Quantity"), {
        target: { value: "2" },
      });
      submit();
      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ ok: true }));
      expect(portfolioAPI.buy).toHaveBeenCalledWith(7, {
        assetSymbol: "AAPL",
        quantity: 2,
        price: 150,
      });
      expect(mockToast.success).toHaveBeenCalledWith("Bought 2 AAPL @ $150.00");
    });

    it("shows the backend error inside the form", async () => {
      portfolioAPI.buy.mockRejectedValue(new Error("Insufficient cash"));
      const { onSuccess } = renderBuy();
      await pick();
      submit();
      expect(await screen.findByText("Insufficient cash")).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("falls back to a generic failure message", async () => {
      portfolioAPI.buy.mockRejectedValue({});
      renderBuy();
      await pick();
      submit();
      expect(
        await screen.findByText("Failed to buy asset"),
      ).toBeInTheDocument();
    });

    it("cancels through the cancel button", async () => {
      const { onClose } = renderBuy();
      await screen.findByLabelText("Select AAPL");
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("sell mode", () => {
    const renderSell = (props = {}) => {
      const onClose = jest.fn();
      const onSuccess = jest.fn();
      render(
        <TradeModal
          isOpen
          mode="sell"
          portfolioId={7}
          holdings={holdings}
          onClose={onClose}
          onSuccess={onSuccess}
          {...props}
        />,
      );
      return { onClose, onSuccess };
    };

    it("only offers holdings with a positive quantity and an asset", () => {
      renderSell();
      const select = screen.getByLabelText("Asset");
      const options = within(select).getAllByRole("option");
      expect(options.map((o) => o.value)).toEqual(["AAPL", "BTC"]);
      expect(options[0]).toHaveTextContent("AAPL: Apple (own 5)");
      expect(assetAPI.list).not.toHaveBeenCalled();
    });

    it("selects the first holding by default and shows the maximum", () => {
      renderSell();
      expect(screen.getByLabelText("Asset")).toHaveValue("AAPL");
      expect(screen.getByLabelText("Price per unit")).toHaveValue(150);
      expect(screen.getByText("Max: 5")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sell AAPL" })).toBeEnabled();
    });

    it("honors a preset symbol", () => {
      renderSell({ presetSymbol: "BTC" });
      expect(screen.getByLabelText("Asset")).toHaveValue("BTC");
      expect(screen.getByLabelText("Price per unit")).toHaveValue(60000);
    });

    it("switches asset from the dropdown", () => {
      renderSell();
      fireEvent.change(screen.getByLabelText("Asset"), {
        target: { value: "BTC" },
      });
      expect(screen.getByLabelText("Price per unit")).toHaveValue(60000);
      expect(screen.getByText("Max: 2")).toBeInTheDocument();
    });

    it("explains when there is nothing to sell", () => {
      renderSell({ holdings: [] });
      expect(
        screen.getByRole("option", { name: "No holdings to sell" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Sell/ })).toBeDisabled();
    });

    it("rejects selling more than is owned", async () => {
      renderSell();
      fireEvent.change(screen.getByLabelText("Quantity"), {
        target: { value: "9" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Sell AAPL" }));
      expect(
        await screen.findByText("You only own 5 shares/units of AAPL"),
      ).toBeInTheDocument();
      expect(portfolioAPI.sell).not.toHaveBeenCalled();
    });

    it("submits a sell order", async () => {
      portfolioAPI.sell.mockResolvedValue({ ok: true });
      const { onSuccess } = renderSell();
      fireEvent.change(screen.getByLabelText("Quantity"), {
        target: { value: "2" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Sell AAPL" }));
      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(portfolioAPI.sell).toHaveBeenCalledWith(7, {
        assetSymbol: "AAPL",
        quantity: 2,
        price: 150,
      });
      expect(mockToast.success).toHaveBeenCalledWith("Sold 2 AAPL @ $150.00");
    });

    it("shows a failure message when selling fails", async () => {
      portfolioAPI.sell.mockRejectedValue({});
      renderSell();
      fireEvent.click(screen.getByRole("button", { name: "Sell AAPL" }));
      expect(
        await screen.findByText("Failed to sell asset"),
      ).toBeInTheDocument();
    });
  });

  it("renders nothing while closed", () => {
    render(<TradeModal isOpen={false} onClose={jest.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("PortfolioSettingsForm", () => {
  const portfolio = {
    id: 3,
    name: "Retirement",
    description: "Long game",
    investment_objective: "Growth",
    risk_level: "low",
    max_position_size: 0.2,
    max_sector_allocation: 0.4,
    stop_loss_threshold: 0.1,
  };

  const renderForm = (props = {}) => {
    const onUpdated = jest.fn();
    render(
      <PortfolioSettingsForm
        portfolio={portfolio}
        onUpdated={onUpdated}
        {...props}
      />,
    );
    return { onUpdated };
  };

  it("pre-fills the form from the portfolio, converting ratios to percentages", () => {
    renderForm();
    expect(screen.getByLabelText(/Portfolio name/)).toHaveValue("Retirement");
    expect(screen.getByLabelText("Description")).toHaveValue("Long game");
    expect(screen.getByLabelText("Investment objective")).toHaveValue("Growth");
    expect(screen.getByLabelText("Risk level")).toHaveValue("low");
    expect(screen.getByLabelText(/Max position size/)).toHaveValue(20);
    expect(screen.getByLabelText(/Max sector allocation/)).toHaveValue(40);
    expect(screen.getByLabelText(/Stop-loss threshold/)).toHaveValue(10);
  });

  it.each([
    [0.07, 7],
    [0.29, 29],
    [0.57, 57],
    [0.0725, 7.25],
    [0.155, 15.5],
  ])(
    "shows a stored ratio of %s as %s percent without float noise",
    (ratio, shown) => {
      renderForm({
        portfolio: {
          ...portfolio,
          max_position_size: ratio,
          max_sector_allocation: ratio,
          stop_loss_threshold: ratio,
        },
      });
      expect(screen.getByLabelText(/Max position size/)).toHaveValue(shown);
      expect(screen.getByLabelText(/Max sector allocation/)).toHaveValue(shown);
      expect(screen.getByLabelText(/Stop-loss threshold/)).toHaveValue(shown);
    },
  );

  it("round trips a noisy ratio back to the same value on save", async () => {
    portfolioAPI.update.mockResolvedValue(portfolio);
    renderForm({ portfolio: { ...portfolio, max_position_size: 0.07 } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(portfolioAPI.update).toHaveBeenCalled());
    expect(portfolioAPI.update.mock.calls[0][1].max_position_size).toBe(0.07);
  });

  it("falls back to default limits and a moderate risk level", () => {
    renderForm({ portfolio: { id: 1 } });
    expect(screen.getByLabelText(/Portfolio name/)).toHaveValue("");
    expect(screen.getByLabelText("Risk level")).toHaveValue("moderate");
    expect(screen.getByLabelText(/Max position size/)).toHaveValue(10);
    expect(screen.getByLabelText(/Max sector allocation/)).toHaveValue(30);
    expect(screen.getByLabelText(/Stop-loss threshold/)).toHaveValue(5);
  });

  it("requires a name before saving", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/Portfolio name/), {
      target: { value: " " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      await screen.findByText("Portfolio name is required"),
    ).toBeInTheDocument();
    expect(portfolioAPI.update).not.toHaveBeenCalled();
  });

  it("saves converted values and reports the updated portfolio", async () => {
    const updated = { ...portfolio, name: "Renamed" };
    portfolioAPI.update.mockResolvedValue(updated);
    const { onUpdated } = renderForm();
    fireEvent.change(screen.getByLabelText(/Portfolio name/), {
      target: { value: " Renamed " },
    });
    fireEvent.change(screen.getByLabelText(/Max position size/), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
    expect(portfolioAPI.update).toHaveBeenCalledWith(3, {
      name: "Renamed",
      description: "Long game",
      investment_objective: "Growth",
      risk_level: "low",
      max_position_size: 0.25,
      max_sector_allocation: 0.4,
      stop_loss_threshold: 0.1,
    });
    expect(mockToast.success).toHaveBeenCalledWith("Portfolio settings saved");
  });

  it("shows an error toast when saving fails", async () => {
    portfolioAPI.update.mockRejectedValue(new Error("Nope"));
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Nope"));
  });

  it("uses a generic message for unknown save failures", async () => {
    portfolioAPI.update.mockRejectedValue({});
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Failed to save settings"),
    );
  });

  it("works without an onUpdated callback", async () => {
    portfolioAPI.update.mockResolvedValue(portfolio);
    render(<PortfolioSettingsForm portfolio={portfolio} />);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
  });

  it("asks for confirmation before deleting and can be cancelled", () => {
    renderForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Delete this portfolio" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Delete portfolio?" });
    expect(within(dialog).getByText("Retirement")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(portfolioAPI.remove).not.toHaveBeenCalled();
  });

  it("deletes the portfolio and navigates back to the list", async () => {
    portfolioAPI.remove.mockResolvedValue({});
    renderForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Delete this portfolio" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/portfolios"));
    expect(portfolioAPI.remove).toHaveBeenCalledWith(3);
    expect(mockToast.success).toHaveBeenCalledWith("Portfolio deleted");
  });

  it("reports a failed delete and stays on the page", async () => {
    portfolioAPI.remove.mockRejectedValue(new Error("Locked"));
    renderForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Delete this portfolio" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Locked"));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });

  it("uses a generic message for unknown delete failures", async () => {
    portfolioAPI.remove.mockRejectedValue({});
    renderForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Delete this portfolio" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        "Failed to delete portfolio",
      ),
    );
  });
});
