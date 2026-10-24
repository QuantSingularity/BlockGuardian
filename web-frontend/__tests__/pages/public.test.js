import { fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/router";
import HomePage from "../../pages/index";
import AboutPage from "../../pages/about";
import ContactPage from "../../pages/contact";
import PrivacyPage from "../../pages/privacy";
import TermsPage from "../../pages/terms";
import NotFoundPage from "../../pages/404";
import { useAuth } from "../../context/AuthContext";

jest.mock("next/router", () => ({ useRouter: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));

jest.mock("../../components/layout/PublicLayout", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ children, title }) =>
      React.createElement(
        "div",
        { "data-testid": "public-layout", "data-title": title },
        children,
      ),
  };
});

const push = jest.fn();
const originalLocation = window.location;

beforeEach(() => {
  jest.clearAllMocks();
  useRouter.mockReturnValue({ push });
  useAuth.mockReturnValue({ isAuthenticated: false });
});

afterEach(() => {
  window.location = originalLocation;
});

describe("HomePage", () => {
  it("presents the hero, features and steps", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /Guard and grow your/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Multi-asset portfolios")).toBeInTheDocument();
    expect(screen.getByText("Risk monitoring")).toBeInTheDocument();
    expect(screen.getByText("Asset discovery")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(9);
    expect(screen.getByText("Get started in three steps")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("offers registration and sign in to visitors", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Create free account" }),
    );
    expect(push).toHaveBeenCalledWith("/register");
    fireEvent.click(
      screen.getByRole("button", { name: "Create your free account" }),
    );
    expect(push).toHaveBeenLastCalledWith("/register");
  });

  it("offers the dashboard to signed in users and hides the closing call to action", () => {
    useAuth.mockReturnValue({ isAuthenticated: true });
    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: "Go to Dashboard" }));
    expect(push).toHaveBeenCalledWith("/dashboard");
    expect(
      screen.queryByText("Ready to take control of your portfolio?"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create free account" }),
    ).not.toBeInTheDocument();
  });
});

describe("AboutPage", () => {
  it("describes the product and its values", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "About BlockGuardian",
    );
    expect(screen.getByText("Clarity over complexity")).toBeInTheDocument();
    expect(screen.getByText("Security by default")).toBeInTheDocument();
    expect(screen.getByText("Built for every asset class")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /What we.re building/ }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("public-layout")).toHaveAttribute(
      "data-title",
      expect.stringMatching(/^About.*BlockGuardian$/),
    );
  });
});

describe("PrivacyPage", () => {
  it("lists every policy section", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(7);
    expect(screen.getByText("3. Data protection")).toBeInTheDocument();
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });
});

describe("TermsPage", () => {
  it("lists the terms sections", () => {
    render(<TermsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Terms of Service" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 2 }).length,
    ).toBeGreaterThanOrEqual(5);
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });
});

describe("NotFoundPage", () => {
  it("explains the problem and links back", () => {
    render(<NotFoundPage />);
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to homepage" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: "Go to dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
  });
});

describe("ContactPage", () => {
  const fill = (name, email, message) => {
    fireEvent.change(screen.getByLabelText(/Your name/), {
      target: { value: name },
    });
    fireEvent.change(screen.getByLabelText(/Email address/), {
      target: { value: email },
    });
    fireEvent.change(screen.getByLabelText(/Message/), {
      target: { value: message },
    });
  };

  const mockLocation = () => {
    delete window.location;
    window.location = { href: "" };
  };

  it("shows the form and the direct support address", () => {
    render(<ContactPage />);
    expect(
      screen.getByRole("heading", { name: "Get in touch" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "support@blockguardian.app" }),
    ).toHaveAttribute("href", "mailto:support@blockguardian.app");
  });

  it("validates every field", () => {
    mockLocation();
    render(<ContactPage />);
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Message is required")).toBeInTheDocument();
    expect(window.location.href).toBe("");
  });

  it("rejects an invalid email", () => {
    mockLocation();
    render(<ContactPage />);
    fill("Jane", "not-an-email", "Hello");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(window.location.href).toBe("");
  });

  it("opens a prefilled mail draft when the form is valid", () => {
    mockLocation();
    render(<ContactPage />);
    fill("Jane Doe", "jane@example.com", "Need help & advice");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    const href = window.location.href;
    expect(href.startsWith("mailto:support@blockguardian.app?")).toBe(true);
    expect(href).toContain(
      `subject=${encodeURIComponent("Message from Jane Doe")}`,
    );
    expect(href).toContain(encodeURIComponent("Need help & advice"));
    expect(href).toContain(encodeURIComponent("jane@example.com"));
  });
});
