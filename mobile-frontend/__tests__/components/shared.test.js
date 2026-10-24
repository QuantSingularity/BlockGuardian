import { fireEvent, render } from "@testing-library/react-native";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import AppModal from "../../src/components/AppModal";
import Badge from "../../src/components/Badge";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import EmptyState from "../../src/components/EmptyState";
import Input from "../../src/components/Input";
import LoadingOverlay from "../../src/components/LoadingOverlay";
import RequireAuth from "../../src/components/RequireAuth";
import Screen from "../../src/components/Screen";
import Select from "../../src/components/Select";
import StatCard from "../../src/components/StatCard";
import Tabs from "../../src/components/Tabs";
import { chartPalette, colors } from "../../src/theme/colors";
import { useAuth } from "../../src/context/AuthContext";

jest.mock("../../src/context/AuthContext", () => ({ useAuth: jest.fn() }));

const styleOf = (node, key) => {
  let current = node;
  while (current) {
    const flat = StyleSheet.flatten(current.props.style);
    if (flat && flat[key] !== undefined) return flat[key];
    current = current.parent;
  }
  return undefined;
};

describe("StatCard", () => {
  it("shows the label and value only", () => {
    const { getByText, queryByText } = render(
      <StatCard label="Value" value="$10" />,
    );
    expect(getByText("Value")).toBeTruthy();
    expect(getByText("$10")).toBeTruthy();
    expect(queryByText(/%/)).toBeNull();
  });

  it("shows a positive change in green", () => {
    const { getByText } = render(<StatCard label="L" value="v" change={2.5} />);
    expect(getByText(/2\.50%/)).toHaveStyle({ color: "#34d399" });
  });

  it("shows a negative change in red using the absolute value", () => {
    const { getByText } = render(
      <StatCard label="L" value="v" change={-1.234} />,
    );
    expect(getByText(/1\.23%/)).toHaveStyle({ color: "#f87171" });
  });

  it("treats zero as positive", () => {
    const { getByText } = render(<StatCard label="L" value="v" change={0} />);
    expect(getByText(/0\.00%/)).toHaveStyle({ color: "#34d399" });
  });

  it("renders a subtitle alone", () => {
    const { getByText } = render(
      <StatCard label="L" value="v" subtitle="Sub" />,
    );
    expect(getByText("Sub")).toBeTruthy();
  });

  it("does not render a percentage for a non numeric change", () => {
    const { queryByText } = render(
      <StatCard label="L" value="v" change="abc" />,
    );
    expect(queryByText(/%/)).toBeNull();
  });
});

describe("EmptyState", () => {
  it("renders the title only", () => {
    const { getByText, queryByText } = render(<EmptyState title="Nothing" />);
    expect(getByText("Nothing")).toBeTruthy();
    expect(queryByText("Details")).toBeNull();
  });

  it("renders a description and an action", () => {
    const { getByText } = render(
      <EmptyState
        title="Nothing"
        description="Details"
        icon="alert"
        action={<Text>Do it</Text>}
      />,
    );
    expect(getByText("Details")).toBeTruthy();
    expect(getByText("Do it")).toBeTruthy();
  });
});

describe("Badge", () => {
  it.each([
    ["green", "#064e3b"],
    ["red", "#450a0a"],
    ["yellow", "#451a03"],
    ["blue", "#1e1b4b"],
    ["indigo", "#1e1b4b"],
    ["gray", "#1f2937"],
  ])("renders the %s palette", (color, bg) => {
    const { getByText } = render(<Badge color={color}>tag</Badge>);
    expect(styleOf(getByText("tag"), "backgroundColor")).toBe(bg);
  });

  it("falls back to gray for unknown colors and accepts a custom style", () => {
    const { getByText } = render(
      <Badge color="purple" style={{ marginTop: 3 }}>
        tag
      </Badge>,
    );
    expect(styleOf(getByText("tag"), "backgroundColor")).toBe("#1f2937");
    expect(styleOf(getByText("tag"), "marginTop")).toBe(3);
  });
});

describe("Select", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ];

  it("shows the placeholder, then the selected label", () => {
    const { getByText, rerender } = render(
      <Select label="Pick" options={options} onChange={jest.fn()} />,
    );
    expect(getByText("Select...")).toBeTruthy();
    rerender(
      <Select label="Pick" value="b" options={options} onChange={jest.fn()} />,
    );
    expect(getByText("Beta")).toBeTruthy();
  });

  it("supports a custom placeholder and no label", () => {
    const { getByText } = render(
      <Select options={options} placeholder="Choose" onChange={jest.fn()} />,
    );
    expect(getByText("Choose")).toBeTruthy();
  });

  it("shows an error message", () => {
    const { getByText } = render(
      <Select options={options} onChange={jest.fn()} error="Required" />,
    );
    expect(getByText("Required")).toBeTruthy();
  });

  it("opens the list, reports the choice and closes", () => {
    const onChange = jest.fn();
    const { getByText, queryByText } = render(
      <Select label="Pick" value="a" options={options} onChange={onChange} />,
    );
    expect(queryByText("Beta")).toBeNull();
    fireEvent.press(getByText("Alpha"));
    fireEvent.press(getByText("Beta"));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(queryByText("Beta")).toBeNull();
  });

  it("uses a default sheet title without a label", () => {
    const { getByText } = render(
      <Select options={options} onChange={jest.fn()} />,
    );
    fireEvent.press(getByText("Select..."));
    expect(getByText("Select an option")).toBeTruthy();
  });

  it("closes from the backdrop and the back button", () => {
    const { getByText, queryByText, UNSAFE_getByType } = render(
      <Select label="Pick" options={options} onChange={jest.fn()} />,
    );
    fireEvent.press(getByText("Select..."));
    fireEvent.press(UNSAFE_getByType(Pressable));
    expect(queryByText("Alpha")).toBeNull();
    fireEvent.press(getByText("Select..."));
    UNSAFE_getByType(Modal).props.onRequestClose();
  });

  it("renders with no options", () => {
    const { getByText } = render(<Select onChange={jest.fn()} />);
    expect(getByText("Select...")).toBeTruthy();
  });
});

describe("RequireAuth", () => {
  const navigation = { reset: jest.fn() };

  beforeEach(() => {
    navigation.reset.mockClear();
  });

  it("renders children for an authenticated user", () => {
    useAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    const { getByText } = render(
      <RequireAuth navigation={navigation}>
        <Text>secret</Text>
      </RequireAuth>,
    );
    expect(getByText("secret")).toBeTruthy();
    expect(navigation.reset).not.toHaveBeenCalled();
  });

  it("shows a loader and does not redirect while loading", () => {
    useAuth.mockReturnValue({ isAuthenticated: false, isLoading: true });
    const { getByText, queryByText } = render(
      <RequireAuth navigation={navigation}>
        <Text>secret</Text>
      </RequireAuth>,
    );
    expect(getByText("Checking your session...")).toBeTruthy();
    expect(queryByText("secret")).toBeNull();
    expect(navigation.reset).not.toHaveBeenCalled();
  });

  it("resets to the login screen when signed out", () => {
    useAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });
    const { queryByText } = render(
      <RequireAuth navigation={navigation}>
        <Text>secret</Text>
      </RequireAuth>,
    );
    expect(queryByText("secret")).toBeNull();
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: "Login" }],
    });
  });
});

describe("LoadingOverlay", () => {
  it("renders nothing visible by default", () => {
    const { queryByText } = render(<LoadingOverlay />);
    expect(queryByText("Loading...")).toBeNull();
  });

  it("shows the message and sub message when visible", () => {
    const { getByText } = render(
      <LoadingOverlay visible message="Working" subMessage="Please wait" />,
    );
    expect(getByText("Working")).toBeTruthy();
    expect(getByText("Please wait")).toBeTruthy();
  });

  it("uses the default message", () => {
    const { getByText, queryByText } = render(<LoadingOverlay visible />);
    expect(getByText("Loading...")).toBeTruthy();
    expect(queryByText("Please wait")).toBeNull();
  });
});

describe("AppModal", () => {
  it("renders nothing when hidden", () => {
    const { queryByText } = render(
      <AppModal visible={false} title="T" onClose={jest.fn()}>
        <Text>body</Text>
      </AppModal>,
    );
    expect(queryByText("body")).toBeNull();
  });

  it("renders the title and children when visible", () => {
    const { getByText } = render(
      <AppModal visible title="My title" onClose={jest.fn()}>
        <Text>body</Text>
      </AppModal>,
    );
    expect(getByText("My title")).toBeTruthy();
    expect(getByText("body")).toBeTruthy();
  });

  it("closes from the close button, the backdrop and the back button", () => {
    const onClose = jest.fn();
    const { UNSAFE_getByType } = render(
      <AppModal visible title="T" onClose={onClose} maxHeight="50%">
        <Text>body</Text>
      </AppModal>,
    );
    fireEvent.press(UNSAFE_getByType(TouchableOpacity));
    fireEvent.press(UNSAFE_getByType(Pressable));
    UNSAFE_getByType(Modal).props.onRequestClose();
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});

describe("Screen", () => {
  it("renders scrollable padded content by default", () => {
    const { getByText, UNSAFE_getByType, UNSAFE_queryByType } = render(
      <Screen>
        <Text>content</Text>
      </Screen>,
    );
    expect(getByText("content")).toBeTruthy();
    expect(UNSAFE_getByType(ScrollView)).toBeTruthy();
    expect(UNSAFE_queryByType(RefreshControl)).toBeNull();
  });

  it("adds pull to refresh when a handler is supplied", () => {
    const onRefresh = jest.fn();
    const { UNSAFE_getByType } = render(
      <Screen onRefresh={onRefresh} refreshing>
        <Text>content</Text>
      </Screen>,
    );
    const control = UNSAFE_getByType(RefreshControl);
    expect(control.props.refreshing).toBe(true);
    control.props.onRefresh();
    expect(onRefresh).toHaveBeenCalled();
  });

  it("can render without scrolling or padding", () => {
    const { getByText, UNSAFE_queryByType } = render(
      <Screen scroll={false} padded={false} contentContainerStyle={{ gap: 1 }}>
        <Text>content</Text>
      </Screen>,
    );
    expect(getByText("content")).toBeTruthy();
    expect(UNSAFE_queryByType(ScrollView)).toBeNull();
  });
});

describe("Tabs", () => {
  const tabs = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ];

  it("highlights the active tab", () => {
    const { getByText } = render(
      <Tabs tabs={tabs} active="a" onChange={jest.fn()} />,
    );
    expect(getByText("Alpha")).toHaveStyle({ color: "#ffffff" });
    expect(getByText("Beta")).toHaveStyle({ color: "#94a3b8" });
  });

  it("reports the selected tab", () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <Tabs tabs={tabs} active="a" onChange={onChange} />,
    );
    fireEvent.press(getByText("Beta"));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});

describe("Button variants", () => {
  it.each([
    ["primary", "#4f46e5"],
    ["secondary", "#475569"],
    ["danger", "#dc2626"],
    ["success", "#16a34a"],
  ])("renders the %s variant", (variant, bg) => {
    const { getByText } = render(
      <Button title="Go" variant={variant} onPress={jest.fn()} />,
    );
    expect(styleOf(getByText("Go"), "backgroundColor")).toBe(bg);
  });

  it("falls back to the primary variant and md size for unknown values", () => {
    const { getByText } = render(
      <Button title="Go" variant="weird" size="huge" onPress={jest.fn()} />,
    );
    expect(styleOf(getByText("Go"), "backgroundColor")).toBe("#4f46e5");
  });

  it.each([
    ["sm", 13],
    ["md", 15],
    ["lg", 17],
  ])("sizes text for %s", (size, fontSize) => {
    const { getByText } = render(
      <Button title="Go" size={size} onPress={jest.fn()} />,
    );
    expect(getByText("Go")).toHaveStyle({ fontSize });
  });

  it("renders an icon, and hides the title while loading", () => {
    const { getByText, queryByText, rerender } = render(
      <Button title="Go" icon="add" onPress={jest.fn()} />,
    );
    expect(getByText("Go")).toBeTruthy();
    rerender(<Button title="Go" icon="add" isLoading onPress={jest.fn()} />);
    expect(queryByText("Go")).toBeNull();
  });

  it("does not fire when disabled or loading", () => {
    const onPress = jest.fn();
    const { getByText, rerender } = render(
      <Button title="Go" isDisabled onPress={onPress} />,
    );
    fireEvent.press(getByText("Go"));
    expect(onPress).not.toHaveBeenCalled();
    rerender(<Button title="Go" isLoading onPress={onPress} testID="b" />);
  });

  it("fires when enabled", () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Go" onPress={onPress} />);
    fireEvent.press(getByText("Go"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("Card extras", () => {
  it("renders an image, icon, title and subtitle", () => {
    const { getByText, UNSAFE_getByType } = render(
      <Card
        title="T"
        subtitle="S"
        icon="home"
        imageUri="https://example.com/a.png"
      >
        <Text>child</Text>
      </Card>,
    );
    expect(getByText("T")).toBeTruthy();
    expect(getByText("S")).toBeTruthy();
    expect(getByText("child")).toBeTruthy();
    expect(
      UNSAFE_getByType(require("react-native").Image).props.source,
    ).toEqual({ uri: "https://example.com/a.png" });
  });

  it("is pressable only when onPress is supplied", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Card title="T" onPress={onPress}>
        <Text>child</Text>
      </Card>,
    );
    fireEvent.press(getByText("child"));
    expect(onPress).toHaveBeenCalled();
  });

  it("renders children without a title row", () => {
    const { queryByText, getByText } = render(
      <Card>
        <Text>only</Text>
      </Card>,
    );
    expect(getByText("only")).toBeTruthy();
    expect(queryByText("T")).toBeNull();
  });
});

describe("Input extras", () => {
  it("shows an error instead of a hint and an icon", () => {
    const { getByText, queryByText } = render(
      <Input
        label="Email"
        icon="mail"
        error="Bad"
        hint="Hint"
        value=""
        onChangeText={jest.fn()}
      />,
    );
    expect(getByText("Bad")).toBeTruthy();
    expect(queryByText("Hint")).toBeNull();
  });

  it("shows the hint when there is no error", () => {
    const { getByText } = render(
      <Input hint="Hint" value="" onChangeText={jest.fn()} />,
    );
    expect(getByText("Hint")).toBeTruthy();
  });

  it("supports a right icon action, secure entry and multiline", () => {
    const onRight = jest.fn();
    const { UNSAFE_getAllByType, getByTestId } = render(
      <Input
        testID="field"
        isSecure
        multiline
        numberOfLines={3}
        editable={false}
        rightIcon="eye"
        onRightIconPress={onRight}
        value="x"
        onChangeText={jest.fn()}
      />,
    );
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0]);
    expect(onRight).toHaveBeenCalled();
    const input = getByTestId("field");
    expect(input.props.secureTextEntry).toBe(true);
    expect(input.props.editable).toBe(false);
  });

  it("forwards text, focus and blur events", () => {
    const onChangeText = jest.fn();
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const { getByTestId } = render(
      <Input
        testID="field"
        value=""
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
      />,
    );
    fireEvent(getByTestId("field"), "focus");
    fireEvent.changeText(getByTestId("field"), "abc");
    fireEvent(getByTestId("field"), "blur");
    expect(onFocus).toHaveBeenCalled();
    expect(onChangeText).toHaveBeenCalledWith("abc");
    expect(onBlur).toHaveBeenCalled();
  });
});

describe("theme colors", () => {
  it("defines light and dark palettes with matching keys", () => {
    expect(Object.keys(colors.light)).toEqual(Object.keys(colors.dark));
    expect(colors.primary).toBe("#4f46e5");
  });

  it("provides a chart palette of hex colors", () => {
    expect(chartPalette.length).toBeGreaterThanOrEqual(6);
    chartPalette.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/));
  });
});
