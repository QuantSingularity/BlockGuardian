const response = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  text: async () => (body === undefined ? "" : JSON.stringify(body)),
});

let api;
let constants;
let AsyncStorage;

const tokens = { access_token: "A1", refresh_token: "R1" };

const seedTokens = async () => {
  await AsyncStorage.multiSet([
    [constants.STORAGE_KEYS.ACCESS_TOKEN, "A0"],
    [constants.STORAGE_KEYS.REFRESH_TOKEN, "R0"],
  ]);
};

const lastCall = () => global.fetch.mock.calls.at(-1);

beforeEach(() => {
  jest.resetModules();
  AsyncStorage = require("@react-native-async-storage/async-storage");
  constants = require("../../src/lib/constants");
  api = require("../../src/lib/api");
  global.fetch = jest.fn();
});

describe("token hydration and session helpers", () => {
  it("loads stored tokens once", async () => {
    await seedTokens();
    const spy = jest.spyOn(AsyncStorage, "multiGet");
    await api.hydrateTokens();
    await api.hydrateTokens();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(api.hasAccessToken()).toBe(true);
  });

  it("starts without a token when storage is empty", async () => {
    await api.hydrateTokens();
    expect(api.hasAccessToken()).toBe(false);
  });

  it("survives a storage failure", async () => {
    jest.spyOn(AsyncStorage, "multiGet").mockRejectedValueOnce(new Error("x"));
    await api.hydrateTokens();
    expect(api.hasAccessToken()).toBe(false);
  });

  it("clearSession removes tokens and the cached user", async () => {
    await seedTokens();
    await AsyncStorage.setItem(constants.STORAGE_KEYS.USER, "{}");
    await api.hydrateTokens();
    await api.clearSession();
    expect(api.hasAccessToken()).toBe(false);
    expect(await AsyncStorage.getItem(constants.STORAGE_KEYS.USER)).toBeNull();
    expect(
      await AsyncStorage.getItem(constants.STORAGE_KEYS.ACCESS_TOKEN),
    ).toBeNull();
  });

  it("clearSession ignores storage failures", async () => {
    jest
      .spyOn(AsyncStorage, "multiRemove")
      .mockRejectedValueOnce(new Error("x"));
    await expect(api.clearSession()).resolves.toBeUndefined();
  });
});

describe("request building", () => {
  it("calls the API base url and path", async () => {
    global.fetch.mockResolvedValue(response(200, { user: { id: 1 } }));
    await api.authAPI.getProfile();
    const [url, options] = lastCall();
    expect(url).toBe("http://localhost:5000/api/auth/profile");
    expect(options.method).toBe("GET");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.body).toBeUndefined();
  });

  it("builds an encoded query string and drops empty values", async () => {
    global.fetch.mockResolvedValue(response(200, { assets: [] }));
    await api.assetAPI.list({ limit: 5, q: "a b&c", empty: "", none: null });
    expect(lastCall()[0]).toBe(
      "http://localhost:5000/api/portfolios/assets?limit=5&q=a%20b%26c",
    );
  });

  it("omits the query string when every param is empty", async () => {
    global.fetch.mockResolvedValue(response(200, { portfolios: [] }));
    await api.portfolioAPI.list({ page: "" });
    expect(lastCall()[0]).toBe("http://localhost:5000/api/portfolios/");
  });

  it("sends a bearer token when one is stored", async () => {
    await seedTokens();
    global.fetch.mockResolvedValue(response(200, { user: {} }));
    await api.authAPI.getProfile();
    expect(lastCall()[1].headers.Authorization).toBe("Bearer A0");
  });

  it("skips the bearer token for login", async () => {
    await seedTokens();
    global.fetch.mockResolvedValue(response(200, { tokens }));
    await api.authAPI.login("a@b.co", "pw");
    expect(lastCall()[1].headers.Authorization).toBeUndefined();
  });
});

describe("response handling", () => {
  it("raises a network error when fetch rejects", async () => {
    global.fetch.mockRejectedValue(new TypeError("offline"));
    await expect(api.blockchainAPI.status()).rejects.toMatchObject({
      status: 0,
      message: constants.ERROR_MESSAGES.NETWORK_ERROR,
    });
  });

  it("uses the backend error and field", async () => {
    global.fetch.mockResolvedValue(
      response(400, { error: "Bad input", field: "email" }),
    );
    await expect(api.authAPI.register({})).rejects.toMatchObject({
      message: "Bad input",
      status: 400,
      field: "email",
      data: { error: "Bad input", field: "email" },
    });
  });

  it("falls back to the message field and the generic server error", async () => {
    global.fetch
      .mockResolvedValueOnce(response(422, { message: "Unprocessable" }))
      .mockResolvedValueOnce(response(500, {}));
    await expect(api.blockchainAPI.status()).rejects.toThrow("Unprocessable");
    await expect(api.blockchainAPI.status()).rejects.toThrow(
      constants.ERROR_MESSAGES.SERVER_ERROR,
    );
  });

  it("tolerates an empty body and an invalid JSON body", async () => {
    global.fetch.mockResolvedValueOnce(response(200)).mockResolvedValueOnce({
      status: 200,
      ok: true,
      text: async () => "<html>",
    });
    await expect(api.blockchainAPI.status()).resolves.toBeNull();
    await expect(api.blockchainAPI.status()).resolves.toBeNull();
  });

  it("exposes the ApiError class", () => {
    const err = new api.ApiError("m", 418, { a: 1 }, "f");
    expect(err).toBeInstanceOf(Error);
    expect([err.status, err.data, err.field]).toEqual([418, { a: 1 }, "f"]);
  });
});

describe("automatic token refresh", () => {
  const urlOf = (call) => call[0];

  it("refreshes once and replays the request with the new token", async () => {
    await seedTokens();
    const onExpired = jest.fn();
    api.setSessionExpiredHandler(onExpired);
    global.fetch.mockImplementation(async (url, options) => {
      if (url.endsWith("/auth/refresh")) {
        expect(JSON.parse(options.body)).toEqual({ refresh_token: "R0" });
        return response(200, { tokens });
      }
      if (options.headers.Authorization === "Bearer A1") {
        return response(200, { user: { id: 7 } });
      }
      return response(401, { error: "expired" });
    });
    await expect(api.authAPI.getProfile()).resolves.toEqual({ id: 7 });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(onExpired).not.toHaveBeenCalled();
    expect(
      await AsyncStorage.getItem(constants.STORAGE_KEYS.ACCESS_TOKEN),
    ).toBe("A1");
    expect(
      await AsyncStorage.getItem(constants.STORAGE_KEYS.REFRESH_TOKEN),
    ).toBe("R1");
  });

  it("shares one refresh between concurrent failures", async () => {
    await seedTokens();
    global.fetch.mockImplementation(async (url, options) => {
      if (url.endsWith("/auth/refresh")) return response(200, { tokens });
      if (options.headers.Authorization === "Bearer A1") {
        return response(200, { holdings: [] });
      }
      return response(401, {});
    });
    await Promise.all([
      api.portfolioAPI.holdings(1),
      api.portfolioAPI.holdings(2),
    ]);
    const refreshCalls = global.fetch.mock.calls.filter((c) =>
      urlOf(c).endsWith("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("clears the session and notifies when the refresh fails", async () => {
    await seedTokens();
    const onExpired = jest.fn();
    api.setSessionExpiredHandler(onExpired);
    global.fetch.mockResolvedValue(response(401, { error: "nope" }));
    await expect(api.authAPI.getProfile()).rejects.toMatchObject({
      status: 401,
      message: "Your session has expired. Please sign in again.",
    });
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(api.hasAccessToken()).toBe(false);
  });

  it("works without a session expired handler", async () => {
    await seedTokens();
    global.fetch.mockResolvedValue(response(401, {}));
    await expect(api.authAPI.getProfile()).rejects.toMatchObject({
      status: 401,
    });
  });

  it("does not refresh when there is no refresh token", async () => {
    global.fetch.mockResolvedValue(response(401, { error: "Unauthorized" }));
    await expect(api.authAPI.getProfile()).rejects.toThrow("Unauthorized");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not refresh for unauthenticated calls such as login", async () => {
    await seedTokens();
    global.fetch.mockResolvedValue(response(401, { error: "Bad credentials" }));
    await expect(api.authAPI.login("a@b.co", "bad")).rejects.toThrow(
      "Bad credentials",
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not store tokens when the refresh response lacks them", async () => {
    await seedTokens();
    global.fetch.mockImplementation(async (url) =>
      url.endsWith("/auth/refresh") ? response(200, {}) : response(401, {}),
    );
    await expect(api.authAPI.getProfile()).rejects.toMatchObject({
      status: 401,
    });
  });

  it("tolerates storage failures while persisting refreshed tokens", async () => {
    await seedTokens();
    jest.spyOn(AsyncStorage, "multiSet").mockRejectedValue(new Error("x"));
    global.fetch.mockImplementation(async (url, options) => {
      if (url.endsWith("/auth/refresh")) return response(200, { tokens });
      return options.headers.Authorization === "Bearer A1"
        ? response(200, { user: { id: 1 } })
        : response(401, {});
    });
    await expect(api.authAPI.getProfile()).resolves.toEqual({ id: 1 });
  });
});

describe("authAPI", () => {
  it("register posts the payload and stores tokens", async () => {
    global.fetch.mockResolvedValue(response(201, { user: { id: 1 }, tokens }));
    const data = await api.authAPI.register({ email: "a@b.co" });
    expect(data.user).toEqual({ id: 1 });
    expect(JSON.parse(lastCall()[1].body)).toEqual({ email: "a@b.co" });
    expect(api.hasAccessToken()).toBe(true);
  });

  it("register without tokens leaves the session empty", async () => {
    global.fetch.mockResolvedValue(response(201, { user: { id: 1 } }));
    await api.authAPI.register({});
    expect(api.hasAccessToken()).toBe(false);
  });

  it("login sends the mfa token only when supplied", async () => {
    global.fetch.mockResolvedValue(response(200, { tokens }));
    await api.authAPI.login("a@b.co", "pw");
    expect(JSON.parse(lastCall()[1].body)).toEqual({
      email: "a@b.co",
      password: "pw",
    });
    await api.authAPI.login("a@b.co", "pw", "123456");
    expect(JSON.parse(lastCall()[1].body).mfa_token).toBe("123456");
  });

  it("login reports an mfa challenge without storing tokens", async () => {
    global.fetch.mockResolvedValue(response(200, { mfa_required: true }));
    const data = await api.authAPI.login("a@b.co", "pw");
    expect(data.mfa_required).toBe(true);
    expect(api.hasAccessToken()).toBe(false);
  });

  it("logout clears the session on success and on failure", async () => {
    await seedTokens();
    global.fetch.mockResolvedValue(response(200, {}));
    await api.authAPI.logout();
    expect(api.hasAccessToken()).toBe(false);
    await seedTokens();
    global.fetch.mockResolvedValue(response(500, {}));
    await expect(api.authAPI.logout()).rejects.toBeTruthy();
    expect(
      await AsyncStorage.getItem(constants.STORAGE_KEYS.ACCESS_TOKEN),
    ).toBeNull();
  });

  it("updateProfile and the password and mfa helpers use the right routes", async () => {
    global.fetch.mockResolvedValue(response(200, { user: { id: 2 } }));
    await expect(api.authAPI.updateProfile({ city: "X" })).resolves.toEqual({
      id: 2,
    });
    expect(lastCall()[1].method).toBe("PUT");

    await api.authAPI.changePassword("old", "new");
    expect(lastCall()[0]).toMatch(/\/auth\/change-password$/);
    expect(JSON.parse(lastCall()[1].body)).toEqual({
      current_password: "old",
      new_password: "new",
    });

    await api.authAPI.setupMfa();
    expect(lastCall()[0]).toMatch(/\/auth\/setup-mfa$/);
    await api.authAPI.enableMfa("123456");
    expect(JSON.parse(lastCall()[1].body)).toEqual({ token: "123456" });
    await api.authAPI.disableMfa("pw");
    expect(JSON.parse(lastCall()[1].body)).toEqual({ password: "pw" });
  });
});

describe("portfolioAPI", () => {
  it("unwraps single portfolios", async () => {
    global.fetch.mockResolvedValue(response(200, { portfolio: { id: 1 } }));
    await expect(api.portfolioAPI.get(1)).resolves.toEqual({ id: 1 });
    await expect(api.portfolioAPI.create({ name: "n" })).resolves.toEqual({
      id: 1,
    });
    expect(lastCall()[1].method).toBe("POST");
    await expect(api.portfolioAPI.update(1, { name: "m" })).resolves.toEqual({
      id: 1,
    });
    expect(lastCall()[1].method).toBe("PUT");
  });

  it("removes a portfolio", async () => {
    global.fetch.mockResolvedValue(response(200, { deleted: true }));
    await expect(api.portfolioAPI.remove(4)).resolves.toEqual({
      deleted: true,
    });
    expect(lastCall()[1].method).toBe("DELETE");
  });

  it("unwraps holdings, allocation and risk", async () => {
    global.fetch
      .mockResolvedValueOnce(response(200, { holdings: [1] }))
      .mockResolvedValueOnce(response(200, { allocation: { a: 1 } }))
      .mockResolvedValueOnce(response(200, { risk_metrics: { r: 1 } }));
    await expect(api.portfolioAPI.holdings(1)).resolves.toEqual([1]);
    await expect(api.portfolioAPI.allocation(1)).resolves.toEqual({ a: 1 });
    await expect(api.portfolioAPI.risk(1)).resolves.toEqual({ r: 1 });
  });

  it("handles transactions and cancellation", async () => {
    global.fetch.mockResolvedValue(response(200, { transactions: [] }));
    await api.portfolioAPI.transactions(1, { per_page: 50 });
    expect(lastCall()[0]).toMatch(
      /\/portfolios\/1\/transactions\?per_page=50$/,
    );
    await api.portfolioAPI.cancelTransaction(1, 9);
    expect(lastCall()[0]).toMatch(/\/transactions\/9\/cancel$/);
    expect(lastCall()[1].method).toBe("POST");
  });

  it("maps buy and sell fields to snake case", async () => {
    global.fetch.mockResolvedValue(response(200, { ok: true }));
    const trade = { assetSymbol: "AAPL", quantity: 2, price: 10 };
    await api.portfolioAPI.buy(1, trade);
    expect(lastCall()[0]).toMatch(/\/portfolios\/1\/buy$/);
    expect(JSON.parse(lastCall()[1].body)).toEqual({
      asset_symbol: "AAPL",
      quantity: 2,
      price: 10,
    });
    await api.portfolioAPI.sell(1, trade);
    expect(lastCall()[0]).toMatch(/\/portfolios\/1\/sell$/);
  });

  it("includes days in performance only when given", async () => {
    global.fetch.mockResolvedValue(response(200, { performance: { p: 1 } }));
    await expect(api.portfolioAPI.performance(1, 30)).resolves.toEqual({
      p: 1,
    });
    expect(lastCall()[0]).toMatch(/performance\?days=30$/);
    await api.portfolioAPI.performance(1);
    expect(lastCall()[0]).toMatch(/performance$/);
  });
});

describe("assetAPI and blockchainAPI", () => {
  it("unwraps assets for list and search", async () => {
    global.fetch.mockResolvedValue(response(200, { assets: [{ id: 1 }] }));
    await expect(api.assetAPI.list()).resolves.toEqual([{ id: 1 }]);
    await expect(
      api.assetAPI.search("btc", { type: "cryptocurrency" }),
    ).resolves.toEqual([{ id: 1 }]);
    expect(lastCall()[0]).toMatch(/assets\/search\?q=btc&type=cryptocurrency$/);
  });

  it("returns blockchain payloads", async () => {
    global.fetch.mockResolvedValue(response(200, { ok: 1 }));
    await expect(api.blockchainAPI.status()).resolves.toEqual({ ok: 1 });
    await expect(api.blockchainAPI.contracts()).resolves.toEqual({ ok: 1 });
    await expect(api.blockchainAPI.explorer()).resolves.toEqual({ ok: 1 });
  });
});
