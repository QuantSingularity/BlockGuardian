import {
  act,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth } from "../../src/context/AuthContext";
import * as api from "../../src/lib/api";
import { STORAGE_KEYS } from "../../src/lib/constants";

jest.mock("../../src/lib/api", () => ({
  authAPI: {
    getProfile: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
  hasAccessToken: jest.fn(),
  hydrateTokens: jest.fn(),
  setSessionExpiredHandler: jest.fn(),
}));

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
const profile = { id: 1, first_name: "Jane" };

const renderReady = async () => {
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  api.hydrateTokens.mockResolvedValue();
  api.hasAccessToken.mockReturnValue(false);
});

describe("AuthProvider hydration", () => {
  it("finishes loading unauthenticated without a token", async () => {
    const { result } = await renderReady();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(api.authAPI.getProfile).not.toHaveBeenCalled();
  });

  it("loads and caches the profile when a token exists", async () => {
    api.hasAccessToken.mockReturnValue(true);
    api.authAPI.getProfile.mockResolvedValue(profile);
    const { result } = await renderReady();
    expect(result.current.user).toEqual(profile);
    expect(result.current.isAuthenticated).toBe(true);
    expect(JSON.parse(await AsyncStorage.getItem(STORAGE_KEYS.USER))).toEqual(
      profile,
    );
  });

  it("drops the user when the profile request fails", async () => {
    api.hasAccessToken.mockReturnValue(true);
    api.authAPI.getProfile.mockRejectedValue(new Error("expired"));
    const { result } = await renderReady();
    expect(result.current.user).toBeNull();
  });

  it("registers a session expired handler that clears the user", async () => {
    api.hasAccessToken.mockReturnValue(true);
    api.authAPI.getProfile.mockResolvedValue(profile);
    const { result } = await renderReady();
    const handler = api.setSessionExpiredHandler.mock.calls[0][0];
    await act(async () => {
      await handler();
    });
    expect(result.current.user).toBeNull();
  });
});

describe("AuthProvider actions", () => {
  it("login reports an MFA challenge without a user", async () => {
    api.authAPI.login.mockResolvedValue({ mfa_required: true });
    const { result } = await renderReady();
    let outcome;
    await act(async () => {
      outcome = await result.current.login("a@b.co", "pw");
    });
    expect(outcome).toEqual({ mfaRequired: true });
    expect(result.current.user).toBeNull();
    expect(api.authAPI.getProfile).not.toHaveBeenCalled();
  });

  it("login fetches and stores the profile", async () => {
    api.authAPI.login.mockResolvedValue({ tokens: {} });
    api.authAPI.getProfile.mockResolvedValue(profile);
    const { result } = await renderReady();
    let outcome;
    await act(async () => {
      outcome = await result.current.login("a@b.co", "pw", "123456");
    });
    expect(api.authAPI.login).toHaveBeenCalledWith("a@b.co", "pw", "123456");
    expect(outcome).toEqual({ mfaRequired: false, user: profile });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("register stores the returned user", async () => {
    api.authAPI.register.mockResolvedValue({ user: profile });
    const { result } = await renderReady();
    let user;
    await act(async () => {
      user = await result.current.register({ email: "a@b.co" });
    });
    expect(user).toEqual(profile);
    expect(result.current.user).toEqual(profile);
  });

  it("logout clears the user and the cached copy", async () => {
    api.authAPI.register.mockResolvedValue({ user: profile });
    api.authAPI.logout.mockResolvedValue();
    const { result } = await renderReady();
    await act(async () => {
      await result.current.register({});
    });
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.user).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
  });

  it("logout clears local state even when the server call fails", async () => {
    api.authAPI.register.mockResolvedValue({ user: profile });
    api.authAPI.logout.mockRejectedValue(new Error("down"));
    const { result } = await renderReady();
    await act(async () => {
      await result.current.register({});
    });
    await act(async () => {
      await expect(result.current.logout()).rejects.toThrow("down");
    });
    expect(result.current.user).toBeNull();
  });

  it("refreshProfile reloads the user", async () => {
    api.authAPI.getProfile.mockResolvedValue({ ...profile, first_name: "J2" });
    const { result } = await renderReady();
    let refreshed;
    await act(async () => {
      refreshed = await result.current.refreshProfile();
    });
    expect(refreshed.first_name).toBe("J2");
    expect(result.current.user.first_name).toBe("J2");
  });

  it("setUser updates state and null clears it", async () => {
    const { result } = await renderReady();
    await act(async () => {
      await result.current.setUser(profile);
    });
    expect(result.current.user).toEqual(profile);
    await act(async () => {
      await result.current.setUser(null);
    });
    expect(result.current.user).toBeNull();
  });

  it("keeps the in memory user when storage fails", async () => {
    const { result } = await renderReady();
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("x"));
    await act(async () => {
      await result.current.setUser(profile);
    });
    expect(result.current.user).toEqual(profile);
  });
});

describe("useAuth", () => {
  it("throws outside the provider", () => {
    const Probe = () => {
      useAuth();
      return null;
    };
    expect(() => render(<Probe />)).toThrow(
      "useAuth must be used within AuthProvider",
    );
  });

  it("renders children inside the provider", async () => {
    const view = render(
      <AuthProvider>
        <Text>inside</Text>
      </AuthProvider>,
    );
    expect(view.getByText("inside")).toBeTruthy();
    await act(async () => {});
  });
});
