import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { coupleVendors, recommendCoupleVendors, serviceOptions, type CoupleVendor } from "@vownaija/shared";
import { MatchModal } from "./src/components/MatchModal";
import { VendorCard } from "./src/components/VendorCard";
import { colors } from "./src/theme";

type Tab = "Home" | "Discover" | "Saved" | "Planning" | "Profile";

const heroImage = "https://static.wixstatic.com/media/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg/v1/fill/w_980%2Ch_980%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg";

export default function App() {
  return <SafeAreaProvider><StatusBar style="dark" /><VowNaija /></SafeAreaProvider>;
}

function VowNaija() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("Home");
  const [saved, setSaved] = useState<string[]>([]);
  const [matches, setMatches] = useState<(CoupleVendor & { score: number })[] | null>(null);
  const [matchVisible, setMatchVisible] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);

  function toggleSaved(name: string) {
    setSaved((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  const screen = tab === "Home"
    ? <HomeScreen saved={saved} matches={matches} onSave={toggleSaved} openMatch={() => setMatchVisible(true)} openAuth={() => setAuthVisible(true)} />
    : tab === "Discover"
      ? <DiscoverScreen saved={saved} onSave={toggleSaved} />
      : tab === "Saved"
        ? <SavedScreen saved={saved} onSave={toggleSaved} />
        : tab === "Planning"
          ? <PlanningScreen openMatch={() => setMatchVisible(true)} />
          : <ProfileScreen openAuth={() => setAuthVisible(true)} />;

  return (
    <View style={styles.app}>
      <View style={styles.screen}>{screen}</View>
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {(["Home", "Discover", "Saved", "Planning", "Profile"] as Tab[]).map((item) => (
          <TabButton key={item} tab={item} active={tab === item} savedCount={item === "Saved" ? saved.length : 0} onPress={() => setTab(item)} />
        ))}
      </View>
      <MatchModal
        visible={matchVisible}
        onClose={() => setMatchVisible(false)}
        onComplete={(preferences) => {
          setMatches(recommendCoupleVendors(preferences).slice(0, 5));
          setMatchVisible(false);
          setTab("Home");
        }}
      />
      <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
    </View>
  );
}

function HomeScreen({ saved, matches, onSave, openMatch, openAuth }: { saved: string[]; matches: (CoupleVendor & { score: number })[] | null; onSave: (name: string) => void; openMatch: () => void; openAuth: () => void }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}><Brand /><Pressable onPress={openAuth} accessibilityRole="button" accessibilityLabel="Sign in" style={styles.avatar}><Ionicons name="person-outline" size={19} color={colors.plum} /></Pressable></View>
      </SafeAreaView>
      <View style={styles.hero}>
        <Image source={{ uri: heroImage }} style={styles.heroImage} alt="Nigerian couple in traditional wedding attire" />
        <View style={styles.heroShade} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>YOUR WEDDING, YOUR WAY</Text>
          <Text style={styles.heroTitle}>Find the people who’ll make it unforgettable.</Text>
          <Text style={styles.heroText}>Trusted Nigerian wedding vendors for every celebration and spend.</Text>
        </View>
      </View>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={19} color={colors.plum} />
        <TextInput placeholder="Photographer, venue, caterer..." placeholderTextColor={colors.muted} style={styles.searchInput} />
        <View style={styles.searchDivider} />
        <Ionicons name="location-outline" size={18} color={colors.plum} /><Text style={styles.searchLocation}>Lagos</Text>
      </View>
      <Pressable onPress={openMatch} accessibilityRole="button" style={styles.vowiCard}>
        <View style={styles.vowiIcon}><Ionicons name="sparkles" size={20} color={colors.white} /></View>
        <View style={styles.vowiCopy}><Text style={styles.vowiKicker}>NOT SURE WHERE TO START?</Text><Text style={styles.vowiTitle}>Let Vowi find your best matches</Text></View>
        <Ionicons name="arrow-forward" size={20} color={colors.plum} />
      </Pressable>
      <SectionTitle kicker="BROWSE BY SERVICE" title="Everything you need, all in one place." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
        {serviceOptions.map((category, index) => (
          <Pressable key={category} style={[styles.categoryCard, index === 0 && styles.categoryCardActive]}>
            <Ionicons name={categoryIcon(category)} size={21} color={index === 0 ? colors.white : colors.plum} />
            <Text style={[styles.categoryText, index === 0 && styles.categoryTextActive]}>{category}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.sectionRow}>
        <SectionTitle kicker={matches ? "CHOSEN AROUND YOUR PLANS" : "CURATED FOR YOU"} title={matches ? "Your Vowi shortlist" : "Popular around Lagos"} compact />
        <Pressable accessibilityRole="button"><Text style={styles.seeAll}>See all</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vendorScroll}>
        {(matches ?? coupleVendors).map((vendor) => {
          const score = matches ? (vendor as CoupleVendor & { score: number }).score : undefined;
          return <VendorCard key={vendor.name} vendor={vendor} saved={saved.includes(vendor.name)} score={score} onSave={() => onSave(vendor.name)} />;
        })}
      </ScrollView>
      <View style={styles.trustCard}>
        <Text style={styles.trustKicker}>PLAN WITH CONFIDENCE</Text><Text style={styles.trustTitle}>Clear choices for your kind of wedding.</Text>
        <View style={styles.trustList}><TrustItem icon="checkmark-circle" text="Verified vendor profiles" /><TrustItem icon="wallet-outline" text="Options for every budget" /><TrustItem icon="chatbubble-ellipses-outline" text="Simple, protected enquiries" /></View>
      </View>
    </ScrollView>
  );
}

function DiscoverScreen({ saved, onSave }: { saved: string[]; onSave: (name: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const results = useMemo(() => coupleVendors.filter((vendor) => {
    const categoryMatch = category === "All" || vendor.category === category;
    const queryMatch = !query || `${vendor.name} ${vendor.location} ${vendor.category}`.toLowerCase().includes(query.toLowerCase());
    return categoryMatch && queryMatch;
  }), [category, query]);

  return (
    <SafeAreaView style={styles.safeScreen} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pagePadding}>
        <PageHeader title="Discover" subtitle="Find the people who’ll make your day." />
        <View style={styles.fullSearch}><Ionicons name="search" size={19} color={colors.plum} /><TextInput value={query} onChangeText={setQuery} placeholder="Search vendors or locations" placeholderTextColor={colors.muted} style={styles.searchInput} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {["All", ...serviceOptions].map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.filterChip, category === item && styles.filterChipActive]}><Text style={[styles.filterText, category === item && styles.filterTextActive]}>{item}</Text></Pressable>)}
        </ScrollView>
        <Text style={styles.resultCount}>{results.length} trusted vendors</Text>
        <View style={styles.verticalList}>{results.map((vendor) => <VendorCard key={vendor.name} fullWidth vendor={vendor} saved={saved.includes(vendor.name)} onSave={() => onSave(vendor.name)} />)}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SavedScreen({ saved, onSave }: { saved: string[]; onSave: (name: string) => void }) {
  const savedVendors = coupleVendors.filter((vendor) => saved.includes(vendor.name));
  return (
    <SafeAreaView style={styles.safeScreen} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pagePadding}>
        <PageHeader title="Saved" subtitle="Keep your favourite vendors close." />
        {savedVendors.length > 0
          ? <View style={styles.verticalList}>{savedVendors.map((vendor) => <VendorCard key={vendor.name} fullWidth vendor={vendor} saved onSave={() => onSave(vendor.name)} />)}</View>
          : <View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons name="heart-outline" size={30} color={colors.plum} /></View><Text style={styles.emptyTitle}>Your shortlist starts here</Text><Text style={styles.emptyText}>Tap the heart on any vendor to save them and compare your favourites.</Text></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanningScreen({ openMatch }: { openMatch: () => void }) {
  return (
    <SafeAreaView style={styles.safeScreen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.pagePadding} showsVerticalScrollIndicator={false}>
        <PageHeader title="Planning" subtitle="One calm place for all the details." />
        <View style={styles.planHero}><Ionicons name="sparkles" size={23} color={colors.white} /><Text style={styles.planHeroTitle}>Build your vendor shortlist with Vowi</Text><Text style={styles.planHeroText}>Three quick questions turn your plans into personal recommendations.</Text><Pressable onPress={openMatch} style={styles.creamButton}><Text style={styles.creamButtonText}>Find my matches</Text><Ionicons name="arrow-forward" size={17} color={colors.plum} /></Pressable></View>
        <SectionTitle kicker="YOUR WEDDING" title="Planning checklist" />
        <View style={styles.checklist}><ChecklistItem checked label="Set an overall budget" /><ChecklistItem label="Choose a venue" /><ChecklistItem label="Book photography" /><ChecklistItem label="Confirm catering" /><ChecklistItem label="Find your music & DJ" /></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileScreen({ openAuth }: { openAuth: () => void }) {
  return (
    <SafeAreaView style={styles.safeScreen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.pagePadding}>
        <PageHeader title="Your VowNaija" subtitle="Save plans and make the app yours." />
        <View style={styles.profileCard}><View style={styles.profileIcon}><Ionicons name="person-outline" size={29} color={colors.plum} /></View><Text style={styles.profileTitle}>Sign in to keep planning</Text><Text style={styles.profileText}>Sync your saved vendors, Vowi shortlist and wedding checklist across devices.</Text><Pressable onPress={openAuth} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Sign in or create account</Text></Pressable></View>
        <View style={styles.profileLinks}><ProfileLink icon="briefcase-outline" text="I’m a wedding vendor" /><ProfileLink icon="help-circle-outline" text="Help & support" /><ProfileLink icon="shield-checkmark-outline" text="Privacy & safety" /></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AuthModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [role, setRole] = useState<"couple" | "vendor">("couple");
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.authScreen}>
        <View style={styles.authTop}><Brand /><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.closeButton}><Ionicons name="close" size={22} color={colors.ink} /></Pressable></View>
        <ScrollView contentContainerStyle={styles.authContent}>
          <Text style={styles.authKicker}>WELCOME TO VOWNAIJA</Text><Text style={styles.authTitle}>Plan beautifully, together.</Text><Text style={styles.authSubtitle}>Choose how you use VowNaija to continue.</Text>
          <View style={styles.roleRow}><RoleCard icon="heart-outline" label="Planning a wedding" selected={role === "couple"} onPress={() => setRole("couple")} /><RoleCard icon="briefcase-outline" label="Wedding vendor" selected={role === "vendor"} onPress={() => setRole("vendor")} /></View>
          <Text style={styles.inputLabel}>EMAIL ADDRESS</Text><TextInput style={styles.authInput} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.inputLabel}>PASSWORD</Text><TextInput style={styles.authInput} placeholder="••••••••" secureTextEntry />
          <Pressable onPress={onClose} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Continue</Text><Ionicons name="arrow-forward" size={18} color={colors.white} /></Pressable>
          <Text style={styles.terms}>By continuing, you agree to VowNaija’s Terms and Privacy Policy.</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Brand() { return <View style={styles.brand}><View style={styles.brandMark}><Ionicons name="heart" size={16} color={colors.white} /></View><Text style={styles.brandName}>VowNaija</Text></View>; }
function PageHeader({ title, subtitle }: { title: string; subtitle: string }) { return <View style={styles.pageHeader}><Text style={styles.pageTitle}>{title}</Text><Text style={styles.pageSubtitle}>{subtitle}</Text></View>; }
function SectionTitle({ kicker, title, compact = false }: { kicker: string; title: string; compact?: boolean }) { return <View style={[styles.sectionHeading, compact && styles.sectionHeadingCompact]}><Text style={styles.sectionKicker}>{kicker}</Text><Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>{title}</Text></View>; }
function TrustItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) { return <View style={styles.trustItem}><Ionicons name={icon} size={18} color="#F4B4A9" /><Text style={styles.trustText}>{text}</Text></View>; }
function ChecklistItem({ label, checked = false }: { label: string; checked?: boolean }) { return <View style={styles.checkRow}><View style={[styles.checkCircle, checked && styles.checkCircleDone]}>{checked && <Ionicons name="checkmark" size={14} color={colors.white} />}</View><Text style={[styles.checkLabel, checked && styles.checkLabelDone]}>{label}</Text><Ionicons name="chevron-forward" size={17} color={colors.muted} /></View>; }
function ProfileLink({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) { return <Pressable style={styles.profileLink}><Ionicons name={icon} size={21} color={colors.plum} /><Text style={styles.profileLinkText}>{text}</Text><Ionicons name="chevron-forward" size={17} color={colors.muted} /></Pressable>; }
function RoleCard({ icon, label, selected, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.roleCard, selected && styles.roleCardSelected]}><Ionicons name={icon} size={24} color={colors.plum} /><Text style={styles.roleLabel}>{label}</Text>{selected && <Ionicons name="checkmark-circle" size={18} color={colors.coral} style={styles.roleCheck} />}</Pressable>; }

function TabButton({ tab, active, savedCount, onPress }: { tab: Tab; active: boolean; savedCount: number; onPress: () => void }) {
  const icons: Record<Tab, keyof typeof Ionicons.glyphMap> = { Home: "home-outline", Discover: "search-outline", Saved: "heart-outline", Planning: "calendar-outline", Profile: "person-outline" };
  const activeIcons: Record<Tab, keyof typeof Ionicons.glyphMap> = { Home: "home", Discover: "search", Saved: "heart", Planning: "calendar", Profile: "person" };
  return <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} style={styles.tabButton}><View>{savedCount > 0 && <View style={styles.countBadge}><Text style={styles.countText}>{savedCount}</Text></View>}<Ionicons name={active ? activeIcons[tab] : icons[tab]} size={21} color={active ? colors.plum : "#978A8F"} /></View><Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab}</Text></Pressable>;
}

function categoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  if (category === "Photography") return "camera-outline";
  if (category === "Venues") return "business-outline";
  if (category === "Cakes & desserts") return "cafe-outline";
  if (category === "Bridal beauty") return "sparkles-outline";
  return "calendar-outline";
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.cream },
  screen: { flex: 1 },
  scroll: { flex: 1, backgroundColor: colors.cream },
  scrollContent: { paddingBottom: 36 },
  safeScreen: { flex: 1, backgroundColor: colors.cream },
  pagePadding: { paddingHorizontal: 18, paddingBottom: 42 },
  header: { height: 61, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandMark: { width: 32, height: 32, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.plum },
  brandName: { color: colors.plum, fontFamily: "Georgia", fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  avatar: { width: 38, height: 38, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  hero: { height: 344, marginHorizontal: 15, overflow: "hidden", position: "relative", borderRadius: 25, backgroundColor: colors.plumDark },
  heroImage: { position: "absolute", width: "100%", height: "100%" },
  heroShade: { position: "absolute", inset: 0, backgroundColor: "rgba(47,9,25,0.5)" },
  heroCopy: { position: "absolute", left: 23, right: 23, bottom: 26 },
  heroKicker: { color: "#F4B4A9", fontSize: 8, fontWeight: "900", letterSpacing: 1.4 },
  heroTitle: { maxWidth: 315, color: colors.white, fontFamily: "Georgia", fontSize: 37, lineHeight: 40, fontWeight: "600", letterSpacing: -1.2, marginTop: 8 },
  heroText: { maxWidth: 285, color: "rgba(255,255,255,0.8)", fontSize: 11, lineHeight: 17, marginTop: 8 },
  searchBar: { minHeight: 59, marginHorizontal: 27, marginTop: -19, paddingHorizontal: 15, borderRadius: 16, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: colors.plumDark, shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 11, paddingVertical: 12 },
  searchDivider: { width: 1, height: 25, backgroundColor: colors.border },
  searchLocation: { color: colors.ink, fontSize: 10, fontWeight: "800" },
  vowiCard: { marginHorizontal: 18, marginTop: 25, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: "#E5C8D2", backgroundColor: colors.blush, flexDirection: "row", alignItems: "center", gap: 11 },
  vowiIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  vowiCopy: { flex: 1 },
  vowiKicker: { color: colors.coral, fontSize: 8, fontWeight: "900", letterSpacing: 0.9 },
  vowiTitle: { color: colors.ink, fontSize: 12, fontWeight: "800", marginTop: 3 },
  sectionHeading: { marginHorizontal: 18, marginTop: 27, marginBottom: 15 },
  sectionHeadingCompact: { marginBottom: 0 },
  sectionKicker: { color: colors.coral, fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  sectionTitle: { color: colors.ink, fontFamily: "Georgia", fontSize: 28, lineHeight: 33, fontWeight: "600", letterSpacing: -0.7, marginTop: 5 },
  sectionTitleCompact: { fontSize: 25, lineHeight: 30 },
  categoryScroll: { paddingHorizontal: 18, paddingBottom: 8, gap: 10 },
  categoryCard: { width: 116, height: 91, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "space-between" },
  categoryCardActive: { backgroundColor: colors.plum, borderColor: colors.plum },
  categoryText: { color: colors.ink, fontSize: 10, lineHeight: 14, fontWeight: "800" },
  categoryTextActive: { color: colors.white },
  sectionRow: { marginTop: 16, marginRight: 18, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  seeAll: { color: colors.coral, fontSize: 10, fontWeight: "900", paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: colors.coral },
  vendorScroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 25, gap: 14 },
  trustCard: { marginHorizontal: 18, padding: 23, borderRadius: 22, backgroundColor: colors.plumDark },
  trustKicker: { color: "#F4B4A9", fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  trustTitle: { color: colors.white, fontFamily: "Georgia", fontSize: 25, lineHeight: 30, marginTop: 6 },
  trustList: { gap: 12, marginTop: 20 },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 9 },
  trustText: { color: "rgba(255,255,255,0.76)", fontSize: 10 },
  tabBar: { minHeight: 69, paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white, flexDirection: "row", alignItems: "flex-start" },
  tabButton: { flex: 1, alignItems: "center", gap: 3 },
  tabLabel: { color: "#978A8F", fontSize: 8, fontWeight: "700" },
  tabLabelActive: { color: colors.plum, fontWeight: "900" },
  countBadge: { minWidth: 14, height: 14, paddingHorizontal: 3, position: "absolute", zIndex: 2, right: -8, top: -4, borderRadius: 7, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  countText: { color: colors.white, fontSize: 8, fontWeight: "900" },
  pageHeader: { paddingTop: 24, paddingBottom: 25 },
  pageTitle: { color: colors.ink, fontFamily: "Georgia", fontSize: 40, lineHeight: 46, fontWeight: "600", letterSpacing: -1.1 },
  pageSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  fullSearch: { minHeight: 55, paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: 10 },
  filterRow: { gap: 8, paddingVertical: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  filterChipActive: { borderColor: colors.plum, backgroundColor: colors.plum },
  filterText: { color: colors.ink, fontSize: 10, fontWeight: "800" },
  filterTextActive: { color: colors.white },
  resultCount: { color: colors.muted, fontSize: 9, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  verticalList: { gap: 17 },
  emptyState: { alignItems: "center", paddingTop: 90, paddingHorizontal: 27 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", backgroundColor: colors.blush },
  emptyTitle: { color: colors.ink, fontFamily: "Georgia", fontSize: 26, fontWeight: "600", marginTop: 20 },
  emptyText: { color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: "center", marginTop: 8 },
  planHero: { padding: 24, marginBottom: 4, borderRadius: 22, backgroundColor: colors.plum },
  planHeroTitle: { color: colors.white, fontFamily: "Georgia", fontSize: 29, lineHeight: 34, fontWeight: "600", marginTop: 18 },
  planHeroText: { color: "rgba(255,255,255,0.72)", fontSize: 11, lineHeight: 18, marginTop: 8 },
  creamButton: { minHeight: 46, marginTop: 20, paddingHorizontal: 18, alignSelf: "flex-start", borderRadius: 23, backgroundColor: "#FFF3EC", flexDirection: "row", alignItems: "center", gap: 8 },
  creamButtonText: { color: colors.plum, fontSize: 11, fontWeight: "900" },
  checklist: { overflow: "hidden", borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  checkRow: { minHeight: 61, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 11 },
  checkCircle: { width: 23, height: 23, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkCircleDone: { borderColor: colors.green, backgroundColor: colors.green },
  checkLabel: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: "700" },
  checkLabelDone: { color: colors.muted, textDecorationLine: "line-through" },
  profileCard: { alignItems: "center", padding: 28, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  profileIcon: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.blush, alignItems: "center", justifyContent: "center" },
  profileTitle: { color: colors.ink, fontFamily: "Georgia", fontSize: 27, fontWeight: "600", marginTop: 18 },
  profileText: { color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: "center", marginTop: 8, marginBottom: 20 },
  primaryButton: { width: "100%", minHeight: 51, borderRadius: 26, backgroundColor: colors.plum, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryButtonText: { color: colors.white, fontSize: 12, fontWeight: "900" },
  profileLinks: { overflow: "hidden", marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  profileLink: { minHeight: 62, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
  profileLinkText: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: "700" },
  authScreen: { flex: 1, backgroundColor: colors.cream },
  authTop: { paddingHorizontal: 20, paddingTop: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  authContent: { padding: 22, paddingTop: 55 },
  authKicker: { color: colors.coral, fontSize: 8, fontWeight: "900", letterSpacing: 1.3, textAlign: "center" },
  authTitle: { color: colors.ink, fontFamily: "Georgia", fontSize: 36, lineHeight: 42, fontWeight: "600", textAlign: "center", marginTop: 8 },
  authSubtitle: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 6, marginBottom: 26 },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  roleCard: { flex: 1, minHeight: 106, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "space-between" },
  roleCardSelected: { borderColor: colors.coral, backgroundColor: "#FFF6F2" },
  roleLabel: { maxWidth: 108, color: colors.ink, fontSize: 10, lineHeight: 14, fontWeight: "800" },
  roleCheck: { position: "absolute", right: 11, top: 11 },
  inputLabel: { color: colors.ink, fontSize: 8, fontWeight: "900", letterSpacing: 1, marginTop: 13, marginBottom: 6 },
  authInput: { height: 52, paddingHorizontal: 15, marginBottom: 4, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, color: colors.ink },
  terms: { color: colors.muted, fontSize: 8, lineHeight: 14, textAlign: "center", paddingHorizontal: 20, marginTop: 16 }
});
