import { Platform } from "react-native";

export const colors = {
  ink: "#121310",
  muted: "#74736D",
  plum: "#121310",
  plumDark: "#0E100D",
  coral: "#8B6758",
  blush: "#F1E7E1",
  cream: "#F6F5F1",
  white: "#FEFEFC",
  border: "rgba(18,19,16,0.09)",
  green: "#6D7659",
  gold: "#A87E3F",
  lavender: "#E8E3EC",
  lavenderSoft: "#F0EDF3",
  peach: "#EEDFD1",
  peachSoft: "#F5EBE1",
  blue: "#E1E8E8",
  mint: "#E3E9DD",
  pink: "#EEE1DE",
  input: "#ECEBE7",
  surfaceDark: "#1D1F1A"
};

const systemFont = Platform.select({ ios: "System", android: "sans-serif", default: "system-ui" }) ?? "System";

export const fonts = {
  regular: systemFont,
  medium: systemFont,
  semibold: systemFont,
  bold: systemFont
} as const;

export const cardShadow = {
  shadowColor: "#121310",
  shadowOpacity: 0.055,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3
};
