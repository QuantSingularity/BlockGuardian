import { act, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { ToastProvider, useToast } from "../../src/context/ToastContext";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("ToastProvider", () => {
  it("shows a toast for each helper", () => {
    const view = { current: null };
    const Harness = () => {
      view.current = useToast();
      return null;
    };
    const screen = render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    act(() => {
      view.current.success("Saved");
      view.current.error("Broke");
      view.current.info("FYI");
      view.current.warning("Careful");
    });
    ["Saved", "Broke", "FYI", "Careful"].forEach((text) =>
      expect(screen.getByText(text)).toBeTruthy(),
    );
  });

  it("dismisses after 3500ms and not before", () => {
    const holder = { current: null };
    const Harness = () => {
      holder.current = useToast();
      return null;
    };
    const screen = render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    act(() => {
      holder.current.info("Timed");
    });
    act(() => {
      jest.advanceTimersByTime(3499);
    });
    expect(screen.getByText("Timed")).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(2);
    });
    expect(screen.queryByText("Timed")).toBeNull();
  });

  it("renders its children", () => {
    const screen = render(
      <ToastProvider>
        <Text>child content</Text>
      </ToastProvider>,
    );
    expect(screen.getByText("child content")).toBeTruthy();
  });
});

describe("useToast", () => {
  it("throws outside the provider", () => {
    const Probe = () => {
      useToast();
      return null;
    };
    expect(() => render(<Probe />)).toThrow(
      "useToast must be used within ToastProvider",
    );
  });
});
