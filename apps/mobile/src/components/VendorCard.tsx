import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { CoupleVendor } from "@smitten/shared";
import { AppSymbol } from "./AppSymbol";
import { cardShadow, colors } from "../theme";

const appFont = Platform.OS === "ios" ? "System" : "sans-serif";

type Props = {
  vendor: CoupleVendor;
  saved: boolean;
  onSave: () => void;
  onView: () => void;
  fullWidth?: boolean;
  score?: number;
};

export function VendorCard({ vendor, saved, onSave, onView, fullWidth = false, score }: Props) {
  return (
    <View style={[styles.card, fullWidth && styles.fullWidth]}>
      <View style={[styles.imageWrap, fullWidth && styles.fullImage]}>
        <Image source={{ uri: vendor.image }} style={styles.image} resizeMode="cover" alt={`${vendor.name} wedding portfolio`} />
        <View style={styles.badge}>
          <AppSymbol name={score ? "wand.and.stars" : "checkmark.seal.fill"} fallback={score ? "sparkles" : "checkmark-circle"} size={12} color={colors.plum} type="hierarchical" weight="semibold" />
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
        <Text style={styles.name} numberOfLines={1}>{vendor.name}</Text>
        <View style={styles.detailRow}>
          <View style={styles.locationRow}><AppSymbol name="location.fill" fallback="location-outline" size={11} color={colors.muted} /><Text style={styles.location}>{vendor.location}</Text></View>
          <View style={styles.ratingRow}><AppSymbol name="star.fill" fallback="star" size={10} color={colors.gold} /><Text style={styles.rating}>{vendor.rating} <Text style={styles.reviews}>({vendor.reviews})</Text></Text></View>
        </View>
        {fullWidth && <Text style={styles.reason} numberOfLines={2}>{vendor.reason}</Text>}
        <View style={styles.footer}>
          <Text style={styles.price}>{vendor.price}</Text>
          <Pressable onPress={onView} accessibilityRole="button" accessibilityLabel={`View ${vendor.name} profile`} style={styles.viewButton}><Text style={styles.viewText}>View profile</Text><AppSymbol name="chevron.right" fallback="chevron-forward" size={12} color={colors.coral} weight="semibold" /></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 286, overflow: "hidden", borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, ...cardShadow },
  fullWidth: { width: "100%" },
  imageWrap: { height: 188, position: "relative", backgroundColor: colors.blush },
  fullImage: { height: 215 },
  image: { width: "100%", height: "100%" },
  badge: { position: "absolute", top: 11, left: 11, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.94)" },
  badgeText: { color: colors.plum, fontSize: 8, lineHeight: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  saveButton: { position: "absolute", right: 11, top: 11, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.94)" },
  saveButtonActive: { backgroundColor: colors.plum },
  body: { padding: 16 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  category: { color: colors.muted, fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.7 },
  tier: { color: colors.muted, fontSize: 8, paddingVertical: 4, paddingHorizontal: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FAFAFA" },
  name: { color: colors.ink, fontFamily: appFont, fontSize: 20, fontWeight: "600", marginTop: 9 },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  location: { color: colors.muted, fontSize: 10 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  rating: { color: colors.gold, fontSize: 10, fontWeight: "700" },
  reviews: { color: colors.muted, fontWeight: "400" },
  reason: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 12 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 13, marginTop: 13 },
  price: { color: colors.ink, fontFamily: appFont, fontSize: 13, fontWeight: "600" },
  viewButton: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewText: { color: colors.ink, fontSize: 9, fontWeight: "600" }
});
