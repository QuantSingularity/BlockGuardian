import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Layout from "../../components/Layout";

// Mock Navbar component
jest.mock("../../components/Navbar", () => {
  return function MockNavbar() {
    return <div data-testid="navbar">Navbar</div>;
  };
});

// Mock Next.js Head component
jest.mock("next/head", () => {
  return {
    __esModule: true,
    default: ({ children }) => {
      return <>{children}</>;
    },
  };
});

describe("Layout Component", () => {
  const mockToggleDarkMode = jest.fn();

  test("renders children correctly", () => {
    render(
      <Layout darkMode={false} toggleDarkMode={mockToggleDarkMode}>
        <div>Test Content</div>
      </Layout>,
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  test("renders Navbar", () => {
    render(
      <Layout darkMode={false} toggleDarkMode={mockToggleDarkMode}>
        <div>Test</div>
      </Layout>,
    );
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
  });

  test("renders footer", () => {
    render(
      <Layout darkMode={false} toggleDarkMode={mockToggleDarkMode}>
        <div>Test</div>
      </Layout>,
    );
    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`© ${currentYear} BlockGuardian`)),
    ).toBeInTheDocument();
  });

  test("applies dark mode class when darkMode is true", () => {
    const { container } = render(
      <Layout darkMode={true} toggleDarkMode={mockToggleDarkMode}>
        <div>Test</div>
      </Layout>,
    );
    expect(container.querySelector(".dark")).toBeInTheDocument();
  });

  test("does not apply dark mode class when darkMode is false", () => {
    const { container } = render(
      <Layout darkMode={false} toggleDarkMode={mockToggleDarkMode}>
        <div>Test</div>
      </Layout>,
    );
    expect(container.querySelector(".dark")).not.toBeInTheDocument();
  });
});
