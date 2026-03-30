import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

/**
 * Custom Button component with various styles and states
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Button text
 * @param {string} props.variant - Button style variant ('primary', 'secondary', 'danger', 'success', 'outline')
 * @param {string} props.size - Button size ('sm', 'md', 'lg')
 * @param {boolean} props.isLoading - Whether to show loading indicator
 * @param {boolean} props.isDisabled - Whether button is disabled
 * @param {string} props.icon - Ionicons icon name
 * @param {Function} props.onPress - Button press handler
 * @param {string} props.className - Additional tailwind classes
 */
const Button = ({
  title,
  variant = "primary",
  size = "md",
  isLoading = false,
  isDisabled = false,
  icon,
  onPress,
  className = "",
}) => {
  // Variant styles
  const variantStyles = {
    primary: "bg-indigo-600 active:bg-indigo-700",
    secondary: "bg-gray-600 active:bg-gray-700",
    danger: "bg-red-600 active:bg-red-700",
    success: "bg-green-600 active:bg-green-700",
    outline: "bg-transparent border border-gray-400 active:bg-gray-800",
  };

  // Size styles
  const sizeStyles = {
    sm: "px-3 py-1.5 rounded text-sm",
    md: "px-4 py-2 rounded-lg text-base",
    lg: "px-6 py-3 rounded-xl text-lg",
  };

  // Text color based on variant
  const textColor = variant === "outline" ? "text-white" : "text-white";

  // Disabled state
  const disabledStyle = isDisabled ? "opacity-50" : "";

  return (
    <StyledTouchableOpacity
      className={`${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyle} flex-row items-center justify-center ${className}`}
      onPress={onPress}
      disabled={isDisabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={size === "sm" ? 16 : size === "md" ? 18 : 22}
              color="white"
              style={{ marginRight: 8 }}
            />
          )}
          <StyledText className={`font-semibold ${textColor}`}>
            {title}
          </StyledText>
        </>
      )}
    </StyledTouchableOpacity>
  );
};

export default Button;
