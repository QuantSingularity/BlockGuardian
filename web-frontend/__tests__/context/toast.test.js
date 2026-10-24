import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "../../context/ToastContext";

const wrapper = ({ children }) => <ToastProvider>{children}</ToastProvider>;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("ToastProvider", () => {
  it("shows a toast for each severity helper", () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.success("Saved");
      result.current.error("Broke");
      result.current.info("FYI");
      result.current.warning("Careful");
    });
    expect(screen.getAllByRole("alert")).toHaveLength(4);
    ["Saved", "Broke", "FYI", "Careful"].forEach((text) =>
      expect(screen.getByText(text)).toBeInTheDocument(),
    );
  });

  it("removes a toast automatically after the default duration", () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.success("Gone soon");
    });
    expect(screen.getByText("Gone soon")).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(4499);
    });
    expect(screen.getByText("Gone soon")).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(2);
    });
    expect(screen.queryByText("Gone soon")).not.toBeInTheDocument();
  });

  it("dismisses a toast when its close button is pressed", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.info("Close me");
    });
    await user.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );
    expect(screen.queryByText("Close me")).not.toBeInTheDocument();
  });

  it("only removes the toast that was dismissed", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.info("First");
      result.current.info("Second");
    });
    const buttons = screen.getAllByRole("button", {
      name: "Dismiss notification",
    });
    await user.click(buttons[0]);
    expect(screen.queryByText("First")).not.toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("renders its children", () => {
    render(
      <ToastProvider>
        <p>child content</p>
      </ToastProvider>,
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });
});

describe("useToast", () => {
  it("throws when used outside the provider", () => {
    const Probe = () => {
      useToast();
      return null;
    };
    expect(() => render(<Probe />)).toThrow(
      "useToast must be used within ToastProvider",
    );
  });
});
