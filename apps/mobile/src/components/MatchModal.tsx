import { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { serviceOptions, styleOptions, weddingLocations, type VendorMatchPreferences } from "@smitten/shared";
import { AppSymbol, type AppSymbolFallback, type AppSymbolName } from "./AppSymbol";
import { colors } from "../theme";

const appFont = Platform.OS === "ios" ? "System" : "sans-serif";

export function MatchModal({ visible, onClose, onComplete }: { visible: boolean; onClose: () => void; onComplete: (preferences: VendorMatchPreferences) => void }) {
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState("Lagos");
  const [budgetCeiling, setBudgetCeiling] = useState(1000000);
  const [services, setServices] = useState<string[]>(["Planning & décor", "Photography"]);
  const [style, setStyle] = useState("Modern");
  const budgets = [
    { label: "Under ₦1m", value: 500000, detail: "Keep it lean" },
    { label: "₦1m–₦3m", value: 1000000, detail: "Value-focused" },
    { label: "₦3m–₦7m", value: 2200000, detail: "More flexibility" },
    { label: "₦7m+", value: 10000000, detail: "Premium & luxury" }
  ];

  function toggleService(service: string) {
    setServices((current) => current.includes(service) ? current.filter((item) => item !== service) : [...current, service]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.vowiMark}><AppSymbol name="wand.and.stars" fallback="sparkles" size={21} color={colors.white} type="hierarchical" weight="semibold" /></View>
          <View style={styles.headerCopy}><Text style={styles.kicker}>MEET SMITTEN AI</Text><Text style={styles.headerTitle}>Your wedding matchmaker</Text></View>
          <Pressable onPress={onClose} accessibilityRole="button"><Text style={styles.skip}>Skip for now</Text></Pressable>
        </View>
        <View style={styles.progress}><View style={[styles.progressFill, { width: `${((step + 1) / 3) * 100}%` }]} /></View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepLabel}>STEP {step + 1} OF 3</Text>
          {step === 0 && <>
            <Text style={styles.title}>Where are you celebrating?</Text>
            <Text style={styles.subtitle}>We’ll prioritise vendors who work in your area.</Text>
            <View style={styles.options}>{weddingLocations.map((item) => <Choice key={item} label={item} selected={location === item} symbol="location.fill" fallback="location-outline" onPress={() => setLocation(item)} />)}</View>
          </>}
          {step === 1 && <>
            <Text style={styles.title}>What are you comfortable spending?</Text>
            <Text style={styles.subtitle}>We’ll show strong options at your level, not pressure you to spend more.</Text>
            <View style={styles.options}>{budgets.map((item) => <Choice key={item.label} label={item.label} detail={item.detail} selected={budgetCeiling === item.value} onPress={() => setBudgetCeiling(item.value)} />)}</View>
            <Text style={styles.fieldTitle}>WHICH VENDORS DO YOU NEED?</Text>
            <View style={styles.pillRow}>{serviceOptions.map((service) => <Pressable key={service} onPress={() => toggleService(service)} style={[styles.pill, services.includes(service) && styles.pillSelected]}><Text style={[styles.pillText, services.includes(service) && styles.pillTextSelected]}>{service}</Text></Pressable>)}</View>
          </>}
          {step === 2 && <>
            <Text style={styles.title}>What should your wedding feel like?</Text>
            <Text style={styles.subtitle}>Pick the style closest to your vision.</Text>
            <View style={styles.options}>{styleOptions.map((item) => <Choice key={item} label={item} selected={style === item} symbol="sparkles" fallback="sparkles-outline" onPress={() => setStyle(item)} />)}</View>
            <View style={styles.summary}><AppSymbol name="wand.and.stars" fallback="sparkles" size={17} color={colors.plum} type="hierarchical" weight="medium" /><Text style={styles.summaryText}>Smitten will prioritise {location}, {style.toLowerCase()} style, your chosen budget and strong reviews.</Text></View>
          </>}
        </ScrollView>
        <View style={styles.actions}>
          {step > 0 ? <Pressable onPress={() => setStep(step - 1)} style={styles.back}><Text style={styles.backText}>Back</Text></Pressable> : <View />}
          <Pressable onPress={() => step < 2 ? setStep(step + 1) : onComplete({ location, budgetCeiling, services, style })} style={styles.continue}>
            <Text style={styles.continueText}>{step < 2 ? "Continue" : "Build my shortlist"}</Text><AppSymbol name={step < 2 ? "arrow.right" : "wand.and.stars"} fallback={step < 2 ? "arrow-forward" : "sparkles"} size={16} color={colors.white} weight="semibold" type={step < 2 ? "monochrome" : "hierarchical"} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Choice({ label, detail, selected, onPress, symbol, fallback }: { label: string; detail?: string; selected: boolean; onPress: () => void; symbol?: AppSymbolName; fallback?: AppSymbolFallback }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.choice, selected && styles.choiceSelected]}>{symbol && fallback ? <AppSymbol name={symbol} fallback={fallback} size={17} color={selected ? colors.plum : colors.muted} type={selected ? "hierarchical" : "monochrome"} weight={selected ? "medium" : "regular"} /> : null}<View style={styles.choiceCopy}><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>{detail ? <Text style={styles.choiceDetail}>{detail}</Text> : null}</View>{selected ? <AppSymbol name="checkmark.circle.fill" fallback="checkmark-circle" size={18} color={colors.coral} weight="semibold" /> : null}</Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingTop: 17 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 19 },
  vowiMark: { width: 43, height: 43, borderRadius: 8, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  kicker: { color: colors.muted, fontSize: 8, fontWeight: "600", letterSpacing: 1.1 },
  headerTitle: { color: colors.ink, fontSize: 12, fontWeight: "700", marginTop: 2 },
  skip: { color: colors.muted, fontSize: 10, paddingVertical: 10 },
  progress: { height: 4, marginTop: 19, backgroundColor: colors.border },
  progressFill: { height: 4, backgroundColor: colors.coral },
  content: { padding: 22, paddingBottom: 42 },
  stepLabel: { color: colors.muted, fontSize: 9, fontWeight: "600", letterSpacing: 1 },
  title: { color: colors.ink, fontFamily: appFont, fontSize: 33, lineHeight: 39, letterSpacing: -0.9, fontWeight: "600", marginTop: 10 },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 8, marginBottom: 23 },
  options: { gap: 9 },
  choice: { minHeight: 56, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 9 },
  choiceSelected: { borderColor: colors.ink, backgroundColor: colors.white },
  choiceCopy: { flex: 1 },
  choiceText: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  choiceTextSelected: { color: colors.plum, fontWeight: "700" },
  choiceDetail: { color: colors.muted, fontSize: 9, marginTop: 2 },
  fieldTitle: { color: colors.muted, fontSize: 9, fontWeight: "600", letterSpacing: 0.9, marginTop: 25, marginBottom: 11 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "center" },
  pillSelected: { borderColor: colors.coral, backgroundColor: colors.blush },
  pillText: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  pillTextSelected: { color: colors.plum },
  summary: { flexDirection: "row", gap: 9, marginTop: 22, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.blush },
  summaryText: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 15 },
  actions: { minHeight: 78, paddingHorizontal: 18, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { padding: 13 },
  backText: { color: colors.plum, fontSize: 12, fontWeight: "600" },
  continue: { minHeight: 48, paddingHorizontal: 21, borderRadius: 8, backgroundColor: colors.plum, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  continueText: { color: colors.white, fontSize: 12, fontWeight: "600" }
});
