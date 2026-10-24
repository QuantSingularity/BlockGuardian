import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatLabel,
  formatNumber,
  formatPercent,
  formatTokenAmount,
  initials,
} from "../../src/lib/format";

describe("formatCurrency", () => {
  it("formats with two decimals by default", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("keeps up to four decimals for sub dollar values", () => {
    expect(formatCurrency(0.1234)).toBe("$0.1234");
  });

  it("supports other currencies", () => {
    expect(formatCurrency(10, "EUR")).toContain("10.00");
  });

  it("formats negatives", () => {
    expect(formatCurrency(-5)).toBe("-$5.00");
  });

  it("returns a dash for non numeric input", () => {
    expect(formatCurrency("abc")).toBe("-");
    expect(formatCurrency(undefined)).toBe("-");
  });

  it("falls back to a simple format for an invalid currency code", () => {
    expect(formatCurrency(5, "NOT_A_CODE")).toBe("$5.00");
  });
});

describe("formatNumber", () => {
  it("groups digits and trims trailing zeros", () => {
    expect(formatNumber(1234567.5)).toBe("1,234,567.5");
    expect(formatNumber(10)).toBe("10");
  });

  it("honors the decimals argument", () => {
    expect(formatNumber(1.23456, 3)).toBe("1.235");
  });

  it("returns a dash for non numeric input", () => {
    expect(formatNumber("x")).toBe("-");
  });
});

describe("formatPercent", () => {
  it("adds a plus sign for non negative values", () => {
    expect(formatPercent(2.5)).toBe("+2.50%");
    expect(formatPercent(0)).toBe("+0.00%");
  });

  it("keeps the minus sign for negatives", () => {
    expect(formatPercent(-1.234)).toBe("-1.23%");
  });

  it("honors the decimals argument", () => {
    expect(formatPercent(1.2345, 1)).toBe("+1.2%");
  });

  it("returns a dash for non numeric input", () => {
    expect(formatPercent("nope")).toBe("-");
  });
});

describe("formatDate and formatDateTime", () => {
  it("formats a valid date", () => {
    expect(formatDate("2026-01-15T12:00:00Z")).toBe("Jan 15, 2026");
  });

  it("formats a date and time", () => {
    expect(formatDateTime("2026-01-15T12:00:00Z")).toMatch(/Jan 15, 2026/);
  });

  it.each([null, undefined, "", "not a date"])(
    "returns a dash for %p",
    (value) => {
      expect(formatDate(value)).toBe("-");
      expect(formatDateTime(value)).toBe("-");
    },
  );
});

describe("formatLabel", () => {
  it("title cases snake case values", () => {
    expect(formatLabel("mutual_fund")).toBe("Mutual Fund");
    expect(formatLabel("stock")).toBe("Stock");
  });

  it("returns a dash for empty values", () => {
    expect(formatLabel("")).toBe("-");
    expect(formatLabel(null)).toBe("-");
  });
});

describe("formatTokenAmount", () => {
  it("converts an 18 decimal integer string", () => {
    expect(formatTokenAmount("1000000000000000000000000")).toBe("1,000,000.00");
  });

  it("handles amounts smaller than one token", () => {
    expect(formatTokenAmount("500000000000000000")).toBe("0.50");
  });

  it("honors custom decimals", () => {
    expect(formatTokenAmount("12345", 2, 1)).toBe("123.5");
  });

  it("returns a dash for invalid or missing values", () => {
    expect(formatTokenAmount(null)).toBe("-");
    expect(formatTokenAmount(undefined)).toBe("-");
    expect(formatTokenAmount("12.5")).toBe("-");
    expect(formatTokenAmount("abc")).toBe("-");
  });

  it("returns a dash when the value is too large to represent", () => {
    expect(formatTokenAmount("9".repeat(400))).toBe("-");
  });

  it("accepts numbers", () => {
    expect(formatTokenAmount(1000000000000000000)).toBe("1.00");
  });
});

describe("initials", () => {
  it("uses the first letter of each name in upper case", () => {
    expect(initials("jane", "doe")).toBe("JD");
  });

  it("copes with one or no name", () => {
    expect(initials("jane")).toBe("J");
    expect(initials()).toBe("U");
    expect(initials(null, null)).toBe("U");
  });
});
