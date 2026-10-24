import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/router";
import Logo from "../../components/Logo";
import ProtectedRoute from "../../components/ProtectedRoute";
import DashboardLayout from "../../components/layout/DashboardLayout";
import DashboardSidebar from "../../components/layout/DashboardSidebar";
import DashboardTopbar from "../../components/layout/DashboardTopbar";
import Footer from "../../components/layout/Footer";
import PublicLayout from "../../components/layout/PublicLayout";
import PublicNavbar from "../../components/layout/PublicNavbar";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

jest.mock("next/router", () => ({ useRouter: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/ThemeContext", () => ({ useTheme: jest.fn() }));

const push = jest.fn();
const replace = jest.fn();
const toggleDarkMode = jest.fn();
const logout = jest.fn();

const authState = (overrides = {}) => ({
  isAuthenticated: true,
  isLoading: false,
  user: {
    first_name: "Jane",
    last_name: "Doe",
    username: "jdoe",
    email: "jane@example.com",
  },
  logout,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  useRouter.mockReturnValue({
    push,
    replace,
    pathname: "/dashboard",
    asPath: "/dashboard?tab=1",
  });
  useAuth.mockReturnValue(authState());
  useTheme.mockReturnValue({ darkMode: false, toggleDarkMode });
});

describe("Logo", () => {
  it("renders the wordmark as a link home by default", () => {
    render(<Logo />);
    expect(screen.getByText("BlockGuardian")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/");
  });

  it("can hide the text", () => {
    render(<Logo withText={false} />);
    expect(screen.queryByText("BlockGuardian")).not.toBeInTheDocument();
  });

  it("renders without a link when href is empty", () => {
    render(<Logo href="" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("BlockGuardian")).toBeInTheDocument();
  });

  it("supports a custom href and each size", () => {
    const { rerender } = render(<Logo size="sm" href="/x" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/x");
    expect(screen.getByText("BlockGuardian")).toHaveClass("text-base");
    rerender(<Logo size="lg" />);
    expect(screen.getByText("BlockGuardian")).toHaveClass("text-2xl");
    rerender(<Logo size="md" />);
    expect(screen.getByText("BlockGuardian")).toHaveClass("text-lg");
  });
});

describe("ProtectedRoute", () => {
  it("renders children for an authenticated user", () => {
    render(
      <ProtectedRoute>
        <p>secret</p>
      </ProtectedRoute>,
    );
    expect(screen.getByText("secret")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a loader and does not redirect while loading", () => {
    useAuth.mockReturnValue(
      authState({ isAuthenticated: false, isLoading: true }),
    );
    render(
      <ProtectedRoute>
        <p>secret</p>
      </ProtectedRoute>,
    );
    expect(screen.getByText("Checking your session...")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to login with the encoded return path when signed out", () => {
    useAuth.mockReturnValue(
      authState({ isAuthenticated: false, isLoading: false }),
    );
    render(
      <ProtectedRoute>
        <p>secret</p>
      </ProtectedRoute>,
    );
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith(
      `/login?next=${encodeURIComponent("/dashboard?tab=1")}`,
    );
  });
});

describe("PublicLayout", () => {
  it("renders the navbar, content and footer", () => {
    useAuth.mockReturnValue(authState({ isAuthenticated: false }));
    render(
      <PublicLayout>
        <p>page body</p>
      </PublicLayout>,
    );
    expect(screen.getByText("page body")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("can hide the footer", () => {
    useAuth.mockReturnValue(authState({ isAuthenticated: false }));
    render(
      <PublicLayout hideFooter>
        <p>page body</p>
      </PublicLayout>,
    );
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});

describe("Footer", () => {
  it("lists every navigation column and link", () => {
    render(<Footer />);
    ["Product", "Company", "Legal"].forEach((title) =>
      expect(screen.getByText(title)).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "Markets" })).toHaveAttribute(
      "href",
      "/markets",
    );
    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy");
    expect(
      screen.getByRole("link", { name: "Terms of Service" }),
    ).toHaveAttribute("href", "/terms");
  });

  it("shows the current year and the disclaimer", () => {
    render(<Footer />);
    expect(
      screen.getByText(new RegExp(String(new Date().getFullYear()))),
    ).toBeInTheDocument();
    expect(screen.getByText(/not investment advice/)).toBeInTheDocument();
  });
});

describe("PublicNavbar", () => {
  beforeEach(() => {
    useRouter.mockReturnValue({ push, pathname: "/markets" });
    useAuth.mockReturnValue(authState({ isAuthenticated: false }));
  });

  it("highlights the link for the current route", () => {
    render(<PublicNavbar />);
    const [markets] = screen.getAllByRole("link", { name: "Markets" });
    expect(markets).toHaveClass("nav-link-active");
    const [about] = screen.getAllByRole("link", { name: "About" });
    expect(about).toHaveClass("nav-link");
  });

  it("offers sign in and get started to anonymous visitors", () => {
    render(<PublicNavbar />);
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute(
      "href",
      "/login",
    );
    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    expect(push).toHaveBeenCalledWith("/register");
  });

  it("offers the dashboard to authenticated visitors", () => {
    useAuth.mockReturnValue(authState());
    render(<PublicNavbar />);
    expect(
      screen.queryByRole("button", { name: "Get Started" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go to Dashboard" }));
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("toggles dark mode from the desktop button", () => {
    render(<PublicNavbar />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle dark mode" }));
    expect(toggleDarkMode).toHaveBeenCalledTimes(1);
  });

  it("renders the alternate icon in dark mode", () => {
    useTheme.mockReturnValue({ darkMode: true, toggleDarkMode });
    render(<PublicNavbar />);
    expect(
      screen.getByRole("button", { name: "Toggle dark mode" }),
    ).toBeInTheDocument();
  });

  it("opens and closes the mobile menu", () => {
    render(<PublicNavbar />);
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    expect(screen.getAllByRole("link", { name: "Markets" })).toHaveLength(1);
    fireEvent.click(toggle);
    expect(screen.getAllByRole("link", { name: "Markets" })).toHaveLength(2);
    fireEvent.click(toggle);
    expect(screen.getAllByRole("link", { name: "Markets" })).toHaveLength(1);
  });

  it("closes the mobile menu after following a link", () => {
    render(<PublicNavbar />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    fireEvent.click(screen.getAllByRole("link", { name: "About" })[1]);
    expect(screen.getAllByRole("link", { name: "About" })).toHaveLength(1);
  });

  it("supports theme and registration actions in the mobile menu", () => {
    render(<PublicNavbar />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    fireEvent.click(screen.getByRole("button", { name: /Dark mode/ }));
    expect(toggleDarkMode).toHaveBeenCalled();
    const getStarted = screen.getAllByRole("button", { name: "Get Started" });
    fireEvent.click(getStarted[getStarted.length - 1]);
    expect(push).toHaveBeenCalledWith("/register");
  });

  it("shows the light mode label and dashboard action in the mobile menu", () => {
    useTheme.mockReturnValue({ darkMode: true, toggleDarkMode });
    useAuth.mockReturnValue(authState());
    render(<PublicNavbar />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    expect(
      screen.getByRole("button", { name: /Light mode/ }),
    ).toBeInTheDocument();
    const dash = screen.getAllByRole("button", { name: "Go to Dashboard" });
    fireEvent.click(dash[dash.length - 1]);
    expect(push).toHaveBeenCalledWith("/dashboard");
  });
});

describe("DashboardSidebar", () => {
  it("renders every navigation item", () => {
    render(<DashboardSidebar open={false} onClose={jest.fn()} />);
    [
      "Dashboard",
      "Portfolios",
      "Markets",
      "Blockchain Explorer",
      "Account",
    ].forEach((label) =>
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument(),
    );
    expect(screen.getByText("Demo environment")).toBeInTheDocument();
  });

  it("highlights the exact match route", () => {
    render(<DashboardSidebar open onClose={jest.fn()} />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveClass(
      "text-indigo-600",
    );
    expect(screen.getByRole("link", { name: "Markets" })).not.toHaveClass(
      "text-indigo-600",
    );
  });

  it("highlights portfolios for nested routes", () => {
    useRouter.mockReturnValue({ push, pathname: "/portfolios/[id]" });
    render(<DashboardSidebar open onClose={jest.fn()} />);
    expect(screen.getByRole("link", { name: "Portfolios" })).toHaveClass(
      "text-indigo-600",
    );
  });

  it("shows a backdrop only when open and closes through it", () => {
    const onClose = jest.fn();
    const { container, rerender } = render(
      <DashboardSidebar open={false} onClose={onClose} />,
    );
    expect(container.querySelector("[aria-hidden='true']")).toBeNull();
    rerender(<DashboardSidebar open onClose={onClose} />);
    fireEvent.click(container.querySelector("[aria-hidden='true']"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when a link is chosen", () => {
    const onClose = jest.fn();
    render(<DashboardSidebar open onClose={onClose} />);
    fireEvent.click(screen.getByRole("link", { name: "Markets" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("slides in when open and out when closed", () => {
    const { container, rerender } = render(
      <DashboardSidebar open onClose={jest.fn()} />,
    );
    expect(container.querySelector("aside")).toHaveClass("translate-x-0");
    rerender(<DashboardSidebar open={false} onClose={jest.fn()} />);
    expect(container.querySelector("aside")).toHaveClass("-translate-x-full");
  });
});

describe("DashboardTopbar", () => {
  it("shows the title, initials and first name", () => {
    render(<DashboardTopbar title="Overview" onMenuClick={jest.fn()} />);
    expect(
      screen.getByRole("heading", { name: "Overview" }),
    ).toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
  });

  it("falls back to the username when there is no first name", () => {
    useAuth.mockReturnValue(
      authState({ user: { username: "jdoe", email: "j@x.co" } }),
    );
    render(<DashboardTopbar title="T" />);
    expect(screen.getByText("jdoe")).toBeInTheDocument();
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("calls the menu and theme handlers", () => {
    const onMenuClick = jest.fn();
    render(<DashboardTopbar title="T" onMenuClick={onMenuClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Toggle dark mode" }));
    expect(onMenuClick).toHaveBeenCalledTimes(1);
    expect(toggleDarkMode).toHaveBeenCalledTimes(1);
  });

  it("renders the dark mode icon branch", () => {
    useTheme.mockReturnValue({ darkMode: true, toggleDarkMode });
    render(<DashboardTopbar title="T" />);
    expect(
      screen.getByRole("button", { name: "Toggle dark mode" }),
    ).toBeInTheDocument();
  });

  it("opens the user menu, shows the account details and signs out", () => {
    render(<DashboardTopbar title="T" />);
    expect(screen.queryByText("Sign Out")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Jane").closest("button"));
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Account Settings/ }),
    ).toHaveAttribute("href", "/account");
    fireEvent.click(screen.getByRole("button", { name: /Sign Out/ }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("closes the menu on an outside click but not an inside click", () => {
    render(<DashboardTopbar title="T" />);
    fireEvent.click(screen.getByText("Jane").closest("button"));
    fireEvent.mouseDown(screen.getByText("jane@example.com"));
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    act(() => {
      fireEvent.mouseDown(document.body);
    });
    expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
  });

  it("closes the menu after following the account link", () => {
    render(<DashboardTopbar title="T" />);
    fireEvent.click(screen.getByText("Jane").closest("button"));
    fireEvent.click(screen.getByRole("link", { name: /Account Settings/ }));
    expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
  });

  it("toggles the menu closed on a second click", () => {
    render(<DashboardTopbar title="T" />);
    const trigger = screen.getByText("Jane").closest("button");
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
  });
});

describe("DashboardLayout", () => {
  it("renders children inside the protected shell", () => {
    render(
      <DashboardLayout title="Portfolios">
        <p>inner</p>
      </DashboardLayout>,
    );
    expect(screen.getByText("inner")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Portfolios" }),
    ).toBeInTheDocument();
  });

  it("uses the default title", () => {
    render(
      <DashboardLayout>
        <p>inner</p>
      </DashboardLayout>,
    );
    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  it("hides content from signed out users", () => {
    useAuth.mockReturnValue(authState({ isAuthenticated: false }));
    render(
      <DashboardLayout>
        <p>inner</p>
      </DashboardLayout>,
    );
    expect(screen.queryByText("inner")).not.toBeInTheDocument();
  });

  it("opens the sidebar from the topbar menu button", () => {
    const { container } = render(
      <DashboardLayout>
        <p>inner</p>
      </DashboardLayout>,
    );
    expect(container.querySelector("aside")).toHaveClass("-translate-x-full");
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(container.querySelector("aside")).toHaveClass("translate-x-0");
    fireEvent.click(container.querySelector("[aria-hidden='true']"));
    expect(container.querySelector("aside")).toHaveClass("-translate-x-full");
  });
});
