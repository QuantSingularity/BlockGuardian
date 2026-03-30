import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

/**
 * TransactionList component for displaying blockchain transactions
 *
 * @param {Object} props - Component props
 * @param {Array} props.transactions - Array of transaction objects
 * @param {Function} props.onTransactionPress - Handler for transaction press
 * @param {boolean} props.loading - Whether transactions are loading
 * @param {string} props.className - Additional tailwind classes
 */
const TransactionList = ({
  transactions = [],
  onTransactionPress,
  loading = false,
  className = "",
}) => {
  // Function to format transaction amount with appropriate color
  const formatAmount = (amount, type) => {
    const isPositive = type === "received";
    return (
      <StyledView className="flex-row items-center">
        <Ionicons
          name={isPositive ? "arrow-down-outline" : "arrow-up-outline"}
          size={16}
          color={isPositive ? "#10b981" : "#ef4444"}
        />
        <StyledText
          className={`ml-1 font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}
        >
          {isPositive ? "+" : "-"}
          {amount}
        </StyledText>
      </StyledView>
    );
  };

  // Function to format timestamp
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  // Function to truncate hash
  const truncateHash = (hash) => {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  // Render each transaction item
  const renderItem = ({ item }) => (
    <StyledTouchableOpacity
      className="bg-gray-800 p-4 rounded-lg mb-3 border border-gray-700"
      onPress={() => onTransactionPress?.(item)}
      activeOpacity={0.7}
    >
      <StyledView className="flex-row justify-between items-center mb-2">
        <StyledView className="flex-row items-center">
          <StyledView
            className={`w-10 h-10 rounded-full items-center justify-center ${item.type === "received" ? "bg-green-900/30" : "bg-red-900/30"}`}
          >
            <Ionicons
              name={
                item.type === "received"
                  ? "arrow-down-outline"
                  : "arrow-up-outline"
              }
              size={20}
              color={item.type === "received" ? "#10b981" : "#ef4444"}
            />
          </StyledView>
          <StyledView className="ml-3">
            <StyledText className="text-white font-medium">
              {item.type === "received" ? "Received" : "Sent"}
            </StyledText>
            <StyledText className="text-gray-400 text-xs">
              {formatDate(item.timestamp)}
            </StyledText>
          </StyledView>
        </StyledView>
        {formatAmount(item.amount, item.type)}
      </StyledView>

      <StyledView className="bg-gray-700/50 p-2 rounded">
        <StyledText className="text-gray-300 text-xs">
          Tx: {truncateHash(item.hash)}
        </StyledText>
      </StyledView>
    </StyledTouchableOpacity>
  );

  // Empty state when no transactions
  const EmptyState = () => (
    <StyledView className="items-center justify-center py-8">
      <Ionicons name="document-outline" size={48} color="#6b7280" />
      <StyledText className="text-gray-400 mt-2 text-center">
        No transactions found
      </StyledText>
    </StyledView>
  );

  return (
    <StyledView className={`${className}`}>
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.hash}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
      />
    </StyledView>
  );
};

export default TransactionList;
