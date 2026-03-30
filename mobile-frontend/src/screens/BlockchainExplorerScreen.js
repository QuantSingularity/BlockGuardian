import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import { useState } from "react";
import {
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledFlatList = styled(FlatList);

// Placeholder data for latest transactions
const latestTransactions = [
  {
    id: "1",
    hash: "0xabc...",
    from: "0x123...",
    to: "0x456...",
    value: "1.5 ETH",
    time: "2m ago",
  },
  {
    id: "2",
    hash: "0xdef...",
    from: "0x789...",
    to: "0xabc...",
    value: "0.8 ETH",
    time: "5m ago",
  },
  {
    id: "3",
    hash: "0xghi...",
    from: "0x456...",
    to: "0x123...",
    value: "2.1 ETH",
    time: "8m ago",
  },
];

const BlockchainExplorerScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    console.log("Searching blockchain for:", searchQuery);
    // Add actual blockchain search logic here
  };

  const renderTransaction = ({ item }) => (
    <StyledTouchableOpacity className="p-4 mb-3 bg-gray-700 rounded-lg border border-gray-600 active:bg-gray-600">
      <StyledView className="flex-row justify-between mb-1">
        <StyledText
          className="text-white font-semibold text-sm w-1/2"
          numberOfLines={1}
        >
          Hash: {item.hash}
        </StyledText>
        <StyledText className="text-gray-400 text-xs">{item.time}</StyledText>
      </StyledView>
      <StyledText className="text-gray-300 text-xs mb-1" numberOfLines={1}>
        From: {item.from}
      </StyledText>
      <StyledText className="text-gray-300 text-xs mb-1" numberOfLines={1}>
        To: {item.to}
      </StyledText>
      <StyledText className="text-white font-bold text-right">
        {item.value}
      </StyledText>
    </StyledTouchableOpacity>
  );

  return (
    <StyledScrollView className="flex-1 bg-gradient-to-b from-gray-900 to-gray-800">
      <StyledView className="p-6 pt-12">
        <StyledText className="text-3xl font-bold text-white mb-8">
          Blockchain Explorer
        </StyledText>

        {/* Search Bar */}
        <StyledView className="flex-row items-center bg-gray-700 rounded-lg px-4 mb-6 border border-gray-600">
          <Ionicons
            name="search-outline"
            size={20}
            color="#9ca3af"
            style={{ marginRight: 10 }}
          />
          <StyledTextInput
            className="flex-1 h-14 text-white text-lg"
            placeholder="Search Address / Tx Hash / Block..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch} // Trigger search on submit
          />
          <StyledTouchableOpacity onPress={handleSearch} className="p-2">
            <Ionicons name="arrow-forward-outline" size={24} color="#4f46e5" />
          </StyledTouchableOpacity>
        </StyledView>

        {/* Latest Transactions/Blocks Section */}
        <StyledView className="mb-6">
          <StyledText className="text-xl font-semibold text-white mb-4">
            Latest Transactions
          </StyledText>
          <StyledFlatList
            data={latestTransactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            scrollEnabled={false} // Disable FlatList scrolling
          />
        </StyledView>

        {/* Placeholder for other explorer features */}
        <StyledView className="bg-gray-700 rounded-lg p-5 shadow-md border border-gray-600">
          <StyledView className="flex-row items-center mb-3">
            <Ionicons
              name="cube-outline"
              size={24}
              color="#4f46e5"
              style={{ marginRight: 10 }}
            />
            <StyledText className="text-xl font-semibold text-white">
              Network Status
            </StyledText>
          </StyledView>
          <StyledText className="text-gray-400">
            Network status details (e.g., latest block number, gas price) will
            appear here...
          </StyledText>
        </StyledView>
      </StyledView>
    </StyledScrollView>
  );
};

export default BlockchainExplorerScreen;
