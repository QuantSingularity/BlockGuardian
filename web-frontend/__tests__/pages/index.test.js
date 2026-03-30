import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Home from "../../pages/index";

// Mock next/link behavior for testing
jest.mock("next/link", () => {
  return ({ children, href }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock the Layout component to isolate the Home page content
jest.mock("../../components/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="mock-layout">{children}</div>;
  };
});

describe("Index Page (Home)", () => {
  const mockToggleDarkMode = jest.fn();
  const defaultProps = {
    darkMode: false,
    toggleDarkMode: mockToggleDarkMode,
  };

  beforeEach(() => {
    mockToggleDarkMode.mockClear();
  });

  test("renders main heading and description", () => {
    render(<Home {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: /BlockGuardian/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Comprehensive blockchain security and monitoring platform/i,
      ),
    ).toBeInTheDocument();
  });

  test("renders call-to-action buttons/links", () => {
    render(<Home {...defaultProps} />);
    expect(
      screen.getByRole("link", { name: /Explore Portfolio/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Get Started/i }),
    ).toBeInTheDocument();
  });

  test("renders feature sections with headings and links", () => {
    render(<Home {...defaultProps} />);

    // Feature 1: AI-Powered Analytics
    expect(
      screen.getByRole("heading", { name: /AI-Powered Analytics/i, level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Advanced machine learning models for financial prediction/i,
      ),
    ).toBeInTheDocument();

    // Feature 2: Blockchain Integration
    expect(
      screen.getByRole("heading", {
        name: /Blockchain Integration/i,
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Secure transactions with Ethereum smart contracts/i),
    ).toBeInTheDocument();

    // Feature 3: Real-time Data
    expect(
      screen.getByRole("heading", { name: /Real-time Data/i, level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Live financial data streaming with advanced visualization/i,
      ),
    ).toBeInTheDocument();
  });

  test('renders "Why Choose" section with sub-features', () => {
    render(<Home {...defaultProps} />);
    expect(
      screen.getByRole("heading", {
        name: /Why Choose BlockGuardian\?/i,
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Advanced Security/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Performance Optimization/i,
        level: 3,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Intelligent Insights/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Real-time Monitoring/i, level: 3 }),
    ).toBeInTheDocument();
  });
});
