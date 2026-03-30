// Screen Test: /BlockGuardian_Tests/BlockGuardian_tests/mobile-frontend/__tests__/screens/DashboardScreen.test.js

import { fireEvent, render, screen } from "@testing-library/react-native";
import DashboardScreen from "../../../../BlockGuardian_Project/mobile-frontend/src/screens/DashboardScreen";

// Mock dependencies
jest.mock("@expo/vector-icons", () => {
  // Mock Ionicons specifically, or provide a generic mock
  return {
    Ionicons: ({ name, size, color, style }) => (
      <mock-Ionicons
        testID={`icon-${name}`}
        name={name}
        size={size}
        color={color}
        style={style}
      />
    ),
  };
});

// Mock the WalletConnect modal hook
const mockOpen = jest.fn();
const mockDisconnect = jest.fn();
const mockUseWalletConnectModal = jest.fn(() => ({
  open: mockOpen,
  isConnected: false,
  address: null,
  provider: { disconnect: mockDisconnect },
}));

jest.mock("@walletconnect/modal-react-native", () => ({
  useWalletConnectModal: () => mockUseWalletConnectModal(),
}));

// Mock nativewind styled components - basic pass-through
jest.mock("nativewind", () => ({
  styled: (Component) => (props) => <Component {...props} />,
}));

// Mock navigation prop
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
};

describe("DashboardScreen", () => {
  beforeEach(() => {
    // Reset mocks and hook state before each test
    mockOpen.mockClear();
    mockDisconnect.mockClear();
    mockNavigate.mockClear();
    mockUseWalletConnectModal.mockReturnValue({
      open: mockOpen,
      isConnected: false,
      address: null,
      provider: { disconnect: mockDisconnect },
    });
  });

  test("renders dashboard title", () => {
    render(<DashboardScreen navigation={mockNavigation} />);
    expect(screen.getByText("Dashboard")).toBeTruthy();
  });

  test("renders Connect Wallet button when disconnected", () => {
    render(<DashboardScreen navigation={mockNavigation} />);
    expect(screen.getByText("Connect Wallet")).toBeTruthy();
    expect(screen.queryByText(/Connected:/)).toBeNull();
  });

  test("calls WalletConnect open function when Connect Wallet is pressed", () => {
    render(<DashboardScreen navigation={mockNavigation} />);
    const connectButton = screen.getByText("Connect Wallet");
    fireEvent.press(connectButton);
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  test("renders Disconnect button and address when connected", () => {
    const testAddress = "0x1234...abcd";
    mockUseWalletConnectModal.mockReturnValue({
      open: mockOpen,
      isConnected: true,
      address: "0x1234567890abcdef1234567890abcdef1234abcd",
      provider: { disconnect: mockDisconnect },
    });
    render(<DashboardScreen navigation={mockNavigation} />);
    expect(screen.getByText("Disconnect")).toBeTruthy();
    expect(screen.getByText(`Connected: ${testAddress}`)).toBeTruthy();
  });

  test("calls WalletConnect disconnect function when Disconnect is pressed", () => {
    mockUseWalletConnectModal.mockReturnValue({
      open: mockOpen,
      isConnected: true,
      address: "0x1234567890abcdef1234567890abcdef1234abcd",
      provider: { disconnect: mockDisconnect },
    });
    render(<DashboardScreen navigation={mockNavigation} />);
    const disconnectButton = screen.getByText("Disconnect");
    fireEvent.press(disconnectButton);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  test("renders all navigation items with icons", () => {
    render(<DashboardScreen navigation={mockNavigation} />);
    const items = [
      { name: "Portfolio", icon: "briefcase-outline" },
      { name: "Market Analysis", icon: "analytics-outline" },
      { name: "Blockchain Explorer", icon: "search-circle-outline" },
      { name: "AI Recommendations", icon: "bulb-outline" },
      { name: "Security Check", icon: "shield-checkmark-outline" },
      { name: "Admin Panel", icon: "settings-outline" },
    ];

    items.forEach((item) => {
      expect(screen.getByText(item.name)).toBeTruthy();
      expect(screen.getByTestId(`icon-${item.icon}`)).toBeTruthy();
    });
  });

  test("navigates to correct screen when an item is pressed", () => {
    render(<DashboardScreen navigation={mockNavigation} />);
    const portfolioItem = screen.getByText("Portfolio");
    fireEvent.press(portfolioItem);
    expect(mockNavigate).toHaveBeenCalledWith("Portfolio");

    const aiItem = screen.getByText("AI Recommendations");
    fireEvent.press(aiItem);
    expect(mockNavigate).toHaveBeenCalledWith("AIRecommendations");
  });

  test("renders Account Summary placeholder", () => {
    render(<DashboardScreen navigation={mockNavigation} />);
    expect(screen.getByText("Account Summary")).toBeTruthy();
    expect(
      screen.getByText(/Summary details will appear here.../),
    ).toBeTruthy();
  });
});
