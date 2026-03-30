import { styled } from "nativewind";
import { FlatList, ScrollView, Text, View } from "react-native";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledFlatList = styled(FlatList);

// Placeholder data for portfolio assets
const portfolioAssets = [
  {
    id: "1",
    name: "Bitcoin",
    symbol: "BTC",
    amount: 0.5,
    value: 30000,
    change: "+2.5%",
  },
  {
    id: "2",
    name: "Ethereum",
    symbol: "ETH",
    amount: 10,
    value: 20000,
    change: "-1.2%",
  },
  {
    id: "3",
    name: "Cardano",
    symbol: "ADA",
    amount: 5000,
    value: 2500,
    change: "+5.0%",
  },
  {
    id: "4",
    name: "Solana",
    symbol: "SOL",
    amount: 100,
    value: 4000,
    change: "+3.1%",
  },
];

const PortfolioScreen = ({ navigation }) => {
  const renderAsset = ({ item }) => (
    <StyledView className="flex-row justify-between items-center p-4 mb-3 bg-gray-700 rounded-lg border border-gray-600">
      <StyledView className="flex-row items-center">
        {/* Placeholder for asset icon */}
        <StyledView className="w-10 h-10 rounded-full bg-indigo-500 items-center justify-center mr-3">
          <StyledText className="text-white font-bold text-lg">
            {item.symbol[0]}
          </StyledText>
        </StyledView>
        <StyledView>
          <StyledText className="text-white font-semibold text-lg">
            {item.name}
          </StyledText>
          <StyledText className="text-gray-400 text-sm">
            {item.amount} {item.symbol}
          </StyledText>
        </StyledView>
      </StyledView>
      <StyledView className="items-end">
        <StyledText className="text-white font-semibold text-lg">
          ${item.value.toLocaleString()}
        </StyledText>
        <StyledText
          className={`text-sm ${item.change.startsWith("+") ? "text-green-400" : "text-red-400"}`}
        >
          {item.change}
        </StyledText>
      </StyledView>
    </StyledView>
  );

  return (
    <StyledScrollView className="flex-1 bg-gradient-to-b from-gray-900 to-gray-800">
      <StyledView className="p-6 pt-12">
        <StyledText className="text-3xl font-bold text-white mb-4">
          Portfolio
        </StyledText>

        {/* Total Portfolio Value */}
        <StyledView className="bg-indigo-600 p-5 rounded-lg mb-8 shadow-md">
          <StyledText className="text-white text-lg mb-1">
            Total Value
          </StyledText>
          <StyledText className="text-white text-4xl font-bold">
            $56,500
          </StyledText>{" "}
          {/* Placeholder value */}
          <StyledText className="text-green-300 text-lg mt-1">
            + $1,200 (24h)
          </StyledText>{" "}
          {/* Placeholder change */}
        </StyledView>

        {/* Asset List */}
        <StyledText className="text-xl font-semibold text-white mb-4">
          Your Assets
        </StyledText>
        <StyledFlatList
          data={portfolioAssets}
          renderItem={renderAsset}
          keyExtractor={(item) => item.id}
          scrollEnabled={false} // Disable FlatList scrolling since it's inside ScrollView
        />
      </StyledView>
    </StyledScrollView>
  );
};

export default PortfolioScreen;
