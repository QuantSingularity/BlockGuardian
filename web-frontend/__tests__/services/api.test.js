jest.mock("axios", () => {
  const client = jest.fn();
  client.get = jest.fn();
  client.post = jest.fn();
  client.put = jest.fn();
  client.delete = jest.fn();
  client.interceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  };
  return {
    __esModule: true,
    default: { create: jest.fn(() => client), post: jest.fn() },
  };
});

import axios from "axios";
import apiClient, {
  authAPI,
  portfolioAPI,
  assetAPI,
  blockchainAPI,
  healthAPI,
} from "../../services/api";
import {
  API_ENDPOINTS,
  ERROR_MESSAGES,
  STORAGE_KEYS,
} from "../../utils/constants";

const createCall = axios.create.mock.calls[0];
const requestInterceptor = apiClient.interceptors.request.use.mock.calls[0][0];
const responseSuccess = apiClient.interceptors.response.use.mock.calls[0][0];
const responseError = apiClient.interceptors.response.use.mock.calls[0][1];

const originalLocation = window.location;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  window.location = originalLocation;
});

const mockLocation = () => {
  delete window.location;
  window.location = { href: "" };
};

describe("client configuration", () => {
  it("creates an axios client with JSON headers and a timeout", () => {
    expect(createCall[0].timeout).toBe(30000);
    expect(createCall[0].headers["Content-Type"]).toBe("application/json");
  });
});

describe("request interceptor", () => {
  it("attaches the bearer token when one is stored", () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, "abc123");
    const config = requestInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBe("Bearer abc123");
  });

  it("leaves the headers alone when no token is stored", () => {
    const config = requestInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });

  it("tolerates unavailable storage", () => {
    const spy = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("denied");
      });
    const config = requestInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
    spy.mockRestore();
  });
});

describe("response interceptor success path", () => {
  it("returns the response untouched", () => {
    const response = { data: { ok: true } };
    expect(responseSuccess(response)).toBe(response);
  });
});

describe("response interceptor error normalisation", () => {
  it("uses the backend error field when present", async () => {
    const error = {
      config: { url: "/api/portfolios/" },
      response: { status: 400, data: { error: "Bad input", field: "email" } },
    };
    await expect(responseError(error)).rejects.toMatchObject({
      message: "Bad input",
      status: 400,
      field: "email",
      data: { error: "Bad input", field: "email" },
    });
  });

  it("falls back to the backend message field", async () => {
    const error = {
      config: { url: "/api/x" },
      response: { status: 422, data: { message: "Unprocessable" } },
    };
    await expect(responseError(error)).rejects.toThrow("Unprocessable");
  });

  it("reports a network error when there was no response", async () => {
    const error = { config: { url: "/api/x" }, request: {} };
    await expect(responseError(error)).rejects.toThrow(
      ERROR_MESSAGES.NETWORK_ERROR,
    );
  });

  it("reports a generic server error otherwise", async () => {
    const error = {
      config: { url: "/api/x" },
      response: { status: 500, data: {} },
    };
    await expect(responseError(error)).rejects.toThrow(
      ERROR_MESSAGES.SERVER_ERROR,
    );
  });
});

describe("response interceptor token refresh", () => {
  const unauthorized = (config) => ({
    config,
    response: { status: 401, data: {} },
  });

  it("refreshes the token and replays the original request", async () => {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, "refresh-1");
    axios.post.mockResolvedValue({
      data: { tokens: { access_token: "new-a", refresh_token: "new-r" } },
    });
    apiClient.mockResolvedValue({ data: { replayed: true } });

    const original = { url: "/api/portfolios/", headers: {} };
    const result = await responseError(unauthorized(original));

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(API_ENDPOINTS.AUTH.REFRESH),
      { refresh_token: "refresh-1" },
    );
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe("new-a");
    expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBe("new-r");
    expect(original.headers.Authorization).toBe("Bearer new-a");
    expect(original._retry).toBe(true);
    expect(apiClient).toHaveBeenCalledWith(original);
    expect(result).toEqual({ data: { replayed: true } });
  });

  it("shares a single refresh call between concurrent failures", async () => {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, "refresh-1");
    let resolveRefresh;
    axios.post.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    apiClient.mockResolvedValue({ data: {} });

    const first = responseError(unauthorized({ url: "/a", headers: {} }));
    const second = responseError(unauthorized({ url: "/b", headers: {} }));
    resolveRefresh({
      data: { tokens: { access_token: "a", refresh_token: "r" } },
    });
    await Promise.all([first, second]);

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(apiClient).toHaveBeenCalledTimes(2);
  });

  it("clears the session and redirects when the refresh fails", async () => {
    mockLocation();
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, "old");
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, "refresh-1");
    localStorage.setItem(STORAGE_KEYS.USER, "{}");
    axios.post.mockRejectedValue(new Error("expired"));

    await expect(
      responseError(unauthorized({ url: "/api/x", headers: {} })),
    ).rejects.toThrow("expired");

    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
    expect(window.location.href).toBe("/login");
  });

  it("clears the session without refreshing when no refresh token exists", async () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, "old");
    await expect(
      responseError(unauthorized({ url: "/api/x", headers: {} })),
    ).rejects.toMatchObject({ status: 401 });
    expect(axios.post).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
  });

  it.each([
    API_ENDPOINTS.AUTH.LOGIN,
    API_ENDPOINTS.AUTH.REGISTER,
    API_ENDPOINTS.AUTH.REFRESH,
  ])("does not attempt a refresh for %s", async (url) => {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, "refresh-1");
    await expect(
      responseError(unauthorized({ url, headers: {} })),
    ).rejects.toMatchObject({ status: 401 });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("does not retry a request that was already retried", async () => {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, "refresh-1");
    await expect(
      responseError(unauthorized({ url: "/api/x", headers: {}, _retry: true })),
    ).rejects.toMatchObject({ status: 401 });
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe("authAPI", () => {
  const tokens = { access_token: "A", refresh_token: "R" };

  it("register posts the payload and stores returned tokens", async () => {
    apiClient.post.mockResolvedValue({ data: { user: { id: 1 }, tokens } });
    const data = await authAPI.register({ email: "a@b.co" });
    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.REGISTER, {
      email: "a@b.co",
    });
    expect(data.user).toEqual({ id: 1 });
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe("A");
    expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBe("R");
  });

  it("register does not touch storage when no tokens are returned", async () => {
    apiClient.post.mockResolvedValue({ data: { user: { id: 1 } } });
    await authAPI.register({});
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
  });

  it("login omits the mfa token when it is not supplied", async () => {
    apiClient.post.mockResolvedValue({ data: { tokens } });
    await authAPI.login("a@b.co", "pw");
    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.LOGIN, {
      email: "a@b.co",
      password: "pw",
    });
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe("A");
  });

  it("login includes the mfa token when supplied", async () => {
    apiClient.post.mockResolvedValue({ data: { tokens } });
    await authAPI.login("a@b.co", "pw", "123456");
    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.LOGIN, {
      email: "a@b.co",
      password: "pw",
      mfa_token: "123456",
    });
  });

  it("login returns the mfa challenge without storing tokens", async () => {
    apiClient.post.mockResolvedValue({ data: { mfa_required: true } });
    const data = await authAPI.login("a@b.co", "pw");
    expect(data.mfa_required).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
  });

  it("logout clears the session after a successful call", async () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, "A");
    apiClient.post.mockResolvedValue({ data: {} });
    await authAPI.logout();
    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.LOGOUT);
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
  });

  it("logout still clears the session when the call fails", async () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, "A");
    apiClient.post.mockRejectedValue(new Error("down"));
    await expect(authAPI.logout()).rejects.toThrow("down");
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
  });

  it("getProfile and updateProfile unwrap the user", async () => {
    apiClient.get.mockResolvedValue({ data: { user: { id: 7 } } });
    apiClient.put.mockResolvedValue({ data: { user: { id: 8 } } });
    await expect(authAPI.getProfile()).resolves.toEqual({ id: 7 });
    await expect(authAPI.updateProfile({ city: "X" })).resolves.toEqual({
      id: 8,
    });
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.PROFILE);
    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.PROFILE, {
      city: "X",
    });
  });

  it("changePassword maps field names to the backend contract", async () => {
    apiClient.post.mockResolvedValue({ data: { message: "ok" } });
    await authAPI.changePassword("old", "new");
    expect(apiClient.post).toHaveBeenCalledWith(
      API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
      { current_password: "old", new_password: "new" },
    );
  });

  it("mfa helpers call the right endpoints", async () => {
    apiClient.post.mockResolvedValue({ data: { secret: "S" } });
    await expect(authAPI.setupMfa()).resolves.toEqual({ secret: "S" });
    await authAPI.enableMfa("123456");
    await authAPI.disableMfa("pw");
    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      API_ENDPOINTS.AUTH.SETUP_MFA,
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      API_ENDPOINTS.AUTH.ENABLE_MFA,
      { token: "123456" },
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      3,
      API_ENDPOINTS.AUTH.DISABLE_MFA,
      { password: "pw" },
    );
  });
});

describe("portfolioAPI", () => {
  it("list forwards query params and returns the whole payload", async () => {
    apiClient.get.mockResolvedValue({ data: { portfolios: [1] } });
    await expect(portfolioAPI.list({ per_page: 5 })).resolves.toEqual({
      portfolios: [1],
    });
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PORTFOLIO.LIST, {
      params: { per_page: 5 },
    });
  });

  it("list defaults to empty params", async () => {
    apiClient.get.mockResolvedValue({ data: {} });
    await portfolioAPI.list();
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.PORTFOLIO.LIST, {
      params: {},
    });
  });

  it("get, create and update unwrap the portfolio", async () => {
    apiClient.get.mockResolvedValue({ data: { portfolio: { id: 1 } } });
    apiClient.post.mockResolvedValue({ data: { portfolio: { id: 2 } } });
    apiClient.put.mockResolvedValue({ data: { portfolio: { id: 3 } } });
    await expect(portfolioAPI.get(1)).resolves.toEqual({ id: 1 });
    await expect(portfolioAPI.create({ name: "n" })).resolves.toEqual({
      id: 2,
    });
    await expect(portfolioAPI.update(3, { name: "m" })).resolves.toEqual({
      id: 3,
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      API_ENDPOINTS.PORTFOLIO.DETAIL(1),
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      API_ENDPOINTS.PORTFOLIO.CREATE,
      { name: "n" },
    );
    expect(apiClient.put).toHaveBeenCalledWith(
      API_ENDPOINTS.PORTFOLIO.UPDATE(3),
      { name: "m" },
    );
  });

  it("remove returns the response body", async () => {
    apiClient.delete.mockResolvedValue({ data: { deleted: true } });
    await expect(portfolioAPI.remove(4)).resolves.toEqual({ deleted: true });
    expect(apiClient.delete).toHaveBeenCalledWith(
      API_ENDPOINTS.PORTFOLIO.DELETE(4),
    );
  });

  it("holdings unwrap the holdings array", async () => {
    apiClient.get.mockResolvedValue({ data: { holdings: [{ id: 1 }] } });
    await expect(portfolioAPI.holdings(1)).resolves.toEqual([{ id: 1 }]);
  });

  it("transactions pass params and cancelTransaction posts to the cancel route", async () => {
    apiClient.get.mockResolvedValue({ data: { transactions: [] } });
    apiClient.post.mockResolvedValue({ data: { ok: true } });
    await portfolioAPI.transactions(1, { per_page: 50 });
    await portfolioAPI.transactions(1);
    await expect(portfolioAPI.cancelTransaction(1, 9)).resolves.toEqual({
      ok: true,
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(
      1,
      API_ENDPOINTS.PORTFOLIO.TRANSACTIONS(1),
      { params: { per_page: 50 } },
    );
    expect(apiClient.get).toHaveBeenNthCalledWith(
      2,
      API_ENDPOINTS.PORTFOLIO.TRANSACTIONS(1),
      { params: {} },
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      API_ENDPOINTS.PORTFOLIO.CANCEL_TRANSACTION(1, 9),
    );
  });

  it("buy and sell map the trade fields to snake case", async () => {
    apiClient.post.mockResolvedValue({ data: { ok: true } });
    const trade = { assetSymbol: "AAPL", quantity: 2, price: 10 };
    await portfolioAPI.buy(1, trade);
    await portfolioAPI.sell(1, trade);
    const body = { asset_symbol: "AAPL", quantity: 2, price: 10 };
    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      API_ENDPOINTS.PORTFOLIO.BUY(1),
      body,
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      API_ENDPOINTS.PORTFOLIO.SELL(1),
      body,
    );
  });

  it("performance includes days only when provided", async () => {
    apiClient.get.mockResolvedValue({ data: { performance: { r: 1 } } });
    await expect(portfolioAPI.performance(1, 30)).resolves.toEqual({ r: 1 });
    await portfolioAPI.performance(1);
    expect(apiClient.get).toHaveBeenNthCalledWith(
      1,
      API_ENDPOINTS.PORTFOLIO.PERFORMANCE(1),
      { params: { days: 30 } },
    );
    expect(apiClient.get).toHaveBeenNthCalledWith(
      2,
      API_ENDPOINTS.PORTFOLIO.PERFORMANCE(1),
      { params: {} },
    );
  });

  it("allocation and risk unwrap their payloads", async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { allocation: { a: 1 } } })
      .mockResolvedValueOnce({ data: { risk_metrics: { risk_score: 4 } } });
    await expect(portfolioAPI.allocation(1)).resolves.toEqual({ a: 1 });
    await expect(portfolioAPI.risk(1)).resolves.toEqual({ risk_score: 4 });
  });
});

describe("assetAPI", () => {
  it("list unwraps assets and forwards params", async () => {
    apiClient.get.mockResolvedValue({ data: { assets: [{ id: 1 }] } });
    await expect(assetAPI.list({ limit: 5 })).resolves.toEqual([{ id: 1 }]);
    await assetAPI.list();
    expect(apiClient.get).toHaveBeenNthCalledWith(
      1,
      API_ENDPOINTS.ASSETS.LIST,
      { params: { limit: 5 } },
    );
    expect(apiClient.get).toHaveBeenNthCalledWith(
      2,
      API_ENDPOINTS.ASSETS.LIST,
      { params: {} },
    );
  });

  it("search sends the query as q and merges extra params", async () => {
    apiClient.get.mockResolvedValue({ data: { assets: [] } });
    await assetAPI.search("btc", { type: "cryptocurrency" });
    await assetAPI.search("eth");
    expect(apiClient.get).toHaveBeenNthCalledWith(
      1,
      API_ENDPOINTS.ASSETS.SEARCH,
      { params: { q: "btc", type: "cryptocurrency" } },
    );
    expect(apiClient.get).toHaveBeenNthCalledWith(
      2,
      API_ENDPOINTS.ASSETS.SEARCH,
      { params: { q: "eth" } },
    );
  });
});

describe("blockchainAPI and healthAPI", () => {
  it("return the response body of each endpoint", async () => {
    apiClient.get.mockResolvedValue({ data: { ok: 1 } });
    await expect(blockchainAPI.status()).resolves.toEqual({ ok: 1 });
    await expect(blockchainAPI.contracts()).resolves.toEqual({ ok: 1 });
    await expect(blockchainAPI.explorer()).resolves.toEqual({ ok: 1 });
    await expect(healthAPI.check()).resolves.toEqual({ ok: 1 });
    expect(apiClient.get).toHaveBeenNthCalledWith(
      1,
      API_ENDPOINTS.BLOCKCHAIN.STATUS,
    );
    expect(apiClient.get).toHaveBeenNthCalledWith(
      2,
      API_ENDPOINTS.BLOCKCHAIN.CONTRACTS,
    );
    expect(apiClient.get).toHaveBeenNthCalledWith(
      3,
      API_ENDPOINTS.BLOCKCHAIN.EXPLORER,
    );
    expect(apiClient.get).toHaveBeenNthCalledWith(4, API_ENDPOINTS.HEALTH);
  });
});
