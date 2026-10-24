import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/router";
import RegisterPage from "../../pages/register";
import { useAuth } from "../../context/AuthContext";

jest.mock("next/router", () => ({ useRouter: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));

const mockToast = { success: jest.fn(), error: jest.fn() };
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
const register = jest.fn();
const STRONG = "Str0ngPassw0rd!";

const type = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fillValid = () => {
  type(/First name/, "Jane");
  type(/Last name/, "Doe");
  type(/Email address/, " Jane@Example.com ");
  type(/^Username/, " jane_doe ");
  type(/^Password/, STRONG);
  type(/Confirm password/, STRONG);
  fireEvent.click(screen.getByRole("checkbox"));
};

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));

beforeEach(() => {
  jest.clearAllMocks();
  useRouter.mockReturnValue({ push });
  useAuth.mockReturnValue({ register });
});

describe("RegisterPage", () => {
  it("renders the form, legal links and sign in link", () => {
    render(<RegisterPage />);
    expect(
      screen.getByRole("heading", { name: "Create your account" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Terms of Service" }),
    ).toHaveAttribute("href", "/terms");
    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.getByLabelText("Country")).toHaveValue("US");
  });

  it("validates every required field on an empty submit", async () => {
    render(<RegisterPage />);
    submit();
    expect(
      await screen.findByText("First name is required"),
    ).toBeInTheDocument();
    expect(screen.getByText("Last name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Username is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(
      screen.getByText("You must accept the terms to continue"),
    ).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("rejects an invalid email, username and weak password", async () => {
    render(<RegisterPage />);
    type(/Email address/, "nope");
    type(/^Username/, "a");
    type(/^Password/, "short");
    submit();
    expect(
      await screen.findByText("Enter a valid email address"),
    ).toBeInTheDocument();
    expect(screen.getByText(/3-32 characters: letters/)).toBeInTheDocument();
    expect(
      screen.getByText(/At least 12 characters is required/),
    ).toBeInTheDocument();
  });

  it("rejects mismatched passwords", async () => {
    render(<RegisterPage />);
    fillValid();
    type(/Confirm password/, "Different1!Pass");
    submit();
    expect(
      await screen.findByText("Passwords do not match"),
    ).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("shows live password strength feedback", () => {
    render(<RegisterPage />);
    type(/^Password/, STRONG);
    expect(screen.getByText("One special character")).toHaveClass(
      "text-emerald-600",
    );
  });

  it("toggles password visibility for both password fields", () => {
    render(<RegisterPage />);
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/Confirm password/)).toHaveAttribute(
      "type",
      "text",
    );
  });

  it("submits a normalised payload and goes to the dashboard", async () => {
    register.mockResolvedValue({ first_name: "Jane" });
    render(<RegisterPage />);
    fillValid();
    type(/Phone/, " +1 555 0100 ");
    type("Country", "PK");
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
    expect(register).toHaveBeenCalledWith({
      email: "jane@example.com",
      username: "jane_doe",
      password: STRONG,
      first_name: "Jane",
      last_name: "Doe",
      country: "PK",
      phone_number: "+1 555 0100",
    });
    expect(mockToast.success).toHaveBeenCalledWith(
      "Welcome to BlockGuardian, Jane!",
    );
  });

  it("omits an empty phone number", async () => {
    register.mockResolvedValue({ first_name: "Jane" });
    render(<RegisterPage />);
    fillValid();
    submit();
    await waitFor(() => expect(register).toHaveBeenCalled());
    expect(register.mock.calls[0][0].phone_number).toBeUndefined();
  });

  it("maps backend field errors onto the matching input", async () => {
    register.mockRejectedValue(
      Object.assign(new Error("Email already registered"), { field: "email" }),
    );
    render(<RegisterPage />);
    fillValid();
    submit();
    expect(
      await screen.findByText("Email already registered"),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("maps snake case backend fields to form fields", async () => {
    register.mockRejectedValue(
      Object.assign(new Error("Bad first name"), { field: "first_name" }),
    );
    render(<RegisterPage />);
    fillValid();
    submit();
    expect(await screen.findByText("Bad first name")).toBeInTheDocument();
    expect(screen.getByLabelText(/First name/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows a form level error for unmapped failures", async () => {
    register.mockRejectedValue(new Error("Server exploded"));
    render(<RegisterPage />);
    fillValid();
    submit();
    expect(await screen.findByText("Server exploded")).toBeInTheDocument();
  });

  it("uses a generic form error when the failure has no message", async () => {
    register.mockRejectedValue({});
    render(<RegisterPage />);
    fillValid();
    submit();
    expect(
      await screen.findByText("Registration failed. Please try again."),
    ).toBeInTheDocument();
  });
});
