import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Navbar from "../../components/Navbar";

// Mock next/link behavior for testing
jest.mock("next/link", () => {
  return ({ children, href }) => {
    return <a href={href}>{children}</a>;
  };
});

describe("Navbar Component", () => {
  const mockToggleDarkMode = jest.fn();

  beforeEach(() => {
    mockToggleDarkMode.mockClear();
  });

  test("renders brand name BlockGuardian", () => {
    render(<Navbar darkMode={false} toggleDarkMode={mockToggleDarkMode} />);
    expect(screen.getByText("BlockGuardian")).toBeInTheDocument();
  });

  test("renders desktop navigation links", () => {
    render(<Navbar darkMode={false} toggleDarkMode={mockToggleDarkMode} />);
    expect(screen.getByRole("link", { name: /Home/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Portfolio/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Market Analysis/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /AI Recommendations/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Blockchain Explorer/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Login/i })).toBeInTheDocument();
  });

  test("renders dark mode toggle button", () => {
    const { rerender } = render(
      <Navbar darkMode={false} toggleDarkMode={mockToggleDarkMode} />,
    );
    let toggleButton = screen.getByText("🌙");
    expect(toggleButton).toBeInTheDocument();
    fireEvent.click(toggleButton);
    expect(mockToggleDarkMode).toHaveBeenCalledTimes(1);

    // Test dark mode rendering
    rerender(<Navbar darkMode={true} toggleDarkMode={mockToggleDarkMode} />);
    toggleButton = screen.getByText("☀️");
    expect(toggleButton).toBeInTheDocument();
  });

  test("toggles mobile menu visibility", () => {
    render(<Navbar darkMode={false} toggleDarkMode={mockToggleDarkMode} />);
    const menuButton = screen.getByRole("button", { name: /Open main menu/i });

    // Open menu
    fireEvent.click(menuButton);
    expect(
      screen.getByRole("button", { name: /Switch to Dark Mode 🌙/i }),
    ).toBeInTheDocument();

    // Close menu
    fireEvent.click(menuButton);
    expect(
      screen.queryByRole("button", { name: /Switch to Dark Mode 🌙/i }),
    ).not.toBeInTheDocument();
  });

  test("renders mobile navigation links when menu is open", () => {
    render(<Navbar darkMode={false} toggleDarkMode={mockToggleDarkMode} />);
    const menuButton = screen.getByRole("button", { name: /Open main menu/i });
    fireEvent.click(menuButton);

    const mobileLinks = screen.getAllByRole("link");
    expect(mobileLinks.some((link) => link.textContent === "Portfolio")).toBe(
      true,
    );
    expect(
      mobileLinks.some((link) => link.textContent === "Market Analysis"),
    ).toBe(true);
    expect(
      mobileLinks.some((link) => link.textContent === "AI Recommendations"),
    ).toBe(true);
    expect(
      mobileLinks.some((link) => link.textContent === "Blockchain Explorer"),
    ).toBe(true);
    expect(mobileLinks.some((link) => link.textContent === "Dashboard")).toBe(
      true,
    );
    expect(mobileLinks.some((link) => link.textContent === "Login")).toBe(true);
  });
});
