import { fireEvent, render, screen } from "@testing-library/react";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PasswordStrength from "../../components/ui/PasswordStrength";
import Select from "../../components/ui/Select";
import Spinner, { PageLoader } from "../../components/ui/Spinner";
import StatCard from "../../components/ui/StatCard";
import Tabs from "../../components/ui/Tabs";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";

describe("Button variants", () => {
  it.each([
    ["primary", "btn-primary"],
    ["secondary", "btn-secondary"],
    ["danger", "btn-danger"],
  ])("applies the %s class", (variant, cls) => {
    render(<Button variant={variant}>Go</Button>);
    expect(screen.getByRole("button")).toHaveClass(cls);
  });

  it("renders the ghost variant", () => {
    render(<Button variant="ghost">Go</Button>);
    expect(screen.getByRole("button")).toHaveClass("font-medium");
  });

  it("applies size and width modifiers", () => {
    render(
      <Button size="lg" fullWidth className="extra">
        Go
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("text-base", "w-full", "extra");
  });

  it("supports the small size", () => {
    render(<Button size="sm">Go</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-xs");
  });

  it("defaults to type button and accepts submit", () => {
    const { rerender } = render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
    rerender(<Button type="submit">Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("is disabled when disabled or loading", () => {
    const { rerender } = render(<Button disabled>Go</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
    rerender(<Button isLoading>Go</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("hides the icon while loading and shows it otherwise", () => {
    const icon = <span data-testid="icon" />;
    const { rerender } = render(<Button icon={icon}>Go</Button>);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    rerender(
      <Button icon={icon} isLoading>
        Go
      </Button>,
    );
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
  });
});

describe("Badge colors", () => {
  it.each([
    ["green", "badge-green"],
    ["red", "badge-red"],
    ["yellow", "badge-yellow"],
    ["blue", "badge-blue"],
    ["indigo", "badge-indigo"],
  ])("maps %s to %s", (color, cls) => {
    render(<Badge color={color}>x</Badge>);
    expect(screen.getByText("x")).toHaveClass(cls);
  });

  it("falls back to gray for unknown colors", () => {
    render(
      <Badge color="purple" className="more">
        x
      </Badge>,
    );
    expect(screen.getByText("x")).toHaveClass("bg-gray-100", "more");
  });
});

describe("EmptyState extras", () => {
  it("renders a custom icon and action", () => {
    render(
      <EmptyState
        title="Nothing"
        icon={<span data-testid="custom-icon" />}
        action={<button>Add</button>}
        className="wide"
      />,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});

describe("Card", () => {
  it("uses the base card class by default", () => {
    render(<Card>content</Card>);
    expect(screen.getByText("content")).toHaveClass("card", "p-6");
  });

  it("uses the hover class, custom padding and extra classes", () => {
    render(
      <Card hover padding="p-0" className="mine">
        content
      </Card>,
    );
    expect(screen.getByText("content")).toHaveClass(
      "card-hover",
      "p-0",
      "mine",
    );
  });

  it("renders as a custom element and forwards props", () => {
    render(
      <Card as="section" data-testid="sec">
        content
      </Card>,
    );
    expect(screen.getByTestId("sec").tagName).toBe("SECTION");
  });

  it("CardHeader shows title, optional subtitle and action", () => {
    const { rerender } = render(<CardHeader title="Title" />);
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.queryByText("Sub")).not.toBeInTheDocument();
    rerender(
      <CardHeader title="Title" subtitle="Sub" action={<button>Act</button>} />,
    );
    expect(screen.getByText("Sub")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Act" })).toBeInTheDocument();
  });
});

describe("Input", () => {
  it("links the label to the input and marks required fields", () => {
    render(<Input id="email" label="Email" required />);
    expect(screen.getByLabelText(/Email/)).toBe(
      document.getElementById("email"),
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("shows an error, flags aria-invalid and hides the hint", () => {
    render(<Input id="x" label="X" error="Bad" hint="Helpful" />);
    const input = screen.getByLabelText("X");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "x-error");
    expect(screen.getByText("Bad")).toHaveAttribute("id", "x-error");
    expect(screen.queryByText("Helpful")).not.toBeInTheDocument();
  });

  it("shows the hint when there is no error", () => {
    render(<Input id="x" label="X" hint="Helpful" />);
    expect(screen.getByText("Helpful")).toBeInTheDocument();
    expect(screen.getByLabelText("X")).toHaveAttribute("aria-invalid", "false");
  });

  it("renders a right element and widens the padding", () => {
    render(<Input id="x" label="X" rightElement={<button>eye</button>} />);
    expect(screen.getByRole("button", { name: "eye" })).toBeInTheDocument();
    expect(screen.getByLabelText("X")).toHaveClass("pr-11");
  });

  it("works without a label and forwards change events", () => {
    const onChange = jest.fn();
    render(<Input id="x" placeholder="type" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText("type"), {
      target: { value: "a" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("Select", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ];

  it("renders options, a placeholder and the required marker", () => {
    render(
      <Select
        id="s"
        label="Pick"
        required
        options={options}
        placeholder="Choose"
      />,
    );
    expect(screen.getByRole("option", { name: "Choose" })).toHaveValue("");
    expect(screen.getByRole("option", { name: "Alpha" })).toHaveValue("a");
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("omits the placeholder option when none is given", () => {
    render(<Select id="s" options={options} />);
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("fires onChange and shows an error", () => {
    const onChange = jest.fn();
    render(
      <Select
        id="s"
        label="Pick"
        options={options}
        onChange={onChange}
        error="Required"
      />,
    );
    fireEvent.change(screen.getByLabelText("Pick"), { target: { value: "b" } });
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders with no options", () => {
    render(<Select id="s" />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal isOpen={false} title="T">
        body
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders an accessible dialog when open", () => {
    render(
      <Modal isOpen title="My title" onClose={jest.fn()}>
        body
      </Modal>,
    );
    expect(
      screen.getByRole("dialog", { name: "My title" }),
    ).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("closes on the close button, the backdrop and Escape", () => {
    const onClose = jest.fn();
    const { container } = render(
      <Modal isOpen title="T" onClose={onClose}>
        body
      </Modal>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    fireEvent.click(container.querySelector("[aria-hidden='true']"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("ignores other keys", () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen title="T" onClose={onClose}>
        body
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not throw when Escape is pressed without an onClose handler", () => {
    render(
      <Modal isOpen title="T">
        body
      </Modal>,
    );
    expect(() => fireEvent.keyDown(document, { key: "Escape" })).not.toThrow();
  });

  it("locks body scroll while open and restores it on unmount", () => {
    const { unmount } = render(
      <Modal isOpen title="T" onClose={jest.fn()}>
        body
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("applies a custom max width", () => {
    render(
      <Modal isOpen title="T" maxWidth="max-w-sm" onClose={jest.fn()}>
        body
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("max-w-sm");
  });
});

describe("Spinner and PageLoader", () => {
  it("renders a spinner with a custom size", () => {
    const { container } = render(<Spinner size="h-4 w-4" className="x" />);
    expect(container.firstChild).toHaveClass("spinner", "h-4", "w-4", "x");
  });

  it("PageLoader shows a default and a custom label", () => {
    const { rerender } = render(<PageLoader />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    rerender(<PageLoader label="Please wait" />);
    expect(screen.getByText("Please wait")).toBeInTheDocument();
  });
});

describe("StatCard", () => {
  it("shows the label and value only when nothing else is given", () => {
    render(<StatCard label="Value" value="$10" />);
    expect(screen.getByText("Value")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
  });

  it("shows a positive change with an absolute percentage", () => {
    render(<StatCard label="L" value="v" change={2.5} />);
    const change = screen.getByText(/2\.50%/);
    expect(change).toHaveClass("stat-change-positive");
  });

  it("shows a negative change", () => {
    render(<StatCard label="L" value="v" change={-1.234} />);
    const change = screen.getByText(/1\.23%/);
    expect(change).toHaveClass("stat-change-negative");
  });

  it("treats zero as a positive change", () => {
    render(<StatCard label="L" value="v" change={0} />);
    expect(screen.getByText(/0\.00%/)).toHaveClass("stat-change-positive");
  });

  it("renders a subtitle and an icon", () => {
    render(
      <StatCard
        label="L"
        value="v"
        subtitle="Sub"
        icon={<span data-testid="ic" />}
      />,
    );
    expect(screen.getByText("Sub")).toBeInTheDocument();
    expect(screen.getByTestId("ic")).toBeInTheDocument();
  });

  it("ignores a non numeric change", () => {
    render(<StatCard label="L" value="v" change="abc" />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});

describe("Tabs", () => {
  const tabs = [
    { value: "a", label: "Alpha", count: 3 },
    { value: "b", label: "Beta" },
  ];

  it("marks only the active tab and shows counts", () => {
    render(<Tabs tabs={tabs} active="a" onChange={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Alpha/ })).toHaveClass(
      "tab-button-active",
    );
    expect(screen.getByRole("button", { name: /Beta/ })).toHaveClass(
      "tab-button-inactive",
    );
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("reports the selected tab value", () => {
    const onChange = jest.fn();
    render(<Tabs tabs={tabs} active="a" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Beta" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});

describe("PasswordStrength", () => {
  it("shows an empty bar for no password", () => {
    const { container } = render(<PasswordStrength />);
    expect(container.querySelector("[style]")).toHaveStyle({ width: "0%" });
    expect(container.querySelector(".bg-red-500")).toBeInTheDocument();
  });

  it("lists every rule", () => {
    render(<PasswordStrength password="" />);
    expect(screen.getByText("At least 12 characters")).toBeInTheDocument();
    expect(screen.getByText("One uppercase letter")).toBeInTheDocument();
    expect(screen.getByText("One lowercase letter")).toBeInTheDocument();
    expect(screen.getByText("One number")).toBeInTheDocument();
    expect(screen.getByText("One special character")).toBeInTheDocument();
  });

  it("uses amber for a medium password", () => {
    const { container } = render(<PasswordStrength password="Abcdefghijkl" />);
    expect(container.querySelector(".bg-amber-500")).toBeInTheDocument();
    expect(container.querySelector("[style]")).toHaveStyle({ width: "60%" });
  });

  it("uses emerald and a full bar when every rule passes", () => {
    const { container } = render(<PasswordStrength password="Abcdefghij1!" />);
    expect(container.querySelector(".bg-emerald-500")).toBeInTheDocument();
    expect(container.querySelector("[style]")).toHaveStyle({ width: "100%" });
  });
});
