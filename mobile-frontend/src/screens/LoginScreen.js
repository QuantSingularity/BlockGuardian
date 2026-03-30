import { Ionicons } from "@expo/vector-icons"; // Import icons
import { styled } from "nativewind";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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
const StyledKeyboardAvoidingView = styled(KeyboardAvoidingView);
const StyledScrollView = styled(ScrollView);

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Placeholder login logic
  const handleLogin = () => {
    // Add actual authentication logic here
    console.log("Login attempt with:", username, password);
    // Navigate to Dashboard after successful login (replace with actual logic)
    navigation.replace("Dashboard"); // Use replace to prevent going back to Login
  };

  return (
    <StyledKeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <StyledScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        className="bg-gradient-to-b from-gray-900 to-gray-800"
        keyboardShouldPersistTaps="handled"
      >
        <StyledView className="items-center p-8">
          {/* App Logo/Icon Placeholder */}
          <Ionicons
            name="shield-checkmark"
            size={80}
            color="#4f46e5"
            style={{ marginBottom: 30 }}
          />

          <StyledText className="text-4xl font-bold mb-8 text-white text-center">
            BlockGuardian
          </StyledText>

          {/* Username Input */}
          <StyledView className="w-full flex-row items-center bg-gray-700 rounded-lg px-4 mb-4 border border-gray-600">
            <Ionicons
              name="person-outline"
              size={20}
              color="#9ca3af"
              style={{ marginRight: 10 }}
            />
            <StyledTextInput
              className="flex-1 h-14 text-white text-lg"
              placeholder="Username or Email"
              placeholderTextColor="#9ca3af" // gray-400
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </StyledView>

          {/* Password Input */}
          <StyledView className="w-full flex-row items-center bg-gray-700 rounded-lg px-4 mb-6 border border-gray-600">
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#9ca3af"
              style={{ marginRight: 10 }}
            />
            <StyledTextInput
              className="flex-1 h-14 text-white text-lg"
              placeholder="Password"
              placeholderTextColor="#9ca3af" // gray-400
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </StyledView>

          {/* Login Button */}
          <StyledTouchableOpacity
            className="w-full bg-indigo-600 rounded-lg py-4 mb-6 shadow-md active:bg-indigo-700"
            onPress={handleLogin}
          >
            <StyledText className="text-center text-white text-lg font-semibold">
              Login
            </StyledText>
          </StyledTouchableOpacity>

          {/* Links */}
          <StyledView className="flex-row justify-between w-full">
            <StyledTouchableOpacity
              onPress={() => console.log("Forgot Password pressed")}
            >
              <StyledText className="text-indigo-400">
                Forgot Password?
              </StyledText>
            </StyledTouchableOpacity>
            <StyledTouchableOpacity
              onPress={() => console.log("Register pressed")}
            >
              <StyledText className="text-indigo-400">Register</StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      </StyledScrollView>
    </StyledKeyboardAvoidingView>
  );
};

export default LoginScreen;
