import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import { ScrollView, Text, View } from "react-native";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);

const MarketAnalysisScreen = ({ navigation }) => {
  return (
    <StyledScrollView className="flex-1 bg-gradient-to-b from-gray-900 to-gray-800">
      <StyledView className="p-6 pt-12">
        <StyledText className="text-3xl font-bold text-white mb-8">
          Market Analysis
        </StyledText>

        {/* Market Overview Card */}
        <StyledView className="bg-gray-700 rounded-lg p-5 mb-6 shadow-md border border-gray-600">
          <StyledView className="flex-row items-center mb-3">
            <Ionicons
              name="trending-up-outline"
              size={24}
              color="#4f46e5"
              style={{ marginRight: 10 }}
            />
            <StyledText className="text-xl font-semibold text-white">
              Market Overview
            </StyledText>
          </StyledView>
          {/* Placeholder for Market Chart */}
          <StyledView className="h-40 bg-gray-600 rounded-md items-center justify-center mb-3">
            <StyledText className="text-gray-400">
              Market Chart Placeholder
            </StyledText>
          </StyledView>
          <StyledText className="text-gray-400">
            Key market indicators and overall sentiment will be displayed here.
          </StyledText>
        </StyledView>

        {/* Trend Analysis Card */}
        <StyledView className="bg-gray-700 rounded-lg p-5 mb-6 shadow-md border border-gray-600">
          <StyledView className="flex-row items-center mb-3">
            <Ionicons
              name="pulse-outline"
              size={24}
              color="#4f46e5"
              style={{ marginRight: 10 }}
            />
            <StyledText className="text-xl font-semibold text-white">
              Trend Analysis
            </StyledText>
          </StyledView>
          {/* Placeholder for Trend Chart */}
          <StyledView className="h-40 bg-gray-600 rounded-md items-center justify-center mb-3">
            <StyledText className="text-gray-400">
              Trend Chart Placeholder
            </StyledText>
          </StyledView>
          <StyledText className="text-gray-400">
            Analysis of current market trends, potential opportunities, and
            risks.
          </StyledText>
        </StyledView>

        {/* Top Movers Card */}
        <StyledView className="bg-gray-700 rounded-lg p-5 shadow-md border border-gray-600">
          <StyledView className="flex-row items-center mb-3">
            <Ionicons
              name="rocket-outline"
              size={24}
              color="#4f46e5"
              style={{ marginRight: 10 }}
            />
            <StyledText className="text-xl font-semibold text-white">
              Top Movers
            </StyledText>
          </StyledView>
          {/* Placeholder for Top Movers List */}
          <StyledView className="mb-2 flex-row justify-between">
            <StyledText className="text-white">Bitcoin (BTC)</StyledText>
            <StyledText className="text-green-400">+3.5%</StyledText>
          </StyledView>
          <StyledView className="mb-2 flex-row justify-between">
            <StyledText className="text-white">Ethereum (ETH)</StyledText>
            <StyledText className="text-red-400">-1.1%</StyledText>
          </StyledView>
          <StyledView className="flex-row justify-between">
            <StyledText className="text-white">Solana (SOL)</StyledText>
            <StyledText className="text-green-400">+5.2%</StyledText>
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledScrollView>
  );
};

export default MarketAnalysisScreen;
