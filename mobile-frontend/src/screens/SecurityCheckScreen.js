import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const SecurityCheckScreen = ({ navigation }) => {
  const [addressToCheck, setAddressToCheck] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null); // null | { risk: 'Low' | 'Medium' | 'High' | 'Critical', message: string }

  // Placeholder security check logic
  const handleCheckAddress = () => {
    if (!addressToCheck.trim()) {
      Alert.alert("Input Required", "Please enter an address to check.");
      return;
    }
    setIsLoading(true);
    setResult(null);
    console.log("Checking address:", addressToCheck);

    // Simulate API call / check
    setTimeout(() => {
      // Basic placeholder logic: Mark addresses starting with '0xbad' as high risk
      if (addressToCheck.toLowerCase().startsWith("0xbad")) {
        setResult({
          risk: "High",
          message:
            "This address is associated with potentially risky activity. Proceed with caution.",
        });
      } else if (addressToCheck.length < 40) {
        // Simple validation example
        setResult({
          risk: "Critical",
          message: "Invalid address format.",
        });
      } else {
        setResult({
          risk: "Low",
          message:
            "No immediate risks detected for this address based on our basic scan.",
        });
      }
      setIsLoading(false);
    }, 1500); // Simulate network delay
  };

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
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

  const getRiskIcon = (risk) => {
    switch (risk?.toLowerCase()) {
      case "low":
        return "checkmark-circle-outline";
      case "medium":
        return "alert-circle-outline";
      case "high":
        return "warning-outline";
      case "critical":
        return "close-circle-outline";
      default:
        return "help-circle-outline";
    }
  };

  return (
    <StyledScrollView className="flex-1 bg-gradient-to-b from-gray-900 to-gray-800">
      <StyledView className="p-6 pt-12">
        <StyledText className="text-3xl font-bold text-white mb-8">
          Security Check
        </StyledText>

        {/* Address Input */}
        <StyledView className="mb-6">
          <StyledText className="text-lg font-semibold text-white mb-2">
            Enter Address to Check
          </StyledText>
          <StyledView className="flex-row items-center bg-gray-700 rounded-lg px-4 border border-gray-600">
            <Ionicons
              name="search-outline"
              size={20}
              color="#9ca3af"
              style={{ marginRight: 10 }}
            />
            <StyledTextInput
              className="flex-1 h-14 text-white text-lg"
              placeholder="Enter wallet address..."
              placeholderTextColor="#9ca3af"
              value={addressToCheck}
              onChangeText={setAddressToCheck}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </StyledView>
        </StyledView>

        {/* Check Button */}
        <StyledTouchableOpacity
          className={`w-full rounded-lg py-4 mb-8 shadow-md flex-row justify-center items-center ${isLoading ? "bg-gray-500" : "bg-indigo-600 active:bg-indigo-700"}`}
          onPress={handleCheckAddress}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color="#ffffff"
              style={{ marginRight: 10 }}
            />
          ) : (
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="white"
              style={{ marginRight: 10 }}
            />
          )}
          <StyledText className="text-center text-white text-lg font-semibold">
            {isLoading ? "Checking..." : "Check Address Security"}
          </StyledText>
        </StyledTouchableOpacity>

        {/* Results Area */}
        {result && (
          <StyledView className="bg-gray-700 rounded-lg p-5 shadow-md border border-gray-600">
            <StyledView className="flex-row items-center mb-3">
              <Ionicons
                name={getRiskIcon(result.risk)}
                size={28}
                color={getRiskColor(result.risk).replace("text-", "")}
                style={{ marginRight: 12 }}
              />
              <StyledText className="text-xl font-semibold text-white">
                Scan Result
              </StyledText>
            </StyledView>
            <StyledText
              className={`text-2xl font-bold mb-2 ${getRiskColor(result.risk)}`}
            >
              Risk Level: {result.risk}
            </StyledText>
            <StyledText className="text-gray-300 text-base">
              {result.message}
            </StyledText>
          </StyledView>
        )}
      </StyledView>
    </StyledScrollView>
  );
};

export default SecurityCheckScreen;
