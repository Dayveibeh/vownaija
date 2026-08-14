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
          <Text style={styles.badgeText}>{score ? `${score}% Smitten match` : vendor.tier}</Text>
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
  card: { width: 286, overflow: "hidden", borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, ...cardShadow },
  fullWidth: { width: "100%" },
  cardDark: { backgroundColor: colors.surfaceDark },
  imageWrap: { height: 194, position: "relative", backgroundColor: colors.blush },
  fullImage: { height: 226 },
  image: { width: "100%", height: "100%" },
  badge: { position: "absolute", top: 13, left: 13, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: "rgba(28,25,23,0.05)", flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.82)" },
  badgeText: { color: colors.plum, fontFamily: headingFont, fontSize: 8, lineHeight: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  saveButton: { position: "absolute", right: 13, top: 13, width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: "rgba(28,25,23,0.05)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.84)" },
  saveButtonActive: { backgroundColor: colors.plum },
  body: { padding: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  category: { color: colors.muted, fontFamily: headingFont, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.72 },
  tier: { color: colors.ink, fontFamily: mediumFont, fontSize: 8, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.78)" },
  name: { color: colors.ink, fontFamily: headingFont, fontSize: 22, lineHeight: 27, letterSpacing: -0.44, marginTop: 9 },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  location: { color: colors.muted, fontFamily: appFont, fontSize: 10 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  rating: { color: colors.gold, fontFamily: boldFont, fontSize: 10 },
  reviews: { color: colors.muted, fontFamily: appFont },
  reason: { color: colors.muted, fontFamily: appFont, fontSize: 10, lineHeight: 16, marginTop: 12 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 13, marginTop: 13 },
  price: { color: colors.ink, fontFamily: headingFont, fontSize: 13 },
  viewButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  viewText: { color: colors.ink, fontFamily: mediumFont, fontSize: 9 },
  viewArrow: { width: 25, height: 25, borderRadius: 13, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  textDark: { color: colors.white },
  mutedDark: { color: "#AAA8B0" }
});
