import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import { Text, TouchableOpacity, View } from "react-native";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

/**
 * WalletCard component for displaying wallet information
 *
 * @param {Object} props - Component props
 * @param {string} props.address - Wallet address
 * @param {string} props.balance - Wallet balance
 * @param {string} props.currency - Currency symbol
 * @param {Function} props.onDisconnect - Disconnect handler
 * @param {Function} props.onViewDetails - View details handler
 * @param {string} props.className - Additional tailwind classes
 */
const WalletCard = ({
  address,
  balance,
  currency = "ETH",
  onDisconnect,
  onViewDetails,
  className = "",
}) => {
  // Function to format address for display
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <StyledView
      className={`bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-md ${className}`}
    >
      <StyledView className="flex-row justify-between items-center mb-3">
        <StyledView className="flex-row items-center">
          <StyledView className="w-10 h-10 rounded-full bg-indigo-900/30 items-center justify-center mr-3">
            <Ionicons name="wallet-outline" size={20} color="#818cf8" />
          </StyledView>
          <StyledText className="text-white font-bold text-lg">
            My Wallet
          </StyledText>
        </StyledView>

        <StyledTouchableOpacity
          onPress={onDisconnect}
          className="bg-red-600/20 px-3 py-1 rounded-full"
          activeOpacity={0.7}
        >
          <StyledText className="text-red-400 font-medium text-sm">
            Disconnect
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>

      <StyledView className="bg-gray-700/50 p-3 rounded-lg mb-4">
        <StyledText className="text-gray-400 text-sm mb-1">Address</StyledText>
        <StyledText className="text-white font-medium">
          {formatAddress(address)}
        </StyledText>
      </StyledView>

      <StyledView className="bg-gray-700/50 p-3 rounded-lg mb-4">
        <StyledText className="text-gray-400 text-sm mb-1">Balance</StyledText>
        <StyledText className="text-white font-bold text-xl">
          {balance}{" "}
          <StyledText className="text-indigo-400">{currency}</StyledText>
        </StyledText>
      </StyledView>

      <StyledTouchableOpacity
        onPress={onViewDetails}
        className="bg-indigo-600 py-2 rounded-lg items-center"
        activeOpacity={0.7}
      >
        <StyledText className="text-white font-medium">View Details</StyledText>
      </StyledTouchableOpacity>
    </StyledView>
  );
};

export default WalletCard;
