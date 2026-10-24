import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MfaSetupModal from "../../components/account/MfaSetupModal";
import { authAPI } from "../../services/api";

const mockToast = { success: jest.fn(), error: jest.fn() };

jest.mock("../../context/ToastContext", () => ({
  useToast: () => mockToast,
}));

jest.mock("../../services/api", () => ({
  authAPI: { setupMfa: jest.fn(), enableMfa: jest.fn() },
}));

const setupData = {
  qr_code: "QRDATA",
  secret: "SECRET123",
  backup_codes: ["code-one", "code-two"],
};

const renderModal = (props = {}) => {
  const onClose = jest.fn();
  const onEnabled = jest.fn();
  const view = render(
    <MfaSetupModal isOpen onClose={onClose} onEnabled={onEnabled} {...props} />,
  );
  return { onClose, onEnabled, ...view };
};

beforeEach(() => {
  jest.clearAllMocks();
  authAPI.setupMfa.mockResolvedValue(setupData);
});

describe("MfaSetupModal", () => {
  it("does not start setup while closed", () => {
    render(<MfaSetupModal isOpen={false} onClose={jest.fn()} />);
    expect(authAPI.setupMfa).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("starts setup when opened and shows the QR code and secret", async () => {
    renderModal();
    const img = await screen.findByAltText("MFA QR code");
    expect(img).toHaveAttribute("src", "data:image/png;base64,QRDATA");
    expect(screen.getByText("SECRET123")).toBeInTheDocument();
    expect(authAPI.setupMfa).toHaveBeenCalledTimes(1);
  });

  it("shows an error and lets the user retry", async () => {
    authAPI.setupMfa.mockRejectedValueOnce(new Error("Setup failed"));
    renderModal();
    expect(await screen.findByText("Setup failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByAltText("MFA QR code")).toBeInTheDocument();
    expect(authAPI.setupMfa).toHaveBeenCalledTimes(2);
  });

  it("uses a generic message when the error has none", async () => {
    authAPI.setupMfa.mockRejectedValueOnce({});
    renderModal();
    expect(
      await screen.findByText("Failed to start MFA setup"),
    ).toBeInTheDocument();
  });

  it("strips non digits from the code input", async () => {
    renderModal();
    await screen.findByAltText("MFA QR code");
    const input = screen.getByLabelText("Verification code");
    fireEvent.change(input, { target: { value: "12ab34" } });
    expect(input).toHaveValue("1234");
  });

  it("requires a full code before verifying", async () => {
    renderModal();
    await screen.findByAltText("MFA QR code");
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify/ }));
    expect(
      await screen.findByText(
        "Enter the 6-digit code from your authenticator app",
      ),
    ).toBeInTheDocument();
    expect(authAPI.enableMfa).not.toHaveBeenCalled();
  });

  it("shows the server error for a wrong code", async () => {
    authAPI.enableMfa.mockRejectedValue(new Error("Wrong code"));
    renderModal();
    await screen.findByAltText("MFA QR code");
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify/ }));
    expect(await screen.findByText("Wrong code")).toBeInTheDocument();
  });

  it("uses a generic message for an unknown verification failure", async () => {
    authAPI.enableMfa.mockRejectedValue({});
    renderModal();
    await screen.findByAltText("MFA QR code");
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify/ }));
    expect(
      await screen.findByText("Invalid code, please try again"),
    ).toBeInTheDocument();
  });

  it("enables MFA, shows backup codes and finishes", async () => {
    authAPI.enableMfa.mockResolvedValue({});
    const { onClose, onEnabled } = renderModal();
    await screen.findByAltText("MFA QR code");
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: " 123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify/ }));

    expect(await screen.findByText("code-one")).toBeInTheDocument();
    expect(screen.getByText("code-two")).toBeInTheDocument();
    expect(authAPI.enableMfa).toHaveBeenCalledWith("123456");
    expect(mockToast.success).toHaveBeenCalledWith(
      "Two-factor authentication enabled",
    );

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onEnabled).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("finishes without an onEnabled callback", async () => {
    authAPI.enableMfa.mockResolvedValue({});
    const onClose = jest.fn();
    render(<MfaSetupModal isOpen onClose={onClose} />);
    await screen.findByAltText("MFA QR code");
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes through the dialog close button", async () => {
    const { onClose } = renderModal();
    await screen.findByAltText("MFA QR code");
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("restarts setup when reopened after closing", async () => {
    const { rerender, onClose } = renderModal();
    await screen.findByAltText("MFA QR code");
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    rerender(<MfaSetupModal isOpen={false} onClose={onClose} />);
    rerender(<MfaSetupModal isOpen onClose={onClose} />);
    await waitFor(() => expect(authAPI.setupMfa).toHaveBeenCalledTimes(2));
  });
});
