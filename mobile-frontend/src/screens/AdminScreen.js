import { styled } from "nativewind";
import { Text, View } from "react-native";

const StyledView = styled(View);
const StyledText = styled(Text);

const AdminScreen = ({ navigation }) => {
  return (
    <StyledView className="flex-1 items-center p-5 bg-gray-900">
      <StyledText className="text-3xl font-bold mb-8 text-white">
        Admin Panel
      </StyledText>
      {/* Add admin controls and components here using NativeWind */}
      <StyledView className="w-full p-4 bg-gray-800 rounded-lg mb-4">
        <StyledText className="text-xl font-semibold text-white mb-2">
          User Management
        </StyledText>
        <StyledText className="text-gray-400">
          Admin controls for user management will be here.
        </StyledText>
      </StyledView>
      <StyledView className="w-full p-4 bg-gray-800 rounded-lg">
        <StyledText className="text-xl font-semibold text-white mb-2">
          System Settings
        </StyledText>
        <StyledText className="text-gray-400">
          Admin controls for system settings will be here.
        </StyledText>
      </StyledView>
    </StyledView>
  );
};

export default AdminScreen;
