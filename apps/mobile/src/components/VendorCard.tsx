import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { CoupleVendor } from "@vownaija/shared";
import { cardShadow, colors } from "../theme";

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
          <Ionicons name={score ? "sparkles" : "checkmark-circle"} size={12} color={colors.plum} />
          <Text style={styles.badgeText}>{score ? `${score}% Smitten match` : vendor.tier}</Text>
        </View>
        <Pressable
          onPress={onSave}
          accessibilityRole="button"
          accessibilityLabel={saved ? `Remove ${vendor.name} from saved vendors` : `Save ${vendor.name}`}
          style={[styles.saveButton, saved && styles.saveButtonActive]}
        >
          <Ionicons name={saved ? "heart" : "heart-outline"} size={19} color={saved ? colors.white : colors.coral} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{vendor.category}</Text>
          <Text style={styles.tier}>{vendor.tier}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>{vendor.name}</Text>
        <View style={styles.detailRow}>
          <Text style={styles.location}><Ionicons name="location-outline" size={12} /> {vendor.location}</Text>
          <Text style={styles.rating}>★ {vendor.rating} <Text style={styles.reviews}>({vendor.reviews})</Text></Text>
        </View>
        {fullWidth && <Text style={styles.reason} numberOfLines={2}>{vendor.reason}</Text>}
        <View style={styles.footer}>
          <Text style={styles.price}>{vendor.price}</Text>
          <Pressable onPress={onView} accessibilityRole="button" accessibilityLabel={`View ${vendor.name} profile`} style={styles.viewButton}><Text style={styles.viewText}>View profile</Text><Ionicons name="chevron-forward" size={15} color={colors.coral} /></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 286, overflow: "hidden", borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, ...cardShadow },
  fullWidth: { width: "100%" },
  imageWrap: { height: 188, position: "relative", backgroundColor: colors.blush },
  fullImage: { height: 215 },
  image: { width: "100%", height: "100%" },
  badge: { position: "absolute", top: 11, left: 11, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.94)" },
  badgeText: { color: colors.plum, fontSize: 8, lineHeight: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6 },
  saveButton: { position: "absolute", right: 11, top: 11, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.94)" },
  saveButtonActive: { backgroundColor: colors.plum },
  body: { padding: 16 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  category: { color: colors.coral, fontSize: 9, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  tier: { color: colors.muted, fontSize: 8, paddingVertical: 4, paddingHorizontal: 7, borderRadius: 10, backgroundColor: "#F3EBE7" },
  name: { color: colors.ink, fontFamily: "Georgia", fontSize: 21, fontWeight: "600", marginTop: 9 },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  location: { color: colors.muted, fontSize: 10 },
  rating: { color: colors.gold, fontSize: 10, fontWeight: "900" },
  reviews: { color: colors.muted, fontWeight: "400" },
  reason: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 12 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 13, marginTop: 13 },
  price: { color: colors.ink, fontFamily: "Georgia", fontSize: 13, fontWeight: "600" },
  viewButton: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewText: { color: colors.coral, fontSize: 9, fontWeight: "800" }
});
