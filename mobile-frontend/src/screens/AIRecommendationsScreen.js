import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

// Placeholder data for recommendations
const recommendations = [
  {
    id: "1",
    type: "Investment",
    title: "Consider diversifying into DeFi",
    description:
      "AI analysis suggests potential growth in decentralized finance protocols.",
    risk: "Medium",
    icon: "cash-outline",
  },
  {
    id: "2",
    type: "Security",
    title: "Review Smart Contract Permissions",
    description:
      "An unused permission for a DApp was detected. Review and revoke if necessary.",
    risk: "Low",
    icon: "shield-checkmark-outline",
  },
  {
    id: "3",
    type: "Investment",
    title: "Potential Undervalued Asset: XYZ Token",
    description:
      "Based on recent on-chain activity and market sentiment, XYZ shows potential.",
    risk: "High",
    icon: "trending-up-outline",
  },
  {
    id: "4",
    type: "Security",
    title: "Phishing Alert: Fake Airdrop Detected",
    description:
      "A known phishing scam related to a fake airdrop is circulating. Do not connect your wallet.",
    risk: "Critical",
    icon: "warning-outline",
  },
];

const AIRecommendationsScreen = ({ navigation }) => {
  const getRiskColor = (risk) => {
    switch (risk.toLowerCase()) {
      case "low":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "high":
        return "text-orange-400";
      case "critical":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  const renderRecommendation = (item) => (
    <StyledTouchableOpacity
      key={item.id}
      className="bg-gray-700 rounded-lg p-4 mb-4 shadow-md border border-gray-600 active:bg-gray-600"
      onPress={() => console.log("Recommendation pressed:", item.title)} // Placeholder action
    >
      <StyledView className="flex-row items-center mb-2">
        <Ionicons
          name={item.icon}
          size={24}
          color="#4f46e5"
          style={{ marginRight: 10 }}
        />
        <StyledText
          className="text-lg font-semibold text-white flex-1"
          numberOfLines={1}
        >
          {item.title}
        </StyledText>
        <StyledText className={`font-bold ${getRiskColor(item.risk)}`}>
          {item.risk}
        </StyledText>
      </StyledView>
      <StyledText className="text-gray-300 text-sm ml-9">
        {item.description}
      </StyledText>
    </StyledTouchableOpacity>
  );

  return (
    <StyledScrollView className="flex-1 bg-gradient-to-b from-gray-900 to-gray-800">
      <StyledView className="p-6 pt-12">
        <StyledText className="text-3xl font-bold text-white mb-8">
          AI Recommendations
        </StyledText>

        {/* Recommendation List */}
        <StyledView className="mb-6">
          <StyledText className="text-xl font-semibold text-white mb-4">
            Personalized Insights
          </StyledText>
          {recommendations.map(renderRecommendation)}
        </StyledView>

        {/* Placeholder for overall risk score or summary */}
        <StyledView className="bg-gray-700 rounded-lg p-5 shadow-md border border-gray-600 items-center">
          <StyledText className="text-xl font-semibold text-white mb-2">
            Overall Portfolio Risk
          </StyledText>
          <StyledText className="text-3xl font-bold text-yellow-400">
            Medium
          </StyledText>
          <StyledText className="text-gray-400 mt-1 text-center">
            Based on current holdings and market volatility.
          </StyledText>
        </StyledView>
      </StyledView>
    </StyledScrollView>
  );
};

export default AIRecommendationsScreen;
