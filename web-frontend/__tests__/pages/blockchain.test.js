import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BlockchainExplorerPage from "../../pages/blockchain";
import { blockchainAPI } from "../../services/api";

jest.mock("../../services/api", () => ({
  blockchainAPI: { explorer: jest.fn() },
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

const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

const connected = {
  connected: true,
  network: "hardhat",
  chain_id: 31337,
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BlockchainExplorerPage", () => {
  it("shows a loader and then the connection state", async () => {
    blockchainAPI.explorer.mockResolvedValue(connected);
    render(<BlockchainExplorerPage />);
    expect(screen.getByText("Reading on-chain data...")).toBeInTheDocument();
    expect(await screen.findByText("Connected")).toBeInTheDocument();
  });

  it("shows network statistics", async () => {
    blockchainAPI.explorer.mockResolvedValue(connected);
    render(<BlockchainExplorerPage />);
    expect(await screen.findByText("hardhat")).toBeInTheDocument();
    expect(screen.getByText("Chain ID 31337")).toBeInTheDocument();
    expect(screen.getByText("1,234,567")).toBeInTheDocument();
    expect(screen.getByText("Contracts deployed")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders each deployed contract card", async () => {
    blockchainAPI.explorer.mockResolvedValue(connected);
    render(<BlockchainExplorerPage />);
    await screen.findByText("TestToken");
    expect(screen.getByText("Test Token (TST)")).toBeInTheDocument();
    expect(screen.getByText("1,000,000.00")).toBeInTheDocument();
    expect(screen.getByText("Tower (TWR)")).toBeInTheDocument();
    expect(screen.getByText("$123,456")).toBeInTheDocument();
    expect(screen.getByText("Trading enabled")).toBeInTheDocument();
    expect(screen.getByText("Trading disabled")).toBeInTheDocument();
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("PortfolioManager")).toBeInTheDocument();
    expect(screen.getByText("DeFiIntegration")).toBeInTheDocument();
  });

  it("truncates addresses and copies the full address on click", async () => {
    const writeText = jest.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    blockchainAPI.explorer.mockResolvedValue(connected);
    render(<BlockchainExplorerPage />);
    await screen.findByText("TestToken");
    const buttons = screen.getAllByText("0x1234...5678");
    expect(buttons).toHaveLength(5);
    fireEvent.click(buttons[0]);
    expect(writeText).toHaveBeenCalledWith(ADDRESS);
  });

  it("does not fail when the clipboard API is missing", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    blockchainAPI.explorer.mockResolvedValue(connected);
    render(<BlockchainExplorerPage />);
    await screen.findByText("TestToken");
    expect(() =>
      fireEvent.click(screen.getAllByText("0x1234...5678")[0]),
    ).not.toThrow();
  });

  it("uses dashes for missing optional contract fields", async () => {
    blockchainAPI.explorer.mockResolvedValue({
      connected: true,
      network: "local",
      contracts: {
        testToken: { address: ADDRESS },
        tokenizedAsset: { address: ADDRESS },
      },
    });
    render(<BlockchainExplorerPage />);
    await screen.findByText("TestToken");
    expect(screen.getAllByText("- (-)")).toHaveLength(2);
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("Trading disabled")).toBeInTheDocument();
    expect(screen.queryByText(/Chain ID/)).not.toBeInTheDocument();
  });

  it("omits cards for contracts that are not deployed", async () => {
    blockchainAPI.explorer.mockResolvedValue({
      connected: true,
      network: "local",
      latest_block: 0,
      contracts: { testToken: { address: ADDRESS } },
    });
    render(<BlockchainExplorerPage />);
    await screen.findByText("TestToken");
    expect(screen.queryByText("TokenizedAsset")).not.toBeInTheDocument();
    expect(screen.queryByText("TradingPlatform")).not.toBeInTheDocument();
  });

  it("shows a dash for the block height when it is unknown", async () => {
    blockchainAPI.explorer.mockResolvedValue({
      connected: true,
      network: "local",
    });
    render(<BlockchainExplorerPage />);
    await screen.findByText("Latest block");
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("explains how to start a local network when disconnected", async () => {
    blockchainAPI.explorer.mockResolvedValue({ connected: false });
    render(<BlockchainExplorerPage />);
    expect(
      await screen.findByText("No local blockchain network reachable"),
    ).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
  });

  it("reports backend failures", async () => {
    blockchainAPI.explorer.mockRejectedValue(new Error("Unreachable"));
    render(<BlockchainExplorerPage />);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Unreachable"),
    );
    expect(
      await screen.findByText("No local blockchain network reachable"),
    ).toBeInTheDocument();
  });

  it("uses a generic backend failure message", async () => {
    blockchainAPI.explorer.mockRejectedValue({});
    render(<BlockchainExplorerPage />);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        "Failed to reach the backend",
      ),
    );
  });
});
