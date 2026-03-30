import { Ionicons } from "@expo/vector-icons";
import { useWalletConnectModal } from "@walletconnect/modal-react-native"; // Import WalletConnect hook
import { styled } from "nativewind";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

// Define navigation items with icons and titles
const dashboardItems = [
  { name: "Portfolio", icon: "briefcase-outline", screen: "Portfolio" },
  {
    name: "Market Analysis",
    icon: "analytics-outline",
    screen: "MarketAnalysis",
  },
  {
    name: "Blockchain Explorer",
    icon: "search-circle-outline",
    screen: "BlockchainExplorer",
  },
  {
    name: "AI Recommendations",
    icon: "bulb-outline",
    screen: "AIRecommendations",
  },
  {
    name: "Security Check",
    icon: "shield-checkmark-outline",
    screen: "SecurityCheck",
  }, // Added Security Check link
  { name: "Admin Panel", icon: "settings-outline", screen: "Admin" },
];

const DashboardScreen = ({ navigation }) => {
  const { open, isConnected, address, provider } = useWalletConnectModal();

  const navigateToScreen = (screenName) => {
    navigation.navigate(screenName);
  };

  const handleConnectDisconnect = () => {
    if (isConnected) {
      provider?.disconnect();
    } else {
      open();
    }
  };

  // Function to format address for display
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <StyledScrollView className="flex-1 bg-gradient-to-b from-gray-900 to-gray-800">
      <StyledView className="p-6 pt-12">
        <StyledView className="flex-row justify-between items-center mb-8">
          <StyledText className="text-3xl font-bold text-white">
            Dashboard
          </StyledText>
          {/* Wallet Connect Button */}
          <StyledTouchableOpacity
            className={`px-4 py-2 rounded-lg flex-row items-center ${isConnected ? "bg-red-600" : "bg-indigo-600"} active:opacity-80`}
            onPress={handleConnectDisconnect}
          >
            <Ionicons
              name={isConnected ? "log-out-outline" : "wallet-outline"}
              size={18}
              color="white"
              style={{ marginRight: 8 }}
            />
            <StyledText className="text-white font-semibold">
              {isConnected ? "Disconnect" : "Connect Wallet"}
            </StyledText>
          </StyledTouchableOpacity>
        </StyledView>

        {/* Display Connected Address */}
        {isConnected && (
          <StyledView className="bg-gray-700 p-3 rounded-lg mb-6 border border-gray-600 items-center">
            <StyledText className="text-green-400 font-semibold">
              Connected: {formatAddress(address)}
            </StyledText>
          </StyledView>
        )}

        {/* Grid layout for navigation items */}
        <StyledView className="flex-row flex-wrap justify-between">
          {dashboardItems.map((item) => (
            <StyledTouchableOpacity
              key={item.name}
              className="w-[48%] bg-gray-700 rounded-lg p-4 mb-4 items-center shadow-md active:bg-gray-600 border border-gray-600"
              onPress={() => navigateToScreen(item.screen)}
            >
              <Ionicons
                name={item.icon}
                size={40}
                color="#4f46e5"
                style={{ marginBottom: 10 }}
              />
              <StyledText className="text-white text-center font-semibold text-base">
                {item.name}
              </StyledText>
            </StyledTouchableOpacity>
          ))}
        </StyledView>

        {/* Placeholder for other dashboard widgets */}
        <StyledView className="mt-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
          <StyledText className="text-xl font-semibold text-white mb-2">
            Account Summary
          </StyledText>
          <StyledText className="text-gray-400">
            Summary details will appear here...
          </StyledText>
        </StyledView>
      </StyledView>
    </StyledScrollView>
  );
};

export default DashboardScreen;
