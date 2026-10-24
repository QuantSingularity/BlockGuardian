import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { useRouter } from "next/router";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";
import { ROUTES, STORAGE_KEYS } from "../../utils/constants";

jest.mock("next/router", () => ({ useRouter: jest.fn() }));
jest.mock("../../services/api", () => ({
  authAPI: {
    getProfile: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
}));

const push = jest.fn();
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
const profile = { id: 1, first_name: "Jane", email: "jane@example.com" };

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  useRouter.mockReturnValue({ push });
});

describe("AuthProvider hydration", () => {
  it("finishes loading unauthenticated when no token is stored", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(authAPI.getProfile).not.toHaveBeenCalled();
  });

  it("loads and persists the profile when a token exists", async () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, "tok");
    authAPI.getProfile.mockResolvedValue(profile);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toEqual(profile);
    expect(result.current.isAuthenticated).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.USER))).toEqual(
      profile,
    );
  });

  it("drops stored tokens when the profile request fails", async () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, "tok");
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, "ref");
    authAPI.getProfile.mockRejectedValue(new Error("expired"));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
  });
});

describe("AuthProvider actions", () => {
  const ready = async () => {
    const hook = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    return hook;
  };

  it("login reports an MFA challenge without setting a user", async () => {
    authAPI.login.mockResolvedValue({ mfa_required: true });
    const { result } = await ready();
    let outcome;
    await act(async () => {
      outcome = await result.current.login("a@b.co", "pw");
    });
    expect(outcome).toEqual({ mfaRequired: true });
    expect(result.current.user).toBeNull();
    expect(authAPI.getProfile).not.toHaveBeenCalled();
  });

  it("login fetches the full profile after a successful sign in", async () => {
    authAPI.login.mockResolvedValue({ tokens: {} });
    authAPI.getProfile.mockResolvedValue(profile);
    const { result } = await ready();
    let outcome;
    await act(async () => {
      outcome = await result.current.login("a@b.co", "pw", "123456");
    });
    expect(authAPI.login).toHaveBeenCalledWith("a@b.co", "pw", "123456");
    expect(outcome).toEqual({ mfaRequired: false, user: profile });
    expect(result.current.user).toEqual(profile);
  });

  it("register stores the returned user", async () => {
    authAPI.register.mockResolvedValue({ user: profile });
    const { result } = await ready();
    let user;
    await act(async () => {
      user = await result.current.register({ email: "a@b.co" });
    });
    expect(user).toEqual(profile);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("logout clears the user and returns home", async () => {
    authAPI.login.mockResolvedValue({});
    authAPI.getProfile.mockResolvedValue(profile);
    authAPI.logout.mockResolvedValue();
    const { result } = await ready();
    await act(async () => {
      await result.current.login("a@b.co", "pw");
    });
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
    expect(push).toHaveBeenCalledWith(ROUTES.HOME);
  });

  it("logout still clears local state when the server call fails", async () => {
    authAPI.register.mockResolvedValue({ user: profile });
    authAPI.logout.mockRejectedValue(new Error("down"));
    const { result } = await ready();
    await act(async () => {
      await result.current.register({});
    });
    await act(async () => {
      await expect(result.current.logout()).rejects.toThrow("down");
    });
    expect(result.current.user).toBeNull();
    expect(push).toHaveBeenCalledWith(ROUTES.HOME);
  });

  it("refreshProfile reloads and stores the profile", async () => {
    authAPI.getProfile.mockResolvedValue({ ...profile, first_name: "Janet" });
    const { result } = await ready();
    await act(async () => {
      await result.current.refreshProfile();
    });
    expect(result.current.user.first_name).toBe("Janet");
  });

  it("setUser updates state and storage, and null removes the entry", async () => {
    const { result } = await ready();
    act(() => result.current.setUser(profile));
    expect(result.current.user).toEqual(profile);
    expect(localStorage.getItem(STORAGE_KEYS.USER)).not.toBeNull();
    act(() => result.current.setUser(null));
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
  });

  it("keeps working when storage writes throw", async () => {
    const { result } = await ready();
    const spy = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    act(() => result.current.setUser(profile));
    expect(result.current.user).toEqual(profile);
    spy.mockRestore();
  });
});

describe("useAuth", () => {
  it("throws when used outside the provider", () => {
    const Probe = () => {
      useAuth();
      return null;
    };
    expect(() => render(<Probe />)).toThrow(
      "useAuth must be used within AuthProvider",
    );
  });

  it("exposes the context to rendered children", async () => {
    const Probe = () => {
      const { isLoading } = useAuth();
      return <p>{isLoading ? "loading" : "done"}</p>;
    };
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(await screen.findByText("done")).toBeInTheDocument();
  });
});
