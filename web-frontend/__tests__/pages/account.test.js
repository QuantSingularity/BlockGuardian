import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AccountPage from "../../pages/account";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../services/api", () => ({
  authAPI: {
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    disableMfa: jest.fn(),
  },
}));

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("../../context/ToastContext", () => ({
  useToast: () => mockToast,
}));

jest.mock("../../components/layout/DashboardLayout", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ children }) => React.createElement("div", null, children),
  };
});

jest.mock("../../components/account/MfaSetupModal", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ isOpen, onClose, onEnabled }) =>
      isOpen
        ? React.createElement(
            "div",
            { role: "dialog" },
            React.createElement(
              "button",
              { onClick: onEnabled },
              "mfa-enabled",
            ),
            React.createElement("button", { onClick: onClose }, "mfa-close"),
          )
        : null,
  };
});

const setUser = jest.fn();

const user = {
  first_name: "Jane",
  last_name: "Doe",
  full_name: "Jane A. Doe",
  username: "jdoe",
  email: "jane@example.com",
  role: "investor",
  kyc_status: "verified",
  mfa_enabled: false,
  city: "Lahore",
  country: "PK",
  created_at: "2025-06-01T00:00:00Z",
};

const useUser = (overrides = {}) =>
  useAuth.mockReturnValue({ user: { ...user, ...overrides }, setUser });

const changeField = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const goToSecurity = () =>
  fireEvent.click(screen.getByRole("button", { name: "Security" }));

beforeEach(() => {
  jest.clearAllMocks();
  useUser();
});

describe("AccountPage summary", () => {
  it("renders nothing without a user", () => {
    useAuth.mockReturnValue({ user: null, setUser });
    const { container } = render(<AccountPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows identity details and status badges", () => {
    render(<AccountPage />);
    expect(screen.getByText("Jane A. Doe")).toBeInTheDocument();
    expect(screen.getByText(/@jdoe.*jane@example\.com/)).toBeInTheDocument();
    expect(screen.getByText("Investor")).toBeInTheDocument();
    expect(screen.getByText("KYC: Verified")).toHaveClass("badge-green");
    expect(screen.getByText("2FA Disabled")).toBeInTheDocument();
    expect(screen.getByText("Jun 1, 2025")).toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("falls back to first and last name and flags unverified KYC", () => {
    useUser({ full_name: undefined, kyc_status: "pending", mfa_enabled: true });
    render(<AccountPage />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("KYC: Pending")).toHaveClass("badge-yellow");
    expect(screen.getByText("2FA Enabled")).toBeInTheDocument();
  });
});

describe("ProfileForm", () => {
  it("pre-fills the editable fields and keeps sensitive ones blank", () => {
    render(<AccountPage />);
    expect(screen.getByLabelText(/First name/)).toHaveValue("Jane");
    expect(screen.getByLabelText(/Last name/)).toHaveValue("Doe");
    expect(screen.getByLabelText("City")).toHaveValue("Lahore");
    expect(screen.getByLabelText("Country")).toHaveValue("PK");
    expect(screen.getByLabelText("Phone number")).toHaveValue("");
    expect(screen.getByLabelText("Postal code")).toHaveValue("");
    expect(screen.getByLabelText("Street address")).toHaveValue("");
  });

  it("handles a user without optional fields", () => {
    useUser({
      first_name: undefined,
      last_name: undefined,
      city: undefined,
      country: undefined,
    });
    render(<AccountPage />);
    expect(screen.getByLabelText(/First name/)).toHaveValue("");
    expect(screen.getByLabelText("City")).toHaveValue("");
  });

  it("requires first and last name", async () => {
    render(<AccountPage />);
    changeField(/First name/, " ");
    changeField(/Last name/, "");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      await screen.findByText("First name is required"),
    ).toBeInTheDocument();
    expect(screen.getByText("Last name is required")).toBeInTheDocument();
    expect(authAPI.updateProfile).not.toHaveBeenCalled();
  });

  it("saves only the fields that were filled in", async () => {
    authAPI.updateProfile.mockResolvedValue({ ...user, city: "Karachi" });
    render(<AccountPage />);
    changeField("City", " Karachi ");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(setUser).toHaveBeenCalled());
    expect(authAPI.updateProfile).toHaveBeenCalledWith({
      first_name: "Jane",
      last_name: "Doe",
      city: "Karachi",
      country: "PK",
    });
    expect(mockToast.success).toHaveBeenCalledWith("Profile updated");
  });

  it("includes new phone and address details and then clears them", async () => {
    authAPI.updateProfile.mockResolvedValue(user);
    render(<AccountPage />);
    changeField("Phone number", " +92 300 1234567 ");
    changeField("Street address", " 1 Main St ");
    changeField("Postal code", " 54000 ");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    expect(authAPI.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        phone_number: "+92 300 1234567",
        address_line1: "1 Main St",
        postal_code: "54000",
      }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Phone number")).toHaveValue(""),
    );
    expect(screen.getByLabelText("Street address")).toHaveValue("");
    expect(screen.getByLabelText("Postal code")).toHaveValue("");
  });

  it("reports save failures", async () => {
    authAPI.updateProfile.mockRejectedValue(new Error("Rejected"));
    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Rejected"),
    );
    expect(setUser).not.toHaveBeenCalled();
  });

  it("uses a generic save error", async () => {
    authAPI.updateProfile.mockRejectedValue({});
    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Failed to update profile"),
    );
  });
});

describe("Change password", () => {
  const strong = "Str0ngPassw0rd!";

  const openCard = () => {
    render(<AccountPage />);
    goToSecurity();
  };

  it("switches between the profile and security tabs", () => {
    render(<AccountPage />);
    expect(screen.getByText("Personal information")).toBeInTheDocument();
    goToSecurity();
    expect(screen.queryByText("Personal information")).not.toBeInTheDocument();
    expect(screen.getByText("Change password")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Profile" }));
    expect(screen.getByText("Personal information")).toBeInTheDocument();
  });

  it("validates every field", async () => {
    openCard();
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    expect(
      await screen.findByText("Current password is required"),
    ).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(authAPI.changePassword).not.toHaveBeenCalled();
  });

  it("rejects mismatched confirmation", async () => {
    openCard();
    changeField("Current password", "old");
    changeField("New password", strong);
    changeField("Confirm new password", "other");
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    expect(
      await screen.findByText("Passwords do not match"),
    ).toBeInTheDocument();
  });

  it("changes the password and clears the form", async () => {
    authAPI.changePassword.mockResolvedValue({});
    openCard();
    changeField("Current password", "old-password");
    changeField("New password", strong);
    changeField("Confirm new password", strong);
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith(
        "Password changed successfully",
      ),
    );
    expect(authAPI.changePassword).toHaveBeenCalledWith("old-password", strong);
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
  });

  it("shows the backend error above the form", async () => {
    authAPI.changePassword.mockRejectedValue(
      new Error("Wrong current password"),
    );
    openCard();
    changeField("Current password", "bad");
    changeField("New password", strong);
    changeField("Confirm new password", strong);
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    expect(
      await screen.findByText("Wrong current password"),
    ).toBeInTheDocument();
  });

  it("uses a generic error message", async () => {
    authAPI.changePassword.mockRejectedValue({});
    openCard();
    changeField("Current password", "bad");
    changeField("New password", strong);
    changeField("Confirm new password", strong);
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    expect(
      await screen.findByText("Failed to change password"),
    ).toBeInTheDocument();
  });
});

describe("Two-factor authentication", () => {
  it("offers setup when disabled and applies the result", () => {
    render(<AccountPage />);
    goToSecurity();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Enable two-factor authentication" }),
    );
    fireEvent.click(screen.getByText("mfa-enabled"));
    expect(setUser).toHaveBeenCalledWith({ ...user, mfa_enabled: true });
    fireEvent.click(screen.getByText("mfa-close"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks for the password before disabling", () => {
    useUser({ mfa_enabled: true });
    render(<AccountPage />);
    goToSecurity();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Disable two-factor authentication" }),
    );
    expect(
      screen.getByLabelText(/Confirm your password to disable 2FA/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByLabelText(/Confirm your password to disable 2FA/),
    ).not.toBeInTheDocument();
  });

  it("disables 2FA after confirming the password", async () => {
    useUser({ mfa_enabled: true });
    authAPI.disableMfa.mockResolvedValue({});
    render(<AccountPage />);
    goToSecurity();
    fireEvent.click(
      screen.getByRole("button", { name: "Disable two-factor authentication" }),
    );
    changeField(/Confirm your password to disable 2FA/, "my-password");
    fireEvent.click(screen.getByRole("button", { name: "Disable 2FA" }));
    await waitFor(() =>
      expect(setUser).toHaveBeenCalledWith({
        ...user,
        mfa_enabled: false,
      }),
    );
    expect(authAPI.disableMfa).toHaveBeenCalledWith("my-password");
    expect(mockToast.success).toHaveBeenCalledWith(
      "Two-factor authentication disabled",
    );
  });

  it("shows an error when disabling fails", async () => {
    useUser({ mfa_enabled: true });
    authAPI.disableMfa.mockRejectedValue(new Error("Bad password"));
    render(<AccountPage />);
    goToSecurity();
    fireEvent.click(
      screen.getByRole("button", { name: "Disable two-factor authentication" }),
    );
    changeField(/Confirm your password to disable 2FA/, "nope");
    fireEvent.click(screen.getByRole("button", { name: "Disable 2FA" }));
    expect(await screen.findByText("Bad password")).toBeInTheDocument();
    expect(setUser).not.toHaveBeenCalled();
  });

  it("uses a generic error when disabling fails without a message", async () => {
    useUser({ mfa_enabled: true });
    authAPI.disableMfa.mockRejectedValue({});
    render(<AccountPage />);
    goToSecurity();
    fireEvent.click(
      screen.getByRole("button", { name: "Disable two-factor authentication" }),
    );
    changeField(/Confirm your password to disable 2FA/, "nope");
    fireEvent.click(screen.getByRole("button", { name: "Disable 2FA" }));
    expect(
      await screen.findByText("Failed to disable MFA"),
    ).toBeInTheDocument();
  });
});
