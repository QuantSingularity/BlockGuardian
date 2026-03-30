import "react-native-get-random-values";
import "@walletconnect/react-native-compat";
import { WalletConnectModal } from "@walletconnect/modal-react-native";
import AppNavigator from "./src/navigation/AppNavigator";

// --- WalletConnect Configuration ---
// Get project ID from environment variables or use demo ID
const projectId =
  process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "demo-project-id-change-this";

const providerMetadata = {
  name: process.env.EXPO_PUBLIC_APP_NAME || "BlockGuardian Mobile",
  description:
    "BlockGuardian Mobile App - Secure your crypto assets and monitor blockchain security.",
  url: process.env.EXPO_PUBLIC_APP_URL || "https://blockguardian.io",
  icons: [
    process.env.EXPO_PUBLIC_APP_ICON_URL || "https://blockguardian.io/icon.png",
  ],
  redirect: {
    native: `${process.env.EXPO_PUBLIC_DEEP_LINK_SCHEME || "blockguardian"}://`,
    universal: process.env.EXPO_PUBLIC_APP_URL || "https://blockguardian.io",
  },
};

// Session parameters for WalletConnect
const sessionParams = {
  namespaces: {
    eip155: {
      methods: [
        "eth_sendTransaction",
        "eth_signTransaction",
        "eth_sign",
        "personal_sign",
        "eth_signTypedData",
      ],
      chains: ["eip155:1"], // Ethereum Mainnet
      events: ["accountsChanged", "chainChanged"],
      rpcMap: {},
    },
  },
};
// --- End WalletConnect Configuration ---

export default function App() {
  return (
    <>
      <AppNavigator />
      <WalletConnectModal
        projectId={projectId}
        providerMetadata={providerMetadata}
        sessionParams={sessionParams}
      />
    </>
  );
}
