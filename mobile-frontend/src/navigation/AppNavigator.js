import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AdminScreen from "../screens/AdminScreen";
import AIRecommendationsScreen from "../screens/AIRecommendationsScreen";
import BlockchainExplorerScreen from "../screens/BlockchainExplorerScreen";
import DashboardScreen from "../screens/DashboardScreen";
// Import screens
import LoginScreen from "../screens/LoginScreen";
import MarketAnalysisScreen from "../screens/MarketAnalysisScreen";
import PortfolioScreen from "../screens/PortfolioScreen";
import SecurityCheckScreen from "../screens/SecurityCheckScreen"; // Import the new screen

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          // Use a darker, more modern header style consistent with the screens
          headerStyle: {
            backgroundColor: "#1f2937", // gray-800
          },
          headerTintColor: "#ffffff", // White text
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerBackTitleVisible: false, // Hide back button text on iOS
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ headerShown: false }}
        />{" "}
        {/* Hide header for dashboard too */}
        <Stack.Screen name="Portfolio" component={PortfolioScreen} />
        <Stack.Screen
          name="MarketAnalysis"
          component={MarketAnalysisScreen}
          options={{ title: "Market Analysis" }}
        />
        <Stack.Screen
          name="BlockchainExplorer"
          component={BlockchainExplorerScreen}
          options={{ title: "Blockchain Explorer" }}
        />
        <Stack.Screen
          name="AIRecommendations"
          component={AIRecommendationsScreen}
          options={{ title: "AI Recommendations" }}
        />
        <Stack.Screen
          name="SecurityCheck"
          component={SecurityCheckScreen}
          options={{ title: "Security Check" }}
        />{" "}
        {/* Add the new screen */}
        <Stack.Screen
          name="Admin"
          component={AdminScreen}
          options={{ title: "Admin Panel" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
