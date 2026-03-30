import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);
const StyledTouchableOpacity = styled(TouchableOpacity);

/**
 * Card component for displaying content in a contained, styled box
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {string} props.subtitle - Optional subtitle
 * @param {string} props.imageUri - Optional image URI
 * @param {React.ReactNode} props.children - Card content
 * @param {Function} props.onPress - Optional press handler
 * @param {string} props.icon - Optional Ionicons icon name
 * @param {string} props.className - Additional tailwind classes
 */
const Card = ({
  title,
  subtitle,
  imageUri,
  children,
  onPress,
  icon,
  className = "",
}) => {
  const CardContainer = onPress ? StyledTouchableOpacity : StyledView;

  return (
    <CardContainer
      className={`bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-md mb-4 ${className}`}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {imageUri && (
        <StyledImage
          source={{ uri: imageUri }}
          className="w-full h-40"
          resizeMode="cover"
        />
      )}

      <StyledView className="p-4">
        <StyledView className="flex-row items-center mb-2">
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color="#4f46e5"
              style={{ marginRight: 8 }}
            />
          )}
          <StyledText className="text-white font-bold text-lg">
            {title}
          </StyledText>
        </StyledView>

        {subtitle && (
          <StyledText className="text-gray-400 text-sm mb-3">
            {subtitle}
          </StyledText>
        )}

        {children}
      </StyledView>
    </CardContainer>
  );
};

export default Card;
