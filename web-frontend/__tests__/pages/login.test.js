import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/router";
import LoginPage from "../../pages/login";
import { useAuth } from "../../context/AuthContext";

jest.mock("next/router", () => ({ useRouter: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("../../context/ToastContext", () => ({
  useToast: () => mockToast,
}));

jest.mock("../../components/layout/PublicLayout", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ children }) => React.createElement("div", null, children),
  };
});

const push = jest.fn();
const login = jest.fn();

const fill = (email, password) => {
  fireEvent.change(screen.getByLabelText(/Email address/), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/^Password/), {
    target: { value: password },
  });
};

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

beforeEach(() => {
  jest.clearAllMocks();
  useRouter.mockReturnValue({ push, query: {} });
  useAuth.mockReturnValue({ login });
});

describe("LoginPage", () => {
  it("renders the sign in form and registration link", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create one for free" }),
    ).toHaveAttribute("href", "/register");
  });

  it("flags both fields when they are empty", async () => {
    render(<LoginPage />);
    submit();
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("flags only the missing field", async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Email address/), {
      target: { value: "a@b.co" },
    });
    submit();
    expect(await screen.findByText("Password is required")).toBeInTheDocument();
    expect(screen.queryByText("Email is required")).not.toBeInTheDocument();
  });

  it("toggles password visibility", () => {
    render(<LoginPage />);
    const password = screen.getByLabelText(/^Password/);
    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("signs in, greets the user and goes to the dashboard", async () => {
    login.mockResolvedValue({
      mfaRequired: false,
      user: { first_name: "Jane" },
    });
    render(<LoginPage />);
    fill("  jane@example.com ", "Secret123!");
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
    expect(login).toHaveBeenCalledWith(
      "jane@example.com",
      "Secret123!",
      undefined,
    );
    expect(mockToast.success).toHaveBeenCalledWith("Welcome back, Jane!");
  });

  it("greets with a fallback name when the profile has none", async () => {
    login.mockResolvedValue({ mfaRequired: false, user: {} });
    render(<LoginPage />);
    fill("a@b.co", "pw");
    submit();
    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith("Welcome back, there!"),
    );
  });

  it("returns to the requested page after signing in", async () => {
    useRouter.mockReturnValue({ push, query: { next: "/portfolios/4" } });
    login.mockResolvedValue({ mfaRequired: false, user: {} });
    render(<LoginPage />);
    fill("a@b.co", "pw");
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/portfolios/4"));
  });

  it("ignores a non string next parameter", async () => {
    useRouter.mockReturnValue({ push, query: { next: ["/a", "/b"] } });
    login.mockResolvedValue({ mfaRequired: false, user: {} });
    render(<LoginPage />);
    fill("a@b.co", "pw");
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows the backend error message on failure", async () => {
    login.mockRejectedValue(
      Object.assign(new Error("Invalid email or password."), { status: 401 }),
    );
    render(<LoginPage />);
    fill("a@b.co", "bad");
    submit();
    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("explains a locked account", async () => {
    login.mockRejectedValue(
      Object.assign(new Error("locked"), { status: 423 }),
    );
    render(<LoginPage />);
    fill("a@b.co", "bad");
    submit();
    expect(
      await screen.findByText(/temporarily locked due to failed sign-in/),
    ).toBeInTheDocument();
  });

  it("falls back to a generic message", async () => {
    login.mockRejectedValue({});
    render(<LoginPage />);
    fill("a@b.co", "bad");
    submit();
    expect(
      await screen.findByText("Unable to sign in. Please try again."),
    ).toBeInTheDocument();
  });

  describe("two-factor step", () => {
    const reachMfa = async () => {
      login.mockResolvedValueOnce({ mfaRequired: true });
      render(<LoginPage />);
      fill("a@b.co", "pw");
      submit();
      await screen.findByLabelText("Authentication code");
    };

    it("asks for a code when the server requires it", async () => {
      await reachMfa();
      expect(
        screen.getByRole("heading", { name: "Two-factor verification" }),
      ).toBeInTheDocument();
      expect(mockToast.info).toHaveBeenCalledWith(
        "Enter your two-factor authentication code to continue.",
      );
      expect(push).not.toHaveBeenCalled();
    });

    it("strips non digits from the code", async () => {
      await reachMfa();
      const input = screen.getByLabelText("Authentication code");
      fireEvent.change(input, { target: { value: "12ab34" } });
      expect(input).toHaveValue("1234");
    });

    it("rejects a short code", async () => {
      await reachMfa();
      fireEvent.change(screen.getByLabelText("Authentication code"), {
        target: { value: "123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Verify/ }));
      expect(
        await screen.findByText(
          "Enter the 6-digit code from your authenticator app",
        ),
      ).toBeInTheDocument();
      expect(login).toHaveBeenCalledTimes(1);
    });

    it("signs in with the code", async () => {
      await reachMfa();
      login.mockResolvedValueOnce({
        mfaRequired: false,
        user: { first_name: "J" },
      });
      fireEvent.change(screen.getByLabelText("Authentication code"), {
        target: { value: "654321" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Verify/ }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
      expect(login).toHaveBeenLastCalledWith("a@b.co", "pw", "654321");
    });

    it("can go back to the email and password step", async () => {
      await reachMfa();
      fireEvent.click(screen.getByRole("button", { name: /Back to email/ }));
      expect(screen.getByLabelText(/Email address/)).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Welcome back" }),
      ).toBeInTheDocument();
    });
  });
});
