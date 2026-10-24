import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useAsyncStorage from "../../src/hooks/useAsyncStorage";

const mockStorage = {};

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn((key) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key, value) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

const renderLoaded = async (key, initial) => {
  const hook = renderHook(() => useAsyncStorage(key, initial));
  await waitFor(() => expect(hook.result.current[2].isLoading).toBe(false));
  return hook;
};

describe("useAsyncStorage", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  test("initializes with the given initial value", async () => {
    const { result } = await renderLoaded("test-key", "initial");
    expect(result.current[0]).toBe("initial");
    expect(result.current[2].error).toBeNull();
  });

  test("loading starts true and becomes false", async () => {
    const { result } = renderHook(() => useAsyncStorage("test-key", null));
    expect(result.current[2].isLoading).toBe(true);
    await waitFor(() => expect(result.current[2].isLoading).toBe(false));
  });

  test("setValue stores and updates the value", async () => {
    const { result } = await renderLoaded("test-key", "");
    await act(async () => {
      await result.current[1]("new-value");
    });
    expect(result.current[0]).toBe("new-value");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "test-key",
      JSON.stringify("new-value"),
    );
  });

  test("setValue accepts a function updater", async () => {
    const { result } = await renderLoaded("counter", 0);
    await act(async () => {
      await result.current[1]((prev) => prev + 1);
    });
    expect(result.current[0]).toBe(1);
  });

  test("removeValue resets to the initial value", async () => {
    const { result } = await renderLoaded("removable", "start");
    await act(async () => {
      await result.current[1]("changed");
    });
    await act(async () => {
      await result.current[2].removeValue();
    });
    expect(result.current[0]).toBe("start");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("removable");
  });

  test("loads a persisted value from storage", async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify("persisted"));
    const { result } = await renderLoaded("existing-key", "default");
    expect(result.current[0]).toBe("persisted");
  });

  test("stores objects as JSON", async () => {
    const { result } = await renderLoaded("obj", { a: 1 });
    await act(async () => {
      await result.current[1]({ a: 2 });
    });
    expect(result.current[0]).toEqual({ a: 2 });
    expect(JSON.parse(mockStorage.obj)).toEqual({ a: 2 });
  });

  test("reloads when the key changes", async () => {
    mockStorage.first = JSON.stringify("one");
    mockStorage.second = JSON.stringify("two");
    const { result, rerender } = renderHook(
      ({ storageKey }) => useAsyncStorage(storageKey, "x"),
      { initialProps: { storageKey: "first" } },
    );
    await waitFor(() => expect(result.current[0]).toBe("one"));
    rerender({ storageKey: "second" });
    await waitFor(() => expect(result.current[0]).toBe("two"));
  });

  test("exposes a load error and keeps the initial value", async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error("read failed"));
    const { result } = await renderLoaded("bad", "fallback");
    expect(result.current[0]).toBe("fallback");
    expect(result.current[2].error.message).toBe("read failed");
  });

  test("exposes a save error", async () => {
    const { result } = await renderLoaded("k", "v");
    AsyncStorage.setItem.mockRejectedValueOnce(new Error("write failed"));
    await act(async () => {
      await result.current[1]("next");
    });
    expect(result.current[2].error.message).toBe("write failed");
  });

  test("exposes a remove error", async () => {
    const { result } = await renderLoaded("k", "v");
    AsyncStorage.removeItem.mockRejectedValueOnce(new Error("remove failed"));
    await act(async () => {
      await result.current[2].removeValue();
    });
    expect(result.current[2].error.message).toBe("remove failed");
  });
});
