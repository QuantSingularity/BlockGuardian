import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Login from "../../pages/login";

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }) => <a href={href}>{children}</a>;
});

// Mock next/router
const mockPush = jest.fn();
jest.mock("next/router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("Login Page", () => {
  const mockToggleDarkMode = jest.fn();
  const defaultProps = {
    darkMode: false,
    toggleDarkMode: mockToggleDarkMode,
  };

  beforeEach(() => {
    mockToggleDarkMode.mockClear();
    mockPush.mockClear();
    jest.clearAllMocks();
  });

  test("renders login form by default", () => {
    render(<Login {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: /Sign in to your account/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^Password$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign in$/i }),
    ).toBeInTheDocument();
  });

  test("renders dark mode toggle button", () => {
    render(<Login {...defaultProps} />);
    const toggleButton = screen.getByRole("button", {
      name: /Toggle dark mode/i,
    });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveTextContent("🌙");
    fireEvent.click(toggleButton);
    expect(mockToggleDarkMode).toHaveBeenCalledTimes(1);
  });

  test('toggles to signup form when "Sign up" is clicked', () => {
    render(<Login {...defaultProps} />);
    const signupButton = screen.getByRole("button", { name: /Sign up/i });
    fireEvent.click(signupButton);

    expect(
      screen.getByRole("heading", { name: /Create a new account/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Full Name/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Confirm Password/i),
    ).toBeInTheDocument();
  });

  test("updates email and password fields on input", () => {
    render(<Login {...defaultProps} />);
    const emailInput = screen.getByPlaceholderText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText(/^Password$/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput.value).toBe("test@example.com");
    expect(passwordInput.value).toBe("password123");
  });

  test("shows error message for empty fields on login submit", async () => {
    render(<Login {...defaultProps} />);
    const submitButton = screen.getByRole("button", { name: /Sign in$/i });
    fireEvent.click(submitButton);

    expect(
      await screen.findByText(/Please fill in all required fields/i),
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("shows error message for password mismatch on signup submit", async () => {
    render(<Login {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Sign up/i }));

    fireEvent.change(screen.getByPlaceholderText(/Full Name/i), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Email address/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^Password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Confirm Password/i), {
      target: { value: "password456" },
    });

    const submitButton = screen.getByRole("button", { name: /Sign up$/i });
    fireEvent.click(submitButton);

    expect(
      await screen.findByText(/Passwords do not match/i),
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("simulates successful login and redirects", async () => {
    render(<Login {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/Email address/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^Password$/i), {
      target: { value: "password123" },
    });

    const submitButton = screen.getByRole("button", { name: /Sign in$/i });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();

    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      },
      { timeout: 2000 },
    );
  });

  test("renders social login buttons", () => {
    render(<Login {...defaultProps} />);
    expect(
      screen.getByRole("link", { name: /Sign in with Google/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Sign in with Twitter/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Sign in with GitHub/i }),
    ).toBeInTheDocument();
  });
});
