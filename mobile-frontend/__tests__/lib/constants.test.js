import {
  API_BASE_PATH,
  API_BASE_URL,
  API_ENDPOINTS,
  ASSET_TYPES,
  COUNTRIES,
  CURRENCIES,
  ERROR_MESSAGES,
  PORTFOLIO_TYPES,
  RISK_LEVELS,
  STORAGE_KEYS,
} from "../../src/lib/constants";

describe("constants", () => {
  it("defaults the API location", () => {
    expect(API_BASE_URL).toBe("http://localhost:5000");
    expect(API_BASE_PATH).toBe("/api");
  });

  it("builds parameterised portfolio endpoints", () => {
    const p = API_ENDPOINTS.PORTFOLIO;
    expect(p.DETAIL(3)).toBe("/portfolios/3");
    expect(p.UPDATE(3)).toBe("/portfolios/3");
    expect(p.DELETE(3)).toBe("/portfolios/3");
    expect(p.HOLDINGS(3)).toBe("/portfolios/3/holdings");
    expect(p.TRANSACTIONS(3)).toBe("/portfolios/3/transactions");
    expect(p.CANCEL_TRANSACTION(3, 9)).toBe(
      "/portfolios/3/transactions/9/cancel",
    );
    expect(p.BUY(3)).toBe("/portfolios/3/buy");
    expect(p.SELL(3)).toBe("/portfolios/3/sell");
    expect(p.PERFORMANCE(3)).toBe("/portfolios/3/performance");
    expect(p.ALLOCATION(3)).toBe("/portfolios/3/allocation");
    expect(p.RISK(3)).toBe("/portfolios/3/risk");
  });

  it("keeps static endpoints and storage keys", () => {
    expect(API_ENDPOINTS.AUTH.LOGIN).toBe("/auth/login");
    expect(API_ENDPOINTS.HEALTH).toBe("/health");
    expect(Object.values(STORAGE_KEYS)).toHaveLength(3);
  });

  it("keeps unique option values with labels", () => {
    [PORTFOLIO_TYPES, RISK_LEVELS, ASSET_TYPES, COUNTRIES].forEach((list) => {
      const values = list.map((i) => i.value);
      expect(new Set(values).size).toBe(values.length);
      expect(list.every((i) => i.label)).toBe(true);
    });
    expect(CURRENCIES).toContain("USD");
    expect(ERROR_MESSAGES.NETWORK_ERROR).toMatch(/Network error/);
  });
});
