import {
  API_ENDPOINTS,
  ASSET_TYPES,
  DEFAULT_CURRENCY,
  ERROR_MESSAGES,
  PORTFOLIO_TYPES,
  RISK_LEVELS,
  ROUTES,
  STORAGE_KEYS,
  TRANSACTION_TYPES,
} from "../../utils/constants";

describe("API_ENDPOINTS", () => {
  it("builds parameterised portfolio routes", () => {
    expect(API_ENDPOINTS.PORTFOLIO.DETAIL(5)).toMatch(/\/portfolios\/5$/);
    expect(API_ENDPOINTS.PORTFOLIO.UPDATE(5)).toMatch(/\/portfolios\/5$/);
    expect(API_ENDPOINTS.PORTFOLIO.DELETE(5)).toMatch(/\/portfolios\/5$/);
    expect(API_ENDPOINTS.PORTFOLIO.HOLDINGS(5)).toMatch(
      /\/portfolios\/5\/holdings$/,
    );
    expect(API_ENDPOINTS.PORTFOLIO.TRANSACTIONS(5)).toMatch(
      /\/portfolios\/5\/transactions$/,
    );
    expect(API_ENDPOINTS.PORTFOLIO.CANCEL_TRANSACTION(5, 9)).toMatch(
      /\/portfolios\/5\/transactions\/9\/cancel$/,
    );
    expect(API_ENDPOINTS.PORTFOLIO.BUY(5)).toMatch(/\/portfolios\/5\/buy$/);
    expect(API_ENDPOINTS.PORTFOLIO.SELL(5)).toMatch(/\/portfolios\/5\/sell$/);
    expect(API_ENDPOINTS.PORTFOLIO.PERFORMANCE(5)).toMatch(
      /\/portfolios\/5\/performance$/,
    );
    expect(API_ENDPOINTS.PORTFOLIO.ALLOCATION(5)).toMatch(
      /\/portfolios\/5\/allocation$/,
    );
    expect(API_ENDPOINTS.PORTFOLIO.RISK(5)).toMatch(/\/portfolios\/5\/risk$/);
  });

  it("prefixes auth and blockchain routes with the API base path", () => {
    expect(API_ENDPOINTS.AUTH.LOGIN).toMatch(/^\/api\/auth\/login$/);
    expect(API_ENDPOINTS.BLOCKCHAIN.EXPLORER).toMatch(
      /^\/api\/blockchain\/explorer$/,
    );
    expect(API_ENDPOINTS.HEALTH).toBe("/health");
  });
});

describe("ROUTES", () => {
  it("exposes static and dynamic routes", () => {
    expect(ROUTES.HOME).toBe("/");
    expect(ROUTES.LOGIN).toBe("/login");
    expect(ROUTES.PORTFOLIO_DETAIL(12)).toBe("/portfolios/12");
  });
});

describe("domain enums", () => {
  const shape = (list) =>
    list.every((item) => typeof item.value === "string" && item.label);

  it("keep a value and label on every option", () => {
    [PORTFOLIO_TYPES, RISK_LEVELS, ASSET_TYPES, TRANSACTION_TYPES].forEach(
      (list) => expect(shape(list)).toBe(true),
    );
  });

  it("have unique values", () => {
    [PORTFOLIO_TYPES, RISK_LEVELS, ASSET_TYPES, TRANSACTION_TYPES].forEach(
      (list) => {
        const values = list.map((i) => i.value);
        expect(new Set(values).size).toBe(values.length);
      },
    );
  });

  it("order risk levels from very low to very high", () => {
    expect(RISK_LEVELS.map((r) => r.value)).toEqual([
      "very_low",
      "low",
      "moderate",
      "high",
      "very_high",
    ]);
  });
});

describe("misc constants", () => {
  it("defines storage keys, a default currency and error messages", () => {
    expect(Object.values(STORAGE_KEYS)).toHaveLength(4);
    expect(DEFAULT_CURRENCY).toBe("USD");
    Object.values(ERROR_MESSAGES).forEach((m) =>
      expect(typeof m).toBe("string"),
    );
  });
});
