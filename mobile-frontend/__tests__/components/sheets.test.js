import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, Image, TextInput } from "react-native";
import MfaSetupSheet from "../../src/components/account/MfaSetupSheet";
import CreatePortfolioModal from "../../src/components/portfolio/CreatePortfolioModal";
import PortfolioSettingsSheet from "../../src/components/portfolio/PortfolioSettingsSheet";
import TradeModal from "../../src/components/portfolio/TradeModal";
import { assetAPI, authAPI, portfolioAPI } from "../../src/lib/api";

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
  authAPI: { setupMfa: jest.fn(), enableMfa: jest.fn() },
  portfolioAPI: {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    buy: jest.fn(),
    sell: jest.fn(),
  },
  assetAPI: { list: jest.fn(), search: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const inputs = (screen) => screen.UNSAFE_getAllByType(TextInput);

describe("MfaSetupSheet", () => {
  const setupData = {
    qr_code: "QRDATA",
    secret: "SECRET123",
    backup_codes: ["code-one", "code-two"],
  };

  beforeEach(() => {
    authAPI.setupMfa.mockResolvedValue(setupData);
  });

  it("does not start setup while hidden", () => {
    render(<MfaSetupSheet visible={false} onClose={jest.fn()} />);
    expect(authAPI.setupMfa).not.toHaveBeenCalled();
  });

  it("starts setup when shown and renders the QR code and secret", async () => {
    const screen = render(<MfaSetupSheet visible onClose={jest.fn()} />);
    expect(await screen.findByText("SECRET123")).toBeTruthy();
    expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
      uri: "data:image/png;base64,QRDATA",
    });
    expect(authAPI.setupMfa).toHaveBeenCalledTimes(1);
  });

  it("shows an error and retries", async () => {
    authAPI.setupMfa.mockRejectedValueOnce(new Error("Setup failed"));
    const screen = render(<MfaSetupSheet visible onClose={jest.fn()} />);
    expect(await screen.findByText("Setup failed")).toBeTruthy();
    fireEvent.press(screen.getByText("Try again"));
    expect(await screen.findByText("SECRET123")).toBeTruthy();
  });

  it("uses a generic message when the error has none", async () => {
    authAPI.setupMfa.mockRejectedValueOnce({});
    const screen = render(<MfaSetupSheet visible onClose={jest.fn()} />);
    expect(await screen.findByText("Failed to start MFA setup")).toBeTruthy();
  });

  const reachScan = async (props = {}) => {
    const screen = render(
      <MfaSetupSheet visible onClose={jest.fn()} {...props} />,
    );
    await screen.findByText("SECRET123");
    return screen;
  };

  it("strips non digits from the code", async () => {
    const screen = await reachScan();
    fireEvent.changeText(inputs(screen)[0], "12ab34");
    expect(inputs(screen)[0].props.value).toBe("1234");
  });

  it("requires a full code", async () => {
    const screen = await reachScan();
    fireEvent.changeText(inputs(screen)[0], "123");
    fireEvent.press(screen.getByText("Verify & enable"));
    expect(
      await screen.findByText(
        "Enter the 6-digit code from your authenticator app",
      ),
    ).toBeTruthy();
    expect(authAPI.enableMfa).not.toHaveBeenCalled();
  });

  it("shows the server error and a generic fallback", async () => {
    authAPI.enableMfa.mockRejectedValueOnce(new Error("Wrong code"));
    const screen = await reachScan();
    fireEvent.changeText(inputs(screen)[0], "000000");
    fireEvent.press(screen.getByText("Verify & enable"));
    expect(await screen.findByText("Wrong code")).toBeTruthy();
    authAPI.enableMfa.mockRejectedValueOnce({});
    fireEvent.press(screen.getByText("Verify & enable"));
    expect(await screen.findByText(/Invalid code/)).toBeTruthy();
  });

  it("enables MFA, shows backup codes and finishes", async () => {
    authAPI.enableMfa.mockResolvedValue({});
    const onClose = jest.fn();
    const onEnabled = jest.fn();
    const screen = await reachScan({ onClose, onEnabled });
    fireEvent.changeText(inputs(screen)[0], "123456");
    fireEvent.press(screen.getByText("Verify & enable"));
    expect(await screen.findByText("code-one")).toBeTruthy();
    expect(screen.getByText("code-two")).toBeTruthy();
    expect(authAPI.enableMfa).toHaveBeenCalledWith("123456");
    expect(mockToast.success).toHaveBeenCalledWith(
      "Two-factor authentication enabled",
    );
    fireEvent.press(screen.getByText("Done"));
    expect(onEnabled).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("finishes without an onEnabled callback", async () => {
    authAPI.enableMfa.mockResolvedValue({});
    const onClose = jest.fn();
    const screen = await reachScan({ onClose });
    fireEvent.changeText(inputs(screen)[0], "123456");
    fireEvent.press(screen.getByText("Verify & enable"));
    fireEvent.press(await screen.findByText("Done"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("CreatePortfolioModal", () => {
  const setup = (props = {}) => {
    const onClose = jest.fn();
    const onCreated = jest.fn();
    const screen = render(
      <CreatePortfolioModal
        visible
        onClose={onClose}
        onCreated={onCreated}
        {...props}
      />,
    );
    return { screen, onClose, onCreated };
  };

  it("starts with sensible defaults", () => {
    const { screen } = setup();
    expect(screen.getByText("Personal")).toBeTruthy();
    expect(screen.getByText("Moderate")).toBeTruthy();
    expect(screen.getByText("USD")).toBeTruthy();
    expect(inputs(screen)[2].props.value).toBe("10000");
  });

  it("requires a name", async () => {
    const { screen } = setup();
    fireEvent.press(screen.getByText("Create Portfolio"));
    expect(await screen.findByText("Portfolio name is required")).toBeTruthy();
    expect(portfolioAPI.create).not.toHaveBeenCalled();
  });

  it("submits a trimmed payload and reports success", async () => {
    portfolioAPI.create.mockResolvedValue({ id: 1 });
    const { screen, onCreated } = setup();
    fireEvent.changeText(inputs(screen)[0], "  Growth  ");
    fireEvent.changeText(inputs(screen)[1], "  Long term  ");
    fireEvent.changeText(inputs(screen)[2], "2500.5");
    fireEvent.press(screen.getByText("Personal"));
    fireEvent.press(screen.getByText("Retirement"));
    fireEvent.press(screen.getByText("Moderate"));
    fireEvent.press(screen.getByText("High"));
    fireEvent.press(screen.getByText("USD"));
    fireEvent.press(screen.getByText("EUR"));
    fireEvent.press(screen.getByText("Create Portfolio"));
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
    const { screen } = setup();
    fireEvent.changeText(inputs(screen)[0], "Simple");
    fireEvent.changeText(inputs(screen)[2], "");
    fireEvent.press(screen.getByText("Create Portfolio"));
    await waitFor(() => expect(portfolioAPI.create).toHaveBeenCalled());
    const payload = portfolioAPI.create.mock.calls[0][0];
    expect(payload.description).toBeUndefined();
    expect(payload.initial_cash).toBe(0);
  });

  it("resets the form after creating", async () => {
    portfolioAPI.create.mockResolvedValue({});
    const { screen } = setup();
    fireEvent.changeText(inputs(screen)[0], "Temp");
    fireEvent.press(screen.getByText("Create Portfolio"));
    await waitFor(() => expect(inputs(screen)[0].props.value).toBe(""));
  });

  it("shows the backend error and a generic fallback", async () => {
    portfolioAPI.create.mockRejectedValueOnce(new Error("Name taken"));
    const { screen, onCreated } = setup();
    fireEvent.changeText(inputs(screen)[0], "Dup");
    fireEvent.press(screen.getByText("Create Portfolio"));
    expect(await screen.findByText("Name taken")).toBeTruthy();
    expect(onCreated).not.toHaveBeenCalled();
    portfolioAPI.create.mockRejectedValueOnce({});
    fireEvent.press(screen.getByText("Create Portfolio"));
    expect(await screen.findByText("Failed to create portfolio")).toBeTruthy();
  });

  it("clears the form and closes from the modal", () => {
    const { screen, onClose } = setup();
    fireEvent.changeText(inputs(screen)[0], "Draft");
    screen
      .UNSAFE_getByType(require("react-native").Modal)
      .props.onRequestClose();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(inputs(screen)[0].props.value).toBe("");
  });

  it("works without an onCreated callback", async () => {
    portfolioAPI.create.mockResolvedValue({});
    const screen = render(<CreatePortfolioModal visible onClose={jest.fn()} />);
    fireEvent.changeText(inputs(screen)[0], "Solo");
    fireEvent.press(screen.getByText("Create Portfolio"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
  });
});

describe("PortfolioSettingsSheet", () => {
  const portfolio = {
    id: 3,
    name: "Retirement",
    description: "Long game",
    risk_level: "low",
    max_position_size: 0.2,
    max_sector_allocation: 0.4,
    stop_loss_threshold: 0.1,
  };

  const setup = (props = {}) => {
    const onUpdated = jest.fn();
    const onDeleted = jest.fn();
    const screen = render(
      <PortfolioSettingsSheet
        visible
        portfolio={portfolio}
        onClose={jest.fn()}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
        {...props}
      />,
    );
    return { screen, onUpdated, onDeleted };
  };

  it("pre-fills the form and converts ratios to percentages", () => {
    const { screen } = setup();
    const values = inputs(screen).map((i) => i.props.value);
    expect(values).toEqual(["Retirement", "Long game", "20", "40", "10"]);
    expect(screen.getByText("Low")).toBeTruthy();
  });

  it.each([
    [0.07, "7"],
    [0.29, "29"],
    [0.57, "57"],
    [0.0725, "7.25"],
  ])("shows a stored ratio of %s as %s without float noise", (ratio, shown) => {
    const { screen } = setup({
      portfolio: {
        ...portfolio,
        max_position_size: ratio,
        max_sector_allocation: ratio,
        stop_loss_threshold: ratio,
      },
    });
    expect(
      inputs(screen)
        .slice(2)
        .map((i) => i.props.value),
    ).toEqual([shown, shown, shown]);
  });

  it("falls back to defaults for a missing portfolio", () => {
    const screen = render(
      <PortfolioSettingsSheet
        visible
        portfolio={undefined}
        onClose={jest.fn()}
      />,
    );
    expect(inputs(screen).map((i) => i.props.value)).toEqual([
      "",
      "",
      "10",
      "30",
      "5",
    ]);
    expect(screen.getByText("Moderate")).toBeTruthy();
  });

  it("requires a name", async () => {
    const { screen } = setup();
    fireEvent.changeText(inputs(screen)[0], " ");
    fireEvent.press(screen.getByText("Save changes"));
    expect(await screen.findByText("Portfolio name is required")).toBeTruthy();
    expect(portfolioAPI.update).not.toHaveBeenCalled();
  });

  it("saves converted values and reports the update", async () => {
    const updated = { ...portfolio, name: "Renamed" };
    portfolioAPI.update.mockResolvedValue(updated);
    const { screen, onUpdated } = setup();
    fireEvent.changeText(inputs(screen)[0], " Renamed ");
    fireEvent.changeText(inputs(screen)[2], "25");
    fireEvent.press(screen.getByText("Low"));
    fireEvent.press(screen.getByText("Very High"));
    fireEvent.press(screen.getByText("Save changes"));
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
    expect(portfolioAPI.update).toHaveBeenCalledWith(3, {
      name: "Renamed",
      description: "Long game",
      risk_level: "very_high",
      max_position_size: 0.25,
      max_sector_allocation: 0.4,
      stop_loss_threshold: 0.1,
    });
    expect(mockToast.success).toHaveBeenCalledWith("Portfolio settings saved");
  });

  it("shows the save error and a generic fallback", async () => {
    portfolioAPI.update.mockRejectedValueOnce(new Error("Nope"));
    const { screen } = setup();
    fireEvent.press(screen.getByText("Save changes"));
    expect(await screen.findByText("Nope")).toBeTruthy();
    portfolioAPI.update.mockRejectedValueOnce({});
    fireEvent.press(screen.getByText("Save changes"));
    expect(await screen.findByText("Failed to save settings")).toBeTruthy();
  });

  it("works without an onUpdated callback", async () => {
    portfolioAPI.update.mockResolvedValue(portfolio);
    const screen = render(
      <PortfolioSettingsSheet
        visible
        portfolio={portfolio}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText("Save changes"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
  });

  describe("deleting", () => {
    let alertSpy;

    beforeEach(() => {
      alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    });

    afterEach(() => {
      alertSpy.mockRestore();
    });

    const confirm = (screen) => {
      fireEvent.press(screen.getByText("Delete this portfolio"));
      const [title, message, buttons] = alertSpy.mock.calls[0];
      return { title, message, buttons };
    };

    it("asks for confirmation first", () => {
      const { screen } = setup();
      const { title, message, buttons } = confirm(screen);
      expect(title).toBe("Delete portfolio?");
      expect(message).toContain("Retirement");
      expect(buttons.map((b) => b.text)).toEqual(["Cancel", "Delete"]);
      expect(portfolioAPI.remove).not.toHaveBeenCalled();
    });

    it("deletes after confirmation", async () => {
      portfolioAPI.remove.mockResolvedValue({});
      const { screen, onDeleted } = setup();
      const { buttons } = confirm(screen);
      await act(async () => {
        await buttons[1].onPress();
      });
      expect(portfolioAPI.remove).toHaveBeenCalledWith(3);
      expect(mockToast.success).toHaveBeenCalledWith("Portfolio deleted");
      expect(onDeleted).toHaveBeenCalledTimes(1);
    });

    it("reports a failed delete", async () => {
      portfolioAPI.remove.mockRejectedValueOnce(new Error("Locked"));
      const { screen, onDeleted } = setup();
      await act(async () => {
        await confirm(screen).buttons[1].onPress();
      });
      expect(mockToast.error).toHaveBeenCalledWith("Locked");
      expect(onDeleted).not.toHaveBeenCalled();
    });

    it("uses a generic message for an unknown delete failure", async () => {
      portfolioAPI.remove.mockRejectedValueOnce({});
      const { screen } = setup();
      await act(async () => {
        await confirm(screen).buttons[1].onPress();
      });
      expect(mockToast.error).toHaveBeenCalledWith(
        "Failed to delete portfolio",
      );
    });
  });
});

describe("TradeModal", () => {
  const assets = [
    { id: 1, symbol: "AAPL", name: "Apple", current_price: 150 },
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
      const onSuccess = jest.fn();
      const screen = render(
        <TradeModal
          visible
          mode="buy"
          portfolioId={7}
          onClose={jest.fn()}
          onSuccess={onSuccess}
          {...props}
        />,
      );
      return { screen, onSuccess };
    };

    it("loads popular assets exactly once when shown", async () => {
      const { screen } = renderBuy();
      expect(await screen.findByText(/^AAPL/)).toBeTruthy();
      expect(assetAPI.list).toHaveBeenCalledTimes(1);
      expect(assetAPI.list).toHaveBeenCalledWith({ limit: 12 });
      expect(screen.getByText("Buy Asset")).toBeTruthy();
    });

    it("does not load anything while hidden", () => {
      renderBuy({ visible: false });
      expect(assetAPI.list).not.toHaveBeenCalled();
    });

    it("shows an empty message when loading fails", async () => {
      assetAPI.list.mockRejectedValue(new Error("down"));
      const { screen } = renderBuy();
      expect(await screen.findByText("No assets found")).toBeTruthy();
    });

    it("treats a null result as empty", async () => {
      assetAPI.list.mockResolvedValue(null);
      const { screen } = renderBuy();
      expect(await screen.findByText("No assets found")).toBeTruthy();
    });

    it("selects an asset, prefills the price and estimates the total", async () => {
      const { screen } = renderBuy();
      fireEvent.press(await screen.findByText(/^AAPL/));
      const values = inputs(screen).map((i) => i.props.value);
      expect(values).toEqual(["", "1", "150"]);
      expect(screen.getByText("Buy AAPL")).toBeTruthy();
      fireEvent.changeText(inputs(screen)[1], "3");
      expect(screen.getByText("$450.00")).toBeTruthy();
    });

    it("leaves the price empty when the asset has none", async () => {
      assetAPI.list.mockResolvedValue([{ id: 9, symbol: "NOPE", name: "N" }]);
      const { screen } = renderBuy();
      fireEvent.press(await screen.findByText(/^NOPE/));
      expect(inputs(screen)[2].props.value).toBe("");
    });

    describe("search", () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it("debounces and shows search results", async () => {
        const { screen } = renderBuy();
        await act(async () => {});
        fireEvent.changeText(inputs(screen)[0], "bit");
        expect(screen.getByText("Searching...")).toBeTruthy();
        expect(assetAPI.search).not.toHaveBeenCalled();
        await act(async () => {
          jest.advanceTimersByTime(400);
        });
        expect(assetAPI.search).toHaveBeenCalledWith("bit");
        expect(screen.getByText(/^BTC/)).toBeTruthy();
        expect(screen.queryByText(/^AAPL/)).toBeNull();
      });

      it("ignores a single character", async () => {
        const { screen } = renderBuy();
        await act(async () => {});
        fireEvent.changeText(inputs(screen)[0], "b");
        await act(async () => {
          jest.advanceTimersByTime(400);
        });
        expect(assetAPI.search).not.toHaveBeenCalled();
      });

      it("handles a failed search", async () => {
        assetAPI.search.mockRejectedValue(new Error("fail"));
        const { screen } = renderBuy();
        await act(async () => {});
        fireEvent.changeText(inputs(screen)[0], "xyz");
        await act(async () => {
          jest.advanceTimersByTime(400);
        });
        expect(screen.getByText("No assets found")).toBeTruthy();
      });

      it("returns to popular assets when the query is cleared", async () => {
        const { screen } = renderBuy();
        await act(async () => {});
        fireEvent.changeText(inputs(screen)[0], "bit");
        await act(async () => {
          jest.advanceTimersByTime(400);
        });
        assetAPI.list.mockClear();
        fireEvent.changeText(inputs(screen)[0], "");
        await act(async () => {});
        expect(assetAPI.list).toHaveBeenCalledTimes(1);
      });
    });

    const pick = async (screen) => {
      fireEvent.press(await screen.findByText(/^AAPL/));
    };

    it("validates quantity and price", async () => {
      const { screen } = renderBuy();
      await pick(screen);
      fireEvent.changeText(inputs(screen)[1], "0");
      fireEvent.press(screen.getByText("Buy AAPL"));
      expect(
        await screen.findByText("Quantity must be greater than zero"),
      ).toBeTruthy();
      fireEvent.changeText(inputs(screen)[1], "2");
      fireEvent.changeText(inputs(screen)[2], "0");
      fireEvent.press(screen.getByText("Buy AAPL"));
      expect(
        await screen.findByText("Price must be greater than zero"),
      ).toBeTruthy();
      expect(portfolioAPI.buy).not.toHaveBeenCalled();
    });

    it("submits a buy order and reports success", async () => {
      portfolioAPI.buy.mockResolvedValue({ ok: true });
      const { screen, onSuccess } = renderBuy();
      await pick(screen);
      fireEvent.changeText(inputs(screen)[1], "2");
      fireEvent.press(screen.getByText("Buy AAPL"));
      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ ok: true }));
      expect(portfolioAPI.buy).toHaveBeenCalledWith(7, {
        assetSymbol: "AAPL",
        quantity: 2,
        price: 150,
      });
      expect(mockToast.success).toHaveBeenCalledWith("Bought 2 AAPL @ $150.00");
    });

    it("shows the backend error and a generic fallback", async () => {
      portfolioAPI.buy.mockRejectedValueOnce(new Error("Insufficient cash"));
      const { screen } = renderBuy();
      await pick(screen);
      fireEvent.press(screen.getByText("Buy AAPL"));
      expect(await screen.findByText("Insufficient cash")).toBeTruthy();
      portfolioAPI.buy.mockRejectedValueOnce({});
      fireEvent.press(screen.getByText("Buy AAPL"));
      expect(await screen.findByText("Failed to buy asset")).toBeTruthy();
    });

    it("works without an onSuccess callback", async () => {
      portfolioAPI.buy.mockResolvedValue({});
      const { screen } = renderBuy({ onSuccess: undefined });
      await pick(screen);
      fireEvent.press(screen.getByText("Buy AAPL"));
      await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    });
  });

  describe("sell mode", () => {
    const renderSell = (props = {}) => {
      const onSuccess = jest.fn();
      const screen = render(
        <TradeModal
          visible
          mode="sell"
          portfolioId={7}
          holdings={holdings}
          onClose={jest.fn()}
          onSuccess={onSuccess}
          {...props}
        />,
      );
      return { screen, onSuccess };
    };

    it("selects the first sellable holding and shows the maximum", () => {
      const { screen } = renderSell();
      expect(assetAPI.list).not.toHaveBeenCalled();
      expect(screen.getByText("Sell Asset")).toBeTruthy();
      expect(screen.getByText("AAPL - own 5")).toBeTruthy();
      expect(screen.getByText("Max: 5")).toBeTruthy();
      expect(inputs(screen)[1].props.value).toBe("150");
      expect(screen.getByText("Sell AAPL")).toBeTruthy();
    });

    it("honors a preset symbol", () => {
      const { screen } = renderSell({ presetSymbol: "BTC" });
      expect(screen.getByText("BTC - own 2")).toBeTruthy();
      expect(inputs(screen)[1].props.value).toBe("60000");
    });

    it("switches asset from the dropdown", () => {
      const { screen } = renderSell();
      fireEvent.press(screen.getByText("AAPL - own 5"));
      fireEvent.press(screen.getByText("BTC - own 2"));
      expect(screen.getByText("Max: 2")).toBeTruthy();
      expect(inputs(screen)[1].props.value).toBe("60000");
    });

    it("explains when there is nothing to sell", () => {
      const { screen } = renderSell({ holdings: [] });
      expect(screen.getByText("No holdings to sell")).toBeTruthy();
    });

    it("rejects selling more than is owned", async () => {
      const { screen } = renderSell();
      fireEvent.changeText(inputs(screen)[0], "9");
      fireEvent.press(screen.getByText("Sell AAPL"));
      expect(
        await screen.findByText("You only own 5 units of AAPL"),
      ).toBeTruthy();
      expect(portfolioAPI.sell).not.toHaveBeenCalled();
    });

    it("submits a sell order", async () => {
      portfolioAPI.sell.mockResolvedValue({ ok: true });
      const { screen, onSuccess } = renderSell();
      fireEvent.changeText(inputs(screen)[0], "2");
      fireEvent.press(screen.getByText("Sell AAPL"));
      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(portfolioAPI.sell).toHaveBeenCalledWith(7, {
        assetSymbol: "AAPL",
        quantity: 2,
        price: 150,
      });
      expect(mockToast.success).toHaveBeenCalledWith("Sold 2 AAPL @ $150.00");
    });

    it("shows a failure message", async () => {
      portfolioAPI.sell.mockRejectedValueOnce({});
      const { screen } = renderSell();
      fireEvent.press(screen.getByText("Sell AAPL"));
      expect(await screen.findByText("Failed to sell asset")).toBeTruthy();
    });
  });
});
