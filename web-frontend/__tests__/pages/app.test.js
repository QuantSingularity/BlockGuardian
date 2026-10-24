import { render, screen } from "@testing-library/react";
import App from "../../pages/_app";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";

jest.mock("next/router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("../../services/api", () => ({
  authAPI: { getProfile: jest.fn(), logout: jest.fn() },
}));

describe("App", () => {
  it("renders the page component with its props", () => {
    const Page = ({ greeting }) => <p>{greeting}</p>;
    render(<App Component={Page} pageProps={{ greeting: "hello page" }} />);
    expect(screen.getByText("hello page")).toBeInTheDocument();
  });

  it("provides theme, toast and auth contexts to pages", async () => {
    const Page = () => {
      const theme = useTheme();
      const toast = useToast();
      const auth = useAuth();
      return (
        <ul>
          <li>{typeof theme.toggleDarkMode}</li>
          <li>{typeof toast.success}</li>
          <li>{typeof auth.login}</li>
        </ul>
      );
    };
    render(<App Component={Page} pageProps={{}} />);
    expect(await screen.findAllByText("function")).toHaveLength(3);
  });

  it("enables smooth scrolling on the document", () => {
    document.documentElement.classList.remove("scroll-smooth");
    render(<App Component={() => null} pageProps={{}} />);
    expect(document.documentElement).toHaveClass("scroll-smooth");
  });
});
