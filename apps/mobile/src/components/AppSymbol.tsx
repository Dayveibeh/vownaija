import { Ionicons } from "@expo/vector-icons";
import { SymbolView, type AnimationSpec, type SFSymbol, type SymbolType, type SymbolWeight } from "expo-symbols";
import type { ColorValue, StyleProp, ViewStyle } from "react-native";

export type AppSymbolName = SFSymbol;
export type AppSymbolFallback = keyof typeof Ionicons.glyphMap;

type Props = {
  name: AppSymbolName;
  fallback: AppSymbolFallback;
  size?: number;
  color: ColorValue;
  colors?: ColorValue | ColorValue[];
  type?: SymbolType;
  weight?: SymbolWeight;
  animationSpec?: AnimationSpec;
  style?: StyleProp<ViewStyle>;
};

export function AppSymbol({
  name,
  fallback,
  size = 20,
  color,
  colors,
  type = "monochrome",
  weight = "regular",
  animationSpec,
  style,
}: Props) {
  return (
    <SymbolView
      name={name}
      fallback={<Ionicons name={fallback} size={size} color={color} />}
      size={size}
      tintColor={color}
      colors={colors}
      type={type}
      weight={weight}
      animationSpec={animationSpec}
      resizeMode="scaleAspectFit"
      style={[{ width: size, height: size }, style]}
    />
  );
}
