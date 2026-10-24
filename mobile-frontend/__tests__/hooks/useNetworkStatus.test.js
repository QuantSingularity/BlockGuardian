import { act, renderHook, waitFor } from "@testing-library/react-native";
import useNetworkStatus from "../../src/hooks/useNetworkStatus";

const mockUnsubscribe = jest.fn();
const mockAddEventListener = jest.fn(() => mockUnsubscribe);
const mockFetch = jest.fn();

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: (...args) => mockAddEventListener(...args),
  fetch: () => mockFetch(),
}));

const online = {
  isConnected: true,
  type: "wifi",
  isInternetReachable: true,
  details: { ssid: "home" },
};

describe("useNetworkStatus", () => {
  beforeEach(() => {
    mockAddEventListener.mockClear();
    mockFetch.mockReset();
    mockUnsubscribe.mockClear();
    mockFetch.mockResolvedValue(online);
  });

  test("initializes optimistically before the first fetch resolves", async () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionType).toBeNull();
    expect(result.current.isOffline).toBe(false);
    await waitFor(() => expect(result.current.connectionType).toBe("wifi"));
  });

  test("subscribes to NetInfo on mount", async () => {
    renderHook(() => useNetworkStatus());
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    await act(async () => {});
  });

  test("unsubscribes on unmount", async () => {
    const { unmount } = renderHook(() => useNetworkStatus());
    await act(async () => {});
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  test("fetches the initial network state once", async () => {
    renderHook(() => useNetworkStatus());
    await act(async () => {});
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("reports wifi details from the initial fetch", async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await waitFor(() => expect(result.current.isWifi).toBe(true));
    expect(result.current.isCellular).toBe(false);
    expect(result.current.isInternetReachable).toBe(true);
    expect(result.current.details).toEqual({ ssid: "home" });
  });

  test("reports offline when the initial fetch says disconnected", async () => {
    mockFetch.mockResolvedValue({
      isConnected: false,
      type: "none",
      isInternetReachable: false,
      details: null,
    });
    const { result } = renderHook(() => useNetworkStatus());
    await waitFor(() => expect(result.current.isOffline).toBe(true));
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isWifi).toBe(false);
    expect(result.current.isInternetReachable).toBe(false);
  });

  test("reports cellular connections", async () => {
    mockFetch.mockResolvedValue({
      isConnected: true,
      type: "cellular",
      isInternetReachable: true,
      details: null,
    });
    const { result } = renderHook(() => useNetworkStatus());
    await waitFor(() => expect(result.current.isCellular).toBe(true));
    expect(result.current.isWifi).toBe(false);
  });

  test("updates when NetInfo emits a new state", async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await act(async () => {});
    const listener = mockAddEventListener.mock.calls[0][0];
    act(() => {
      listener({
        isConnected: false,
        type: "none",
        isInternetReachable: false,
        details: null,
      });
    });
    expect(result.current.isOffline).toBe(true);
    act(() => {
      listener({
        isConnected: true,
        type: "cellular",
        isInternetReachable: true,
        details: { carrier: "x" },
      });
    });
    expect(result.current.isOffline).toBe(false);
    expect(result.current.isCellular).toBe(true);
    expect(result.current.details).toEqual({ carrier: "x" });
  });
});
