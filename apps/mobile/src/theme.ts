import { Platform } from "react-native";

export const colors = {
  ink: "#352A2A",
  muted: "#786662",
  plum: "#713B49",
  plumDark: "#3C202A",
  coral: "#713B49",
  blush: "#F1E5E7",
  cream: "#FAF8F4",
  white: "#FFFDF9",
  border: "#DFD6CC",
  green: "#6D7659",
  gold: "#A87E3F",
  lavender: "#E8E3EC",
  lavenderSoft: "#F0EDF3",
  peach: "#EEDFD1",
  peachSoft: "#F5EBE1",
  blue: "#E1E8E8",
  mint: "#E3E9DD",
  pink: "#EEE1DE",
  input: "#EEE8DF",
  surfaceDark: "#2D2328",
};

const systemFont =
  Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "system-ui",
  }) ?? "System";

export const fonts = {
  regular: systemFont,
  medium: systemFont,
  semibold: systemFont,
  bold: systemFont,
  editorial:
    Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" }) ??
    "Georgia",
} as const;

export const cardShadow = {
  shadowColor: "#3C202A",
  shadowOpacity: 0.035,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 1,
};
