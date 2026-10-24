import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { TextInput } from "react-native";
import HomeScreen from "../../src/screens/HomeScreen";
import LoginScreen from "../../src/screens/LoginScreen";
import RegisterScreen from "../../src/screens/RegisterScreen";
import { useAuth } from "../../src/context/AuthContext";

jest.mock("../../src/context/AuthContext", () => ({ useAuth: jest.fn() }));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
};

jest.mock("../../src/context/ToastContext", () => ({
  useToast: () => mockToast,
}));

const navigation = { navigate: jest.fn(), reset: jest.fn() };
const login = jest.fn();
const register = jest.fn();
const inputs = (screen) => screen.UNSAFE_getAllByType(TextInput);

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({
    login,
    register,
    isAuthenticated: false,
    isLoading: false,
  });
});

describe("HomeScreen", () => {
  it("presents the brand, headline and every feature", () => {
    const screen = render(<HomeScreen navigation={navigation} />);
    expect(screen.getByText("BlockGuardian")).toBeTruthy();
    expect(screen.getByText("Multi-asset portfolios")).toBeTruthy();
    expect(screen.getByText("Real-time performance")).toBeTruthy();
    expect(screen.getByText("Risk monitoring")).toBeTruthy();
    expect(screen.getByText("Bank-grade security")).toBeTruthy();
  });

  it("offers registration and sign in to visitors", () => {
    const screen = render(<HomeScreen navigation={navigation} />);
    fireEvent.press(screen.getByText("Create free account"));
    expect(navigation.navigate).toHaveBeenCalledWith("Register");
    fireEvent.press(screen.getByText("Sign in"));
    expect(navigation.navigate).toHaveBeenCalledWith("Login");
  });

  it("offers the dashboard to signed in users", () => {
    useAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    const screen = render(<HomeScreen navigation={navigation} />);
    expect(screen.queryByText("Create free account")).toBeNull();
    fireEvent.press(screen.getByText("Go to Dashboard"));
    expect(navigation.navigate).toHaveBeenCalledWith("Main");
  });
});

describe("LoginScreen", () => {
  const fill = (screen, email, password) => {
    fireEvent.changeText(inputs(screen)[0], email);
    fireEvent.changeText(inputs(screen)[1], password);
  };

  it("renders the form and links to registration", () => {
    const screen = render(<LoginScreen navigation={navigation} />);
    expect(screen.getByText("Welcome back")).toBeTruthy();
    fireEvent.press(screen.getByText("Create one for free"));
    expect(navigation.navigate).toHaveBeenCalledWith("Register");
  });

  it("flags both empty fields", async () => {
    const screen = render(<LoginScreen navigation={navigation} />);
    fireEvent.press(screen.getByText("Sign in"));
    expect(await screen.findByText("Email is required")).toBeTruthy();
    expect(screen.getByText("Password is required")).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });

  it("flags only the missing field", async () => {
    const screen = render(<LoginScreen navigation={navigation} />);
    fireEvent.changeText(inputs(screen)[0], "a@b.co");
    fireEvent.press(screen.getByText("Sign in"));
    expect(await screen.findByText("Password is required")).toBeTruthy();
    expect(screen.queryByText("Email is required")).toBeNull();
  });

  it("toggles password visibility", () => {
    const screen = render(<LoginScreen navigation={navigation} />);
    expect(inputs(screen)[1].props.secureTextEntry).toBe(true);
    fireEvent.press(screen.UNSAFE_getByProps({ name: "eye-outline" }));
    expect(inputs(screen)[1].props.secureTextEntry).toBe(false);
    fireEvent.press(screen.UNSAFE_getByProps({ name: "eye-off-outline" }));
    expect(inputs(screen)[1].props.secureTextEntry).toBe(true);
  });

  it("signs in, greets the user and resets to the main tabs", async () => {
    login.mockResolvedValue({
      mfaRequired: false,
      user: { first_name: "Jane" },
    });
    const screen = render(<LoginScreen navigation={navigation} />);
    fill(screen, "  jane@example.com ", "Secret123!");
    fireEvent.press(screen.getByText("Sign in"));
    await waitFor(() =>
      expect(navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: "Main" }],
      }),
    );
    expect(login).toHaveBeenCalledWith(
      "jane@example.com",
      "Secret123!",
      undefined,
    );
    expect(mockToast.success).toHaveBeenCalledWith("Welcome back, Jane!");
  });

  it("greets with a fallback name", async () => {
    login.mockResolvedValue({ mfaRequired: false, user: {} });
    const screen = render(<LoginScreen navigation={navigation} />);
    fill(screen, "a@b.co", "pw");
    fireEvent.press(screen.getByText("Sign in"));
    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith("Welcome back, there!"),
    );
  });

  it("shows the backend error, a lockout message and a generic fallback", async () => {
    const screen = render(<LoginScreen navigation={navigation} />);
    fill(screen, "a@b.co", "bad");
    login.mockRejectedValueOnce(new Error("Invalid email or password."));
    fireEvent.press(screen.getByText("Sign in"));
    expect(await screen.findByText("Invalid email or password.")).toBeTruthy();
    login.mockRejectedValueOnce(Object.assign(new Error("x"), { status: 423 }));
    fireEvent.press(screen.getByText("Sign in"));
    expect(await screen.findByText(/temporarily locked/)).toBeTruthy();
    login.mockRejectedValueOnce({});
    fireEvent.press(screen.getByText("Sign in"));
    expect(
      await screen.findByText("Unable to sign in. Please try again."),
    ).toBeTruthy();
    expect(navigation.reset).not.toHaveBeenCalled();
  });

  describe("two-factor step", () => {
    const reachMfa = async () => {
      login.mockResolvedValueOnce({ mfaRequired: true });
      const screen = render(<LoginScreen navigation={navigation} />);
      fill(screen, "a@b.co", "pw");
      fireEvent.press(screen.getByText("Sign in"));
      await screen.findByText("Two-factor verification");
      return screen;
    };

    it("asks for a code when required", async () => {
      await reachMfa();
      expect(mockToast.info).toHaveBeenCalledWith(
        "Enter your two-factor authentication code to continue.",
      );
      expect(navigation.reset).not.toHaveBeenCalled();
    });

    it("strips non digits and rejects a short code", async () => {
      const screen = await reachMfa();
      fireEvent.changeText(inputs(screen)[0], "12ab3");
      expect(inputs(screen)[0].props.value).toBe("123");
      fireEvent.press(screen.getByText("Verify & sign in"));
      expect(
        await screen.findByText(
          "Enter the 6-digit code from your authenticator app",
        ),
      ).toBeTruthy();
      expect(login).toHaveBeenCalledTimes(1);
    });

    it("signs in with the code", async () => {
      const screen = await reachMfa();
      login.mockResolvedValueOnce({ mfaRequired: false, user: {} });
      fireEvent.changeText(inputs(screen)[0], "654321");
      fireEvent.press(screen.getByText("Verify & sign in"));
      await waitFor(() => expect(navigation.reset).toHaveBeenCalled());
      expect(login).toHaveBeenLastCalledWith("a@b.co", "pw", "654321");
    });

    it("can go back to the credentials step", async () => {
      const screen = await reachMfa();
      fireEvent.press(screen.getByText(/Back to email/));
      expect(screen.getByText("Welcome back")).toBeTruthy();
    });
  });
});

describe("RegisterScreen", () => {
  const STRONG = "Str0ngPassw0rd!";

  const fillValid = (screen) => {
    const f = inputs(screen);
    fireEvent.changeText(f[0], "Jane");
    fireEvent.changeText(f[1], "Doe");
    fireEvent.changeText(f[2], " Jane@Example.com ");
    fireEvent.changeText(f[3], " jane_doe ");
    fireEvent.changeText(f[5], STRONG);
    fireEvent.changeText(f[6], STRONG);
    fireEvent.press(screen.getByText(/I agree to the Terms/));
  };

  it("renders the form and links to sign in", () => {
    const screen = render(<RegisterScreen navigation={navigation} />);
    expect(screen.getByText("Create your account")).toBeTruthy();
    expect(screen.getByText("United States")).toBeTruthy();
    fireEvent.press(screen.getByText("Sign in"));
    expect(navigation.navigate).toHaveBeenCalledWith("Login");
  });

  it("validates every required field", async () => {
    const screen = render(<RegisterScreen navigation={navigation} />);
    fireEvent.press(screen.getByText("Create account"));
    expect(await screen.findByText("First name is required")).toBeTruthy();
    expect(screen.getByText("Last name is required")).toBeTruthy();
    expect(screen.getByText("Email is required")).toBeTruthy();
    expect(screen.getByText("Username is required")).toBeTruthy();
    expect(screen.getByText("Password is required")).toBeTruthy();
    expect(
      screen.getByText("You must accept the terms to continue"),
    ).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  it("rejects an invalid email and a weak password", async () => {
    const screen = render(<RegisterScreen navigation={navigation} />);
    fireEvent.changeText(inputs(screen)[2], "nope");
    fireEvent.changeText(inputs(screen)[5], "short");
    fireEvent.press(screen.getByText("Create account"));
    expect(await screen.findByText("Enter a valid email address")).toBeTruthy();
    expect(screen.getByText(/At least 12 characters is required/)).toBeTruthy();
  });

  it("rejects mismatched passwords", async () => {
    const screen = render(<RegisterScreen navigation={navigation} />);
    fillValid(screen);
    fireEvent.changeText(inputs(screen)[6], "Different1!Pass");
    fireEvent.press(screen.getByText("Create account"));
    expect(await screen.findByText("Passwords do not match")).toBeTruthy();
  });

  it("hides the username hint once there is a username error", async () => {
    const screen = render(<RegisterScreen navigation={navigation} />);
    expect(screen.getByText(/3-32 characters: letters, numbers/)).toBeTruthy();
    fireEvent.press(screen.getByText("Create account"));
    await screen.findByText("Username is required");
    expect(screen.queryByText(/3-32 characters: letters, numbers/)).toBeNull();
  });

  it.each([
    ["a", "#ef4444"],
    ["Abcdefghijkl", "#f59e0b"],
    [STRONG, "#10b981"],
  ])("colors the strength bar for %s", (password, color) => {
    const screen = render(<RegisterScreen navigation={navigation} />);
    fireEvent.changeText(inputs(screen)[5], password);
    expect(JSON.stringify(screen.toJSON())).toContain(color);
  });

  it("toggles password visibility", () => {
    const screen = render(<RegisterScreen navigation={navigation} />);
    expect(inputs(screen)[5].props.secureTextEntry).toBe(true);
    fireEvent.press(screen.UNSAFE_getByProps({ name: "eye-outline" }));
    expect(inputs(screen)[5].props.secureTextEntry).toBe(false);
  });

  it("submits a normalised payload and resets to the main tabs", async () => {
    register.mockResolvedValue({ first_name: "Jane" });
    const screen = render(<RegisterScreen navigation={navigation} />);
    fillValid(screen);
    fireEvent.changeText(inputs(screen)[4], " +1 555 0100 ");
    fireEvent.press(screen.getByText("United States"));
    fireEvent.press(screen.getByText("Pakistan"));
    fireEvent.press(screen.getByText("Create account"));
    await waitFor(() => expect(navigation.reset).toHaveBeenCalled());
    expect(register).toHaveBeenCalledWith({
      email: "jane@example.com",
      username: "jane_doe",
      password: STRONG,
      first_name: "Jane",
      last_name: "Doe",
      country: "PK",
      phone_number: "+1 555 0100",
    });
    expect(mockToast.success).toHaveBeenCalledWith(
      "Welcome to BlockGuardian, Jane!",
    );
  });

  it("omits an empty phone number", async () => {
    register.mockResolvedValue({ first_name: "Jane" });
    const screen = render(<RegisterScreen navigation={navigation} />);
    fillValid(screen);
    fireEvent.press(screen.getByText("Create account"));
    await waitFor(() => expect(register).toHaveBeenCalled());
    expect(register.mock.calls[0][0].phone_number).toBeUndefined();
  });

  it("unchecks the terms when pressed twice", async () => {
    const screen = render(<RegisterScreen navigation={navigation} />);
    fireEvent.press(screen.getByText(/I agree to the Terms/));
    fireEvent.press(screen.getByText(/I agree to the Terms/));
    fireEvent.press(screen.getByText("Create account"));
    expect(
      await screen.findByText("You must accept the terms to continue"),
    ).toBeTruthy();
  });

  it("maps backend field errors onto the matching input", async () => {
    register.mockRejectedValue(
      Object.assign(new Error("Email already registered"), { field: "email" }),
    );
    const screen = render(<RegisterScreen navigation={navigation} />);
    fillValid(screen);
    fireEvent.press(screen.getByText("Create account"));
    expect(await screen.findByText("Email already registered")).toBeTruthy();
    expect(navigation.reset).not.toHaveBeenCalled();
  });

  it("maps snake case backend fields", async () => {
    register.mockRejectedValue(
      Object.assign(new Error("Bad first name"), { field: "first_name" }),
    );
    const screen = render(<RegisterScreen navigation={navigation} />);
    fillValid(screen);
    fireEvent.press(screen.getByText("Create account"));
    expect(await screen.findByText("Bad first name")).toBeTruthy();
  });

  it("shows a form level error for unmapped failures", async () => {
    register.mockRejectedValueOnce(new Error("Server exploded"));
    const screen = render(<RegisterScreen navigation={navigation} />);
    fillValid(screen);
    fireEvent.press(screen.getByText("Create account"));
    expect(await screen.findByText("Server exploded")).toBeTruthy();
    register.mockRejectedValueOnce({});
    fireEvent.press(screen.getByText("Create account"));
    expect(
      await screen.findByText("Registration failed. Please try again."),
    ).toBeTruthy();
  });
});
