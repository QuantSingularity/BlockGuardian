import {
  PASSWORD_RULES,
  validateEmail,
  validatePassword,
  validatePositiveNumber,
  validateRequired,
  validateUsername,
} from "../../src/lib/validators";

describe("validateEmail", () => {
  it("accepts valid addresses regardless of case or padding", () => {
    expect(validateEmail("jane@example.com")).toBeNull();
    expect(validateEmail("  Jane.Doe+tag@Example.CO.UK ")).toBeNull();
  });

  it("requires a value", () => {
    expect(validateEmail("")).toBe("Email is required");
    expect(validateEmail(undefined)).toBe("Email is required");
  });

  it("rejects malformed addresses", () => {
    ["plain", "a@b", "a@b.c", "@x.com", "a b@x.com"].forEach((v) =>
      expect(validateEmail(v)).toBe("Enter a valid email address"),
    );
  });

  it("rejects overlong addresses", () => {
    expect(validateEmail(`${"a".repeat(250)}@x.com`)).toBe("Email is too long");
  });
});

describe("validateUsername", () => {
  it("accepts letters, numbers, underscores and hyphens", () => {
    expect(validateUsername("jane_doe-1")).toBeNull();
  });

  it("requires a value", () => {
    expect(validateUsername("")).toBe("Username is required");
  });

  it("rejects short, long and invalid usernames", () => {
    ["ab", "a".repeat(33), "bad name", "bad!"].forEach((v) =>
      expect(validateUsername(v)).toMatch(/3-32 characters/),
    );
  });
});

describe("validatePassword", () => {
  it("accepts a strong password", () => {
    expect(validatePassword("Str0ngPassw0rd!")).toBeNull();
  });

  it("requires a value", () => {
    expect(validatePassword("")).toBe("Password is required");
  });

  it.each([
    ["Sh0rt!a", "At least 12 characters is required"],
    ["lowercase0nly!!", "One uppercase letter is required"],
    ["UPPERCASE0NLY!!", "One lowercase letter is required"],
    ["NoDigitsHere!!!", "One number is required"],
    ["NoSpecials1234A", "One special character is required"],
  ])("reports the first failed rule for %s", (value, message) => {
    expect(validatePassword(value)).toBe(message);
  });

  it("rejects passwords over 128 characters", () => {
    expect(validatePassword(`Aa1!${"x".repeat(130)}`)).toBe(
      "Password is too long",
    );
  });

  it("exposes five rules with working tests", () => {
    expect(PASSWORD_RULES.map((r) => r.key)).toEqual([
      "length",
      "upper",
      "lower",
      "digit",
      "special",
    ]);
    expect(PASSWORD_RULES.every((r) => r.test("Str0ngPassw0rd!"))).toBe(true);
    expect(PASSWORD_RULES.every((r) => r.test(""))).toBe(false);
  });
});

describe("validateRequired", () => {
  it("passes non empty values", () => {
    expect(validateRequired("x")).toBeNull();
    expect(validateRequired(0)).toBeNull();
  });

  it("fails empty, blank, null and undefined values using the label", () => {
    expect(validateRequired("", "Name")).toBe("Name is required");
    expect(validateRequired("   ", "Name")).toBe("Name is required");
    expect(validateRequired(null)).toBe("This field is required");
    expect(validateRequired(undefined)).toBe("This field is required");
  });
});

describe("validatePositiveNumber", () => {
  it("accepts positive numbers and numeric strings", () => {
    expect(validatePositiveNumber(5)).toBeNull();
    expect(validatePositiveNumber("0.5")).toBeNull();
  });

  it("rejects non numeric input", () => {
    ["", null, undefined, "abc"].forEach((v) =>
      expect(validatePositiveNumber(v, "Quantity")).toBe(
        "Quantity must be a number",
      ),
    );
  });

  it("rejects zero and negatives", () => {
    expect(validatePositiveNumber(0)).toBe("Value must be greater than zero");
    expect(validatePositiveNumber(-3, "Price")).toBe(
      "Price must be greater than zero",
    );
  });
});
