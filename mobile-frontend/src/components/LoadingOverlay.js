import { styled } from "nativewind";
import { ActivityIndicator, Modal, Text, View } from "react-native";

const StyledView = styled(View);
const StyledText = styled(Text);

/**
 * Loading overlay component to display during async operations
 *
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether the loading overlay is visible
 * @param {string} props.message - Optional message to display
 * @param {string} props.className - Additional tailwind classes
 */
const LoadingOverlay = ({
  visible = false,
  message = "Loading...",
  className = "",
}) => {
  return (
    <Modal transparent={true} animationType="fade" visible={visible}>
      <StyledView
        className={`flex-1 justify-center items-center bg-black/70 ${className}`}
      >
        <StyledView className="bg-gray-800 p-6 rounded-xl items-center border border-gray-700">
          <ActivityIndicator size="large" color="#4f46e5" />
          <StyledText className="text-white font-medium mt-3">
            {message}
          </StyledText>
        </StyledView>
      </StyledView>
    </Modal>
  );
};

export default LoadingOverlay;
