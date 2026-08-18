import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { CoupleVendor } from "@smitten/shared";
import { AppSymbol } from "./AppSymbol";
import { cardShadow, colors, fonts } from "../theme";

const appFont = fonts.regular;
const mediumFont = fonts.medium;
const headingFont = fonts.semibold;
const boldFont = fonts.bold;

type Props = {
  vendor: CoupleVendor;
  saved: boolean;
  onSave: () => void;
  onView: () => void;
  fullWidth?: boolean;
  score?: number;
  darkMode?: boolean;
};

export function VendorCard({ vendor, saved, onSave, onView, fullWidth = false, score, darkMode = false }: Props) {
  return (
    <View style={[styles.card, fullWidth && styles.fullWidth, darkMode && styles.cardDark]}>
      <View style={[styles.imageWrap, fullWidth && styles.fullImage]}>
        <Image source={{ uri: vendor.image }} style={styles.image} resizeMode="cover" alt={`${vendor.name} wedding portfolio`} />
        <View style={styles.badge}>
          <AppSymbol name={score ? "wand.and.stars" : "checkmark.seal"} fallback={score ? "sparkles" : "checkmark-circle-outline"} size={12} color={colors.plum} type="monochrome" weight="regular" />
          <Text style={styles.badgeText}>{score ? `${score}% Smitten match` : "Verified"}</Text>
        </View>
        <Pressable
          onPress={onSave}
          accessibilityRole="button"
          accessibilityLabel={saved ? `Remove ${vendor.name} from saved vendors` : `Save ${vendor.name}`}
          style={[styles.saveButton, saved && styles.saveButtonActive]}
        >
          <AppSymbol name={saved ? "heart.fill" : "heart"} fallback={saved ? "heart" : "heart-outline"} size={19} color={saved ? colors.white : colors.coral} weight="semibold" animationSpec={saved ? { effect: { type: "bounce", wholeSymbol: true }, repeating: false } : undefined} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{vendor.category}</Text>
          <Text style={styles.tier}>{vendor.tier}</Text>
        </View>
        <Text style={[styles.name, darkMode && styles.textDark]} numberOfLines={1}>{vendor.name}</Text>
        <View style={styles.detailRow}>
          <View style={styles.locationRow}><AppSymbol name="location.fill" fallback="location-outline" size={11} color={colors.muted} /><Text style={styles.location}>{vendor.location}</Text></View>
          <View style={styles.ratingRow}><AppSymbol name="star.fill" fallback="star" size={10} color={colors.gold} /><Text style={styles.rating}>{vendor.rating} <Text style={styles.reviews}>({vendor.reviews})</Text></Text></View>
        </View>
        {fullWidth && <Text style={[styles.reason, darkMode && styles.mutedDark]} numberOfLines={2}>{vendor.reason}</Text>}
        <View style={styles.footer}>
          <Text style={[styles.price, darkMode && styles.textDark]}>{vendor.price}</Text>
          <Pressable onPress={onView} accessibilityRole="button" accessibilityLabel={`View ${vendor.name} profile`} style={styles.viewButton}><Text style={[styles.viewText, darkMode && styles.textDark]}>View profile</Text><View style={styles.viewArrow}><AppSymbol name="arrow.up.right" fallback="arrow-up" size={12} color={colors.white} weight="semibold" /></View></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 286, overflow: "hidden", borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, ...cardShadow },
  fullWidth: { width: "100%" },
  cardDark: { backgroundColor: colors.surfaceDark },
  imageWrap: { height: 210, position: "relative", backgroundColor: colors.blush },
  fullImage: { height: 248 },
  image: { width: "100%", height: "100%" },
  badge: { position: "absolute", top: 14, left: 14, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 11, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(254,254,252,0.9)" },
  badgeText: { color: colors.plum, fontFamily: headingFont, fontSize: 9, lineHeight: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  saveButton: { position: "absolute", right: 14, top: 14, width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(254,254,252,0.92)" },
  saveButtonActive: { backgroundColor: colors.plum },
  body: { padding: 19 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  category: { color: colors.green, fontFamily: headingFont, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.82 },
  tier: { color: colors.ink, fontFamily: mediumFont, fontSize: 9, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 10, backgroundColor: colors.mint },
  name: { color: colors.ink, fontFamily: headingFont, fontSize: 24, lineHeight: 29, letterSpacing: -0.58, marginTop: 10 },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  location: { color: colors.muted, fontFamily: appFont, fontSize: 11 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  rating: { color: colors.gold, fontFamily: boldFont, fontSize: 11 },
  reviews: { color: colors.muted, fontFamily: appFont },
  reason: { color: colors.muted, fontFamily: appFont, fontSize: 12, lineHeight: 18, marginTop: 13 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 15 },
  price: { color: colors.ink, fontFamily: headingFont, fontSize: 14 },
  viewButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  viewText: { color: colors.ink, fontFamily: mediumFont, fontSize: 11 },
  viewArrow: { width: 28, height: 28, borderRadius: 10, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  textDark: { color: colors.white },
  mutedDark: { color: "#AAA8B0" }
});
