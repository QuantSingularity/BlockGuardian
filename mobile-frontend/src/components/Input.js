import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import { Text, TextInput, View } from "react-native";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);

/**
 * Custom Input component with various styles and states
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Input label
 * @param {string} props.placeholder - Input placeholder
 * @param {string} props.value - Input value
 * @param {Function} props.onChangeText - Text change handler
 * @param {boolean} props.isSecure - Whether input is for password
 * @param {string} props.icon - Ionicons icon name
 * @param {string} props.error - Error message
 * @param {string} props.keyboardType - Keyboard type
 * @param {string} props.className - Additional tailwind classes
 */
const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  isSecure = false,
  icon,
  error,
  keyboardType = "default",
  className = "",
}) => {
  return (
    <StyledView className={`mb-4 ${className}`}>
      {label && (
        <StyledText className="text-gray-300 mb-1 font-medium">
          {label}
        </StyledText>
      )}

      <StyledView
        className={`flex-row items-center bg-gray-700 rounded-lg border ${error ? "border-red-500" : "border-gray-600"} px-3 py-2`}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color="#9ca3af"
            style={{ marginRight: 8 }}
          />
        )}

        <StyledTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          className="flex-1 text-white text-base"
        />
      </StyledView>

      {error && (
        <StyledText className="text-red-500 text-sm mt-1">{error}</StyledText>
      )}
    </StyledView>
  );
};

export default Input;
