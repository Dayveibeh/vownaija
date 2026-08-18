import { StatusBar } from "expo-status-bar";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { coupleVendors, recommendCoupleVendors, serviceOptions, weddingLocations, type CoupleVendor } from "@smitten/shared";
import { AppSymbol, type AppSymbolFallback, type AppSymbolName } from "./src/components/AppSymbol";
import { MatchModal } from "./src/components/MatchModal";
import { VendorCard } from "./src/components/VendorCard";
import { cardShadow, colors, fonts } from "./src/theme";

type Tab = "Home" | "Discover" | "Saved" | "Planning" | "Profile";
type SymbolPair = { symbol: AppSymbolName; fallback: AppSymbolFallback };
type TabIconSet = { base: SymbolPair; active: SymbolPair };

const tabIcons: Record<Tab, TabIconSet> = {
  Home: { base: { symbol: "house", fallback: "home-outline" }, active: { symbol: "house.fill", fallback: "home" } },
  Discover: { base: { symbol: "safari", fallback: "compass-outline" }, active: { symbol: "safari.fill", fallback: "compass" } },
  Saved: { base: { symbol: "heart", fallback: "heart-outline" }, active: { symbol: "heart.fill", fallback: "heart" } },
  Planning: { base: { symbol: "calendar", fallback: "calendar-outline" }, active: { symbol: "calendar.circle.fill", fallback: "calendar" } },
  Profile: { base: { symbol: "person.crop.circle", fallback: "person-circle-outline" }, active: { symbol: "person.crop.circle.fill", fallback: "person-circle" } },
};

const appFont = fonts.regular;
const mediumFont = fonts.medium;
const headingFont = fonts.semibold;
const boldFont = fonts.bold;
const heroImage = "https://static.wixstatic.com/media/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg/v1/fill/w_980%2Ch_980%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const smittenWordmark = require("./assets/smitten-wordmark.png");

export default function App() {
  return <SafeAreaProvider><SmittenApp /></SafeAreaProvider>;
}

function SmittenApp() {
  const insets = useSafeAreaInsets();
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenOffset = useRef(new Animated.Value(0)).current;
  const [tab, setTab] = useState<Tab>("Home");
  const [saved, setSaved] = useState<string[]>([]);
  const [matches, setMatches] = useState<(CoupleVendor & { score: number })[] | null>(null);
  const [matchVisible, setMatchVisible] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [locationVisible, setLocationVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [location, setLocation] = useState("Lagos");
  const [homeQuery, setHomeQuery] = useState("");
  const [homeCategory, setHomeCategory] = useState("All");
  const [selectedVendor, setSelectedVendor] = useState<CoupleVendor | null>(null);
  const [notice, setNotice] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [planningReminders, setPlanningReminders] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(2);
  const [checklist, setChecklist] = useState([true, false, false, false, false]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    screenOpacity.setValue(0);
    screenOffset.setValue(8);
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(screenOffset, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [screenOffset, screenOpacity, tab]);

  function toggleSaved(name: string) {
    setSaved((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  function showNotice(message: string) {
    setNotice(message);
  }

  function closeAccount() {
    Alert.alert(
      "Close your Smitten account?",
      "This clears your saved vendors, matches and planning progress from this device. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close account",
          style: "destructive",
          onPress: () => {
            setSignedIn(false);
            setSaved([]);
            setMatches(null);
            setChecklist([false, false, false, false, false]);
            setSettingsVisible(false);
            setTab("Home");
            showNotice("Account closed and local data cleared");
          },
        },
      ],
    );
  }

  const screen = tab === "Home"
    ? <HomeScreen darkMode={darkMode} unreadNotifications={pushNotifications ? unreadNotifications : 0} saved={saved} matches={matches} location={location} query={homeQuery} category={homeCategory} onQuery={setHomeQuery} onCategory={setHomeCategory} onSave={toggleSaved} onView={setSelectedVendor} openNotifications={() => setNotificationsVisible(true)} openLocation={() => setLocationVisible(true)} openMatch={() => setMatchVisible(true)} openAuth={() => setAuthVisible(true)} openDiscover={() => setTab("Discover")} />
    : tab === "Discover"
      ? <DiscoverScreen darkMode={darkMode} saved={saved} onSave={toggleSaved} onView={setSelectedVendor} />
      : tab === "Saved"
        ? <SavedScreen darkMode={darkMode} saved={saved} onSave={toggleSaved} onView={setSelectedVendor} openDiscover={() => setTab("Discover")} />
        : tab === "Planning"
          ? <PlanningScreen darkMode={darkMode} checklist={checklist} onToggle={(index) => setChecklist((current) => current.map((item, itemIndex) => itemIndex === index ? !item : item))} openMatch={() => setMatchVisible(true)} />
          : <ProfileScreen darkMode={darkMode} signedIn={signedIn} savedCount={saved.length} completedCount={checklist.filter(Boolean).length} matchCount={matches?.length ?? 0} openAuth={() => setAuthVisible(true)} openSettings={() => setSettingsVisible(true)} onAction={showNotice} />;

  return (
    <View style={[styles.app, darkMode && styles.appDark]}>
      <StatusBar style={darkMode ? "light" : "dark"} />
      <Animated.View style={[styles.screen, { opacity: screenOpacity, transform: [{ translateY: screenOffset }] }]}>{screen}</Animated.View>
      <BlurView intensity={86} tint={darkMode ? "dark" : "light"} style={[styles.tabBar, darkMode && styles.tabBarDark, { bottom: Math.max(insets.bottom, 10) }]}>
        {(["Home", "Discover", "Saved", "Planning", "Profile"] as Tab[]).map((item) => (
          <TabButton key={item} darkMode={darkMode} tab={item} active={tab === item} savedCount={item === "Saved" ? saved.length : 0} onPress={() => setTab(item)} />
        ))}
      </BlurView>
      <MatchModal
        visible={matchVisible}
        onClose={() => setMatchVisible(false)}
        onComplete={(preferences) => {
          setMatches(recommendCoupleVendors(preferences).slice(0, 5));
          setMatchVisible(false);
          setTab("Home");
        }}
      />
      <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} onComplete={() => { setSignedIn(true); setAuthVisible(false); showNotice("You’re signed in to Smitten"); }} />
      <LocationModal visible={locationVisible} selected={location} onClose={() => setLocationVisible(false)} onSelect={(city) => { setLocation(city); setLocationVisible(false); showNotice(`Location changed to ${city}`); }} />
      <VendorModal vendor={selectedVendor} saved={selectedVendor ? saved.includes(selectedVendor.name) : false} onClose={() => setSelectedVendor(null)} onSave={() => selectedVendor && toggleSaved(selectedVendor.name)} onQuote={() => { if (selectedVendor) showNotice(`Enquiry started for ${selectedVendor.name}`); setSelectedVendor(null); }} />
      <NotificationsModal visible={notificationsVisible} darkMode={darkMode} unreadCount={unreadNotifications} onClose={() => setNotificationsVisible(false)} onMarkAllRead={() => { setUnreadNotifications(0); showNotice("Notifications marked as read"); }} />
      <SettingsModal
        visible={settingsVisible}
        signedIn={signedIn}
        darkMode={darkMode}
        pushNotifications={pushNotifications}
        planningReminders={planningReminders}
        onClose={() => setSettingsVisible(false)}
        onDarkMode={setDarkMode}
        onPushNotifications={setPushNotifications}
        onPlanningReminders={setPlanningReminders}
        onSignOut={() => { setSignedIn(false); setSettingsVisible(false); showNotice("You’re signed out of Smitten"); }}
        onCloseAccount={closeAccount}
      />
      {notice ? <View accessibilityLiveRegion="polite" style={[styles.toast, { bottom: 96 + insets.bottom }]}><AppSymbol name="checkmark.circle.fill" fallback="checkmark-circle" size={18} color={colors.white} weight="semibold" /><Text style={styles.toastText}>{notice}</Text></View> : null}
    </View>
  );
}

function HomeScreen({ darkMode, unreadNotifications, saved, matches, location, query, category, onQuery, onCategory, onSave, onView, openNotifications, openLocation, openMatch, openAuth, openDiscover }: { darkMode: boolean; unreadNotifications: number; saved: string[]; matches: (CoupleVendor & { score: number })[] | null; location: string; query: string; category: string; onQuery: (value: string) => void; onCategory: (value: string) => void; onSave: (name: string) => void; onView: (vendor: CoupleVendor) => void; openNotifications: () => void; openLocation: () => void; openMatch: () => void; openAuth: () => void; openDiscover: () => void }) {
  const [searchFocused, setSearchFocused] = useState(false);
  const vendors = useMemo(() => (matches ?? coupleVendors).filter((vendor) => {
    const locationMatch = vendor.location === location;
    const categoryMatch = category === "All" || vendor.category === category;
    const queryMatch = !query.trim() || `${vendor.name} ${vendor.category}`.toLowerCase().includes(query.trim().toLowerCase());
    return locationMatch && categoryMatch && queryMatch;
  }), [category, location, matches, query]);

  return (
    <SafeAreaView style={[styles.safeScreen, darkMode && styles.darkScreen]} edges={["top"]}>
      <ScrollView style={[styles.scroll, darkMode && styles.darkScreen]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never">
        <View style={styles.header}>
          <View style={styles.homeIdentity}>
            <Brand />
            <Pressable onPress={openLocation} accessibilityRole="button" accessibilityLabel={`Change location, currently ${location}`} style={styles.homeLocation}>
              <AppSymbol name="location.fill" fallback="location-outline" size={12} color={darkMode ? colors.white : colors.ink} weight="medium" />
              <Text style={[styles.homeLocationText, darkMode && styles.pageSubtitleDark]}>Planning in {location}</Text>
              <AppSymbol name="chevron.down" fallback="chevron-down" size={9} color={colors.muted} weight="semibold" />
            </Pressable>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={openNotifications} accessibilityRole="button" accessibilityLabel={`${unreadNotifications} unread notifications`} style={[styles.avatar, darkMode && styles.darkIconButton]}>
              <AppSymbol name={unreadNotifications > 0 ? "bell.badge.fill" : "bell"} fallback={unreadNotifications > 0 ? "notifications" : "notifications-outline"} size={20} color={darkMode ? colors.white : colors.plum} type="hierarchical" weight="medium" animationSpec={unreadNotifications > 0 ? { effect: { type: "pulse", wholeSymbol: true }, repeating: false } : undefined} />
              {unreadNotifications > 0 ? <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{unreadNotifications}</Text></View> : null}
            </Pressable>
            <Pressable onPress={openAuth} accessibilityRole="button" accessibilityLabel="Sign in" style={[styles.avatar, darkMode && styles.darkIconButton]}><AppSymbol name="person.crop.circle" fallback="person-circle-outline" size={22} color={darkMode ? colors.white : colors.plum} weight="medium" /></Pressable>
          </View>
        </View>
      <Pressable onPress={openMatch} accessibilityRole="button" accessibilityLabel="Start your Smitten match" style={styles.matchHero}>
        <Image source={{ uri: heroImage }} style={styles.matchHeroImage} resizeMode="cover" alt="Nigerian couple celebrating their wedding" />
        <LinearGradient colors={["rgba(23,20,18,0.03)", "rgba(23,20,18,0.28)", "rgba(23,20,18,0.9)"]} locations={[0.15, 0.5, 1]} style={styles.matchHeroGradient} />
        <View style={styles.matchHeroCopy}>
          <View style={styles.matchHeroBottom}>
            <Text style={styles.heroTitle}>Your dream team, beautifully matched.</Text>
            <Text style={styles.heroText}>Tell us the mood, place and budget. We’ll find vendors who fit.</Text>
            <View style={styles.heroAction}><AppSymbol name="sparkles" fallback="sparkles-outline" size={14} color={colors.white} weight="medium" /><Text style={styles.heroActionText}>Start matching</Text></View>
          </View>
        </View>
      </Pressable>
      <BlurView intensity={88} tint="light" style={[styles.searchBar, searchFocused && styles.inputFocused]}>
        <AppSymbol name="magnifyingglass" fallback="search" size={18} color={colors.plum} weight="medium" />
        <TextInput value={query} onChangeText={onQuery} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholder="Photographer, venue, caterer..." placeholderTextColor="#A8A29E" style={styles.searchInput} returnKeyType="search" />
        <Pressable onPress={openDiscover} accessibilityRole="button" accessibilityLabel="Open vendor filters" style={styles.searchFilter}><AppSymbol name="slider.horizontal.3" fallback="options-outline" size={17} color={colors.plum} weight="medium" /></Pressable>
      </BlurView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
        {["All", ...serviceOptions].map((item) => {
          const icon = categorySymbol(item);
          return (
            <Pressable key={item} onPress={() => onCategory(item)} accessibilityRole="button" accessibilityState={{ selected: category === item }} style={[styles.categoryCard, category === item && styles.categoryCardActive]}>
              <AppSymbol name={icon.symbol} fallback={icon.fallback} size={21} color={category === item ? colors.white : colors.plum} weight={category === item ? "medium" : "regular"} type="monochrome" />
              <Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item === "All" ? "All services" : item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.sectionRow}>
        <SectionTitle darkMode={darkMode} kicker={matches ? "CHOSEN AROUND YOUR PLANS" : "FOR YOUR DAY"} title={matches ? "Your Smitten shortlist" : `Popular in ${location}`} compact />
        <Pressable onPress={openDiscover} accessibilityRole="button"><Text style={styles.seeAll}>See all</Text></Pressable>
      </View>
      {vendors.length > 0 ? (
        <View style={styles.vendorMosaic}>
          <VendorPlanCard vendor={vendors[0]} tone="peach" tall saved={saved.includes(vendors[0].name)} score={matches ? (vendors[0] as CoupleVendor & { score: number }).score : undefined} onSave={() => onSave(vendors[0].name)} onView={() => onView(vendors[0])} />
          <View style={styles.vendorMosaicSide}>
            {vendors.slice(1, 3).map((vendor, index) => <VendorPlanCard key={vendor.name} vendor={vendor} tone={index === 0 ? "blue" : "mint"} saved={saved.includes(vendor.name)} score={matches ? (vendor as CoupleVendor & { score: number }).score : undefined} onSave={() => onSave(vendor.name)} onView={() => onView(vendor)} />)}
            {vendors.length < 3 ? <Pressable onPress={openDiscover} style={[styles.vendorPlanCard, styles.vendorPlanBlue, styles.vendorExploreCard]}><View style={styles.vendorExploreIcon}><AppSymbol name="plus" fallback="add" size={20} color={colors.ink} weight="medium" /></View><Text style={styles.vendorPlanName}>Explore more vendors</Text></Pressable> : null}
          </View>
        </View>
      ) : <View style={styles.inlineEmpty}><AppSymbol name="mappin.and.ellipse" fallback="location-outline" size={26} color={colors.coral} weight="medium" /><Text style={styles.inlineEmptyTitle}>No exact matches in {location} yet</Text><Text style={styles.inlineEmptyText}>Try another service or tap the location above to browse another city.</Text></View>}
      <View style={styles.trustCard}>
        <Text style={styles.trustKicker}>PLAN WITH CONFIDENCE</Text><Text style={styles.trustTitle}>Clear choices for your kind of wedding.</Text>
        <View style={styles.trustList}><TrustItem symbol="checkmark.seal" fallback="checkmark-circle-outline" text="Verified vendor profiles" /><TrustItem symbol="banknote" fallback="wallet-outline" text="Options for every budget" /><TrustItem symbol="message" fallback="chatbubble-ellipses-outline" text="Simple, protected enquiries" /></View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DiscoverScreen({ darkMode, saved, onSave, onView }: { darkMode: boolean; saved: string[]; onSave: (name: string) => void; onView: (vendor: CoupleVendor) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [searchFocused, setSearchFocused] = useState(false);
  const results = useMemo(() => coupleVendors.filter((vendor) => {
    const categoryMatch = category === "All" || vendor.category === category;
    const queryMatch = !query || `${vendor.name} ${vendor.location} ${vendor.category}`.toLowerCase().includes(query.toLowerCase());
    return categoryMatch && queryMatch;
  }), [category, query]);

  return (
    <SafeAreaView style={[styles.safeScreen, darkMode && styles.darkScreen]} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pagePadding}>
        <PageHeader darkMode={darkMode} title="Discover" subtitle="Find the people who’ll make your day." />
        <View style={[styles.fullSearch, searchFocused && styles.inputFocused]}><AppSymbol name="magnifyingglass" fallback="search" size={18} color={colors.plum} weight="medium" /><TextInput value={query} onChangeText={setQuery} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholder="Search vendors or locations" placeholderTextColor="#A8A29E" style={styles.searchInput} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {["All", ...serviceOptions].map((item) => <Pressable key={item} onPress={() => setCategory(item)} accessibilityRole="button" accessibilityState={{ selected: category === item }} style={[styles.filterChip, category === item && styles.filterChipActive]}><Text style={[styles.filterText, category === item && styles.filterTextActive]}>{item}</Text></Pressable>)}
        </ScrollView>
        <Text style={styles.resultCount}>{results.length} trusted vendors</Text>
        {results.length > 0 ? <View style={styles.verticalList}>{results.map((vendor) => <VendorCard key={vendor.name} fullWidth darkMode={darkMode} vendor={vendor} saved={saved.includes(vendor.name)} onSave={() => onSave(vendor.name)} onView={() => onView(vendor)} />)}</View> : <View style={styles.emptyState}><View style={styles.emptyIcon}><AppSymbol name="magnifyingglass" fallback="search-outline" size={28} color={colors.plum} weight="light" /></View><Text style={styles.emptyTitle}>No matches yet</Text><Text style={styles.emptyText}>Try a broader search or choose All services.</Text></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

function SavedScreen({ darkMode, saved, onSave, onView, openDiscover }: { darkMode: boolean; saved: string[]; onSave: (name: string) => void; onView: (vendor: CoupleVendor) => void; openDiscover: () => void }) {
  const savedVendors = coupleVendors.filter((vendor) => saved.includes(vendor.name));
  return (
    <SafeAreaView style={[styles.safeScreen, darkMode && styles.darkScreen]} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pagePadding}>
        <PageHeader darkMode={darkMode} title="Saved" subtitle="Keep your favourite vendors close." />
        {savedVendors.length > 0
          ? <View style={styles.verticalList}>{savedVendors.map((vendor) => <VendorCard key={vendor.name} fullWidth darkMode={darkMode} vendor={vendor} saved onSave={() => onSave(vendor.name)} onView={() => onView(vendor)} />)}</View>
          : <View style={styles.emptyState}><View style={styles.emptyIcon}><AppSymbol name="heart" fallback="heart-outline" size={29} color={colors.plum} weight="light" /></View><Text style={styles.emptyTitle}>Your shortlist starts here</Text><Text style={styles.emptyText}>Tap the heart on any vendor to save them and compare your favourites.</Text><Pressable onPress={openDiscover} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Discover vendors</Text></Pressable></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanningScreen({ darkMode, checklist, onToggle, openMatch }: { darkMode: boolean; checklist: boolean[]; onToggle: (index: number) => void; openMatch: () => void }) {
  const labels = ["Set an overall budget", "Choose a venue", "Book photography", "Confirm catering", "Find your music & DJ"];
  const completed = checklist.filter(Boolean).length;
  return (
    <SafeAreaView style={[styles.safeScreen, darkMode && styles.darkScreen]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.pagePadding} showsVerticalScrollIndicator={false}>
        <PageHeader darkMode={darkMode} title="Planning" subtitle="One calm place for all the details." />
        <View style={styles.planProgressCard}>
          <View style={styles.planProgressHeader}><View><Text style={styles.planProgressKicker}>YOUR PROGRESS</Text><Text style={styles.planProgressTitle}>{completed} of {checklist.length} details settled</Text></View><Text style={styles.planProgressPercent}>{Math.round((completed / checklist.length) * 100)}%</Text></View>
          <View style={styles.planProgressTrack}><View style={[styles.planProgressFill, { width: `${(completed / checklist.length) * 100}%` }]} /></View>
        </View>
        <View style={styles.planMetrics}>
          <PlanningMetric tone="mint" label="Completed" value={`${completed} tasks`} />
          <PlanningMetric tone="blue" label="To do" value={`${checklist.length - completed} tasks`} />
          <PlanningMetric tone="peach" label="Your pace" value={completed > 2 ? "On track" : "Steady"} />
        </View>
        <View style={styles.planHero}>
          <View style={styles.planHeroIcon}><AppSymbol name="wand.and.stars" fallback="sparkles" size={22} color={colors.ink} type="hierarchical" weight="semibold" /></View>
          <Text style={styles.planHeroEyebrow}>PERSONAL MATCHING</Text>
          <Text style={styles.planHeroTitle}>Build your vendor shortlist with Smitten.</Text>
          <Text style={styles.planHeroText}>Three thoughtful questions turn your plans into personal recommendations.</Text>
          <Pressable onPress={openMatch} style={styles.creamButton}><Text style={styles.creamButtonText}>Find my matches</Text><AppSymbol name="arrow.up.right" fallback="arrow-up" size={15} color={colors.white} weight="semibold" /></Pressable>
        </View>
        <SectionTitle darkMode={darkMode} kicker="YOUR WEDDING" title="Planning checklist" />
        <View style={styles.checklist}>{labels.map((label, index) => <ChecklistItem key={label} checked={checklist[index]} label={label} onPress={() => onToggle(index)} />)}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileScreen({ darkMode, signedIn, savedCount, completedCount, matchCount, openAuth, openSettings, onAction }: { darkMode: boolean; signedIn: boolean; savedCount: number; completedCount: number; matchCount: number; openAuth: () => void; openSettings: () => void; onAction: (message: string) => void }) {
  return (
    <SafeAreaView style={[styles.safeScreen, darkMode && styles.darkScreen]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.pagePadding} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.profileHeaderSpacer} />
          <Text style={[styles.profileHeaderTitle, darkMode && styles.pageTitleDark]}>Profile</Text>
          <Pressable onPress={openSettings} accessibilityRole="button" accessibilityLabel="Open settings" style={[styles.profileSettingsButton, darkMode && styles.darkIconButton]}><AppSymbol name="gearshape" fallback="settings-outline" size={21} color={darkMode ? colors.white : colors.ink} weight="medium" /></Pressable>
        </View>
        <View style={styles.profileIdentity}>
          <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>S</Text><View style={styles.profileStatusDot} /></View>
          <View style={styles.profileIdentityCopy}><Text style={[styles.profileName, darkMode && styles.pageTitleDark]}>{signedIn ? "Your Smitten" : "Wedding dreamer"}</Text><Text style={[styles.profileLocation, darkMode && styles.pageSubtitleDark]}>{signedIn ? "Your plans are synced" : "Planning beautifully, one step at a time"}</Text></View>
          <Pressable onPress={signedIn ? () => onAction("Your Smitten profile is up to date") : openAuth} accessibilityRole="button" style={[styles.profileMiniAction, darkMode && styles.darkIconButton]}><AppSymbol name={signedIn ? "checkmark.seal.fill" : "pencil"} fallback={signedIn ? "checkmark-circle" : "create-outline"} size={18} color={darkMode ? colors.white : colors.ink} type="hierarchical" weight="medium" /></Pressable>
        </View>
        <View style={styles.profileMetrics}>
          <ProfileMetric tone="mint" label="Saved vendors" value={String(savedCount)} />
          <ProfileMetric tone="blue" label="Tasks done" value={String(completedCount)} />
          <ProfileMetric tone="peach" label="Matches" value={String(matchCount)} />
        </View>
        {!signedIn ? <View style={styles.profileSignIn}><View style={styles.profileSignInCopy}><Text style={styles.profileSignInTitle}>Keep every plan close.</Text><Text style={styles.profileSignInText}>Sign in to sync favourites and your checklist.</Text></View><Pressable onPress={openAuth} style={styles.profileSignInButton}><Text style={styles.profileSignInButtonText}>Sign in</Text><AppSymbol name="arrow.right" fallback="arrow-forward" size={14} color={colors.white} weight="semibold" /></Pressable></View> : null}
        <View style={styles.profileLinks}><ProfileLink symbol="storefront" fallback="briefcase-outline" text="I’m a wedding vendor" onPress={() => onAction("Vendor onboarding will open on smitten.ng")}/><ProfileLink symbol="bell.badge" fallback="notifications-outline" text="Notification preferences" onPress={openSettings}/><ProfileLink symbol="questionmark.circle" fallback="help-circle-outline" text="Help & support" onPress={() => onAction("Support request started")}/><ProfileLink symbol="hand.raised" fallback="shield-checkmark-outline" text="Privacy & safety" onPress={() => onAction("Privacy & safety centre opened")}/></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AuthModal({ visible, onClose, onComplete }: { visible: boolean; onClose: () => void; onComplete: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"couple" | "vendor">("couple");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<"name" | "email" | "password" | "confirm" | null>(null);

  function submit() {
    const strongPassword = password.length >= 8 && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
    if (mode === "signup" && name.trim().length < 2) {
      setError("Enter your name to create your Smitten account.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!strongPassword) {
      setError("Use a valid email and a password with 8+ characters, a number and a special character.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }
    setError("");
    onComplete();
  }

  function changeMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setError("");
    setFocusedField(null);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.authScreen}>
        <View style={styles.authTop}><Brand /><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.closeButton}><AppSymbol name="xmark" fallback="close" size={17} color={colors.ink} weight="semibold" /></Pressable></View>
        <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.authKicker}>{mode === "signin" ? "WELCOME BACK" : "JOIN SMITTEN"}</Text><Text style={styles.authTitle}>{mode === "signin" ? "Your plans, right where you left them." : "Start planning something beautiful."}</Text><Text style={styles.authSubtitle}>{mode === "signin" ? "Sign in to continue your shortlist and checklist." : "Create one calm place for vendors, ideas and every detail."}</Text>
          <View style={styles.authSegment}>
            <Pressable onPress={() => changeMode("signin")} accessibilityRole="tab" accessibilityState={{ selected: mode === "signin" }} style={[styles.authSegmentItem, mode === "signin" && styles.authSegmentItemActive]}><Text style={[styles.authSegmentText, mode === "signin" && styles.authSegmentTextActive]}>Sign in</Text></Pressable>
            <Pressable onPress={() => changeMode("signup")} accessibilityRole="tab" accessibilityState={{ selected: mode === "signup" }} style={[styles.authSegmentItem, mode === "signup" && styles.authSegmentItemActive]}><Text style={[styles.authSegmentText, mode === "signup" && styles.authSegmentTextActive]}>Create account</Text></Pressable>
          </View>
          <Text style={styles.inputLabel}>I’M HERE TO</Text>
          <View style={styles.roleRow}><RoleCard symbol="heart" fallback="heart-outline" label="Plan a wedding" selected={role === "couple"} onPress={() => setRole("couple")} /><RoleCard symbol="storefront" fallback="briefcase-outline" label="Grow my business" selected={role === "vendor"} onPress={() => setRole("vendor")} /></View>
          {mode === "signup" ? <><Text style={styles.inputLabel}>YOUR NAME</Text><View style={[styles.authField, focusedField === "name" && styles.inputFocused]}><AppSymbol name="person" fallback="person-outline" size={18} color={colors.muted} weight="regular" /><TextInput value={name} onChangeText={setName} onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} style={styles.authFieldInput} placeholder="Your full name" placeholderTextColor="#96958F" autoCapitalize="words" textContentType="name" /></View></> : null}
          <Text style={styles.inputLabel}>EMAIL ADDRESS</Text><View style={[styles.authField, focusedField === "email" && styles.inputFocused]}><AppSymbol name="envelope" fallback="mail-outline" size={18} color={colors.muted} weight="regular" /><TextInput value={email} onChangeText={setEmail} onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} style={styles.authFieldInput} placeholder="you@example.com" placeholderTextColor="#96958F" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" /></View>
          <Text style={styles.inputLabel}>PASSWORD</Text><View style={[styles.authField, focusedField === "password" && styles.inputFocused]}><AppSymbol name="lock" fallback="lock-closed-outline" size={18} color={colors.muted} weight="regular" /><TextInput value={password} onChangeText={setPassword} onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} style={styles.authFieldInput} placeholder="Enter your password" placeholderTextColor="#96958F" secureTextEntry={!passwordVisible} textContentType={mode === "signin" ? "password" : "newPassword"} /><Pressable onPress={() => setPasswordVisible((current) => !current)} accessibilityRole="button" accessibilityLabel={passwordVisible ? "Hide password" : "Show password"} hitSlop={10}><AppSymbol name={passwordVisible ? "eye.slash" : "eye"} fallback={passwordVisible ? "eye-off-outline" : "eye-outline"} size={18} color={colors.muted} weight="regular" /></Pressable></View>
          {mode === "signup" ? <><Text style={styles.passwordHint}>8+ characters · 1 number · 1 special character</Text><Text style={styles.inputLabel}>CONFIRM PASSWORD</Text><View style={[styles.authField, focusedField === "confirm" && styles.inputFocused]}><AppSymbol name="lock.shield" fallback="shield-checkmark-outline" size={18} color={colors.muted} weight="regular" /><TextInput value={confirmPassword} onChangeText={setConfirmPassword} onFocus={() => setFocusedField("confirm")} onBlur={() => setFocusedField(null)} style={styles.authFieldInput} placeholder="Enter it again" placeholderTextColor="#96958F" secureTextEntry={!passwordVisible} textContentType="newPassword" /></View></> : <Pressable onPress={() => setError("Password reset will be available once account services are connected.")} accessibilityRole="button" style={styles.forgotButton}><Text style={styles.forgotText}>Forgot password?</Text></Pressable>}
          {error ? <Text style={styles.formError}>{error}</Text> : null}
          <Pressable onPress={submit} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}><Text style={styles.primaryButtonText}>{mode === "signin" ? "Sign in" : role === "vendor" ? "Join as a vendor" : "Create account"}</Text></Pressable>
          <Text style={styles.terms}>{mode === "signin" ? "Secure sign-in for your Smitten account." : "By creating an account, you agree to Smitten’s Terms and Privacy Policy."}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function NotificationsModal({ visible, darkMode, unreadCount, onClose, onMarkAllRead }: { visible: boolean; darkMode: boolean; unreadCount: number; onClose: () => void; onMarkAllRead: () => void }) {
  const notifications = [
    { symbol: "message" as const, fallback: "chatbubble-ellipses-outline" as const, title: "Aurora Events replied", body: "Your quote request has a new message.", time: "8 min ago" },
    { symbol: "wand.and.stars" as const, fallback: "sparkles-outline" as const, title: "Your Smitten shortlist is ready", body: "We found vendors that fit your wedding plans.", time: "Today" },
    { symbol: "calendar.badge.clock" as const, fallback: "calendar-outline" as const, title: "Planning reminder", body: "Choose a venue to keep your checklist moving.", time: "Yesterday" },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalScreen, darkMode && styles.modalScreenDark]}>
        <View style={styles.modalTop}>
          <View style={styles.modalHeading}>
            <View style={styles.modalHeadingIcon}><AppSymbol name="bell.badge" fallback="notifications-outline" size={22} color={colors.white} type="monochrome" weight="regular" /></View>
            <View><Text style={[styles.modalKicker, darkMode && styles.modalMutedDark]}>UPDATES FOR YOU</Text><Text style={[styles.modalTitle, darkMode && styles.modalTitleDark]}>Notifications</Text></View>
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close notifications" style={[styles.closeButton, darkMode && styles.closeButtonDark]}><AppSymbol name="xmark" fallback="close" size={17} color={darkMode ? colors.white : colors.ink} weight="semibold" /></Pressable>
        </View>
        <View style={styles.notificationSummary}>
          <Text style={[styles.notificationSummaryText, darkMode && styles.modalBodyDark]}>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You’re all caught up"}</Text>
          {unreadCount > 0 ? <Pressable onPress={onMarkAllRead} accessibilityRole="button" style={styles.markReadButton}><Text style={styles.markReadText}>Mark all read</Text></Pressable> : null}
        </View>
        <ScrollView contentContainerStyle={styles.notificationList} showsVerticalScrollIndicator={false}>
          {notifications.map((notification, index) => {
            const unread = index < unreadCount;
            return (
              <View key={notification.title} style={[styles.notificationRow, darkMode && styles.notificationRowDark, unread && (darkMode ? styles.notificationRowUnreadDark : styles.notificationRowUnread)]}>
                <View style={[styles.notificationIcon, darkMode && styles.notificationIconDark]}><AppSymbol name={notification.symbol} fallback={notification.fallback} size={21} color={darkMode ? "#E7E5E4" : colors.plum} type="monochrome" weight="regular" /></View>
                <View style={styles.notificationCopy}><View style={styles.notificationTitleRow}><Text style={[styles.notificationTitle, darkMode && styles.modalTitleDark]}>{notification.title}</Text>{unread ? <View accessibilityLabel="Unread" style={styles.unreadDot} /> : null}</View><Text style={[styles.notificationBody, darkMode && styles.modalBodyDark]}>{notification.body}</Text><Text style={styles.notificationTime}>{notification.time}</Text></View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SettingsModal({ visible, signedIn, darkMode, pushNotifications, planningReminders, onClose, onDarkMode, onPushNotifications, onPlanningReminders, onSignOut, onCloseAccount }: { visible: boolean; signedIn: boolean; darkMode: boolean; pushNotifications: boolean; planningReminders: boolean; onClose: () => void; onDarkMode: (value: boolean) => void; onPushNotifications: (value: boolean) => void; onPlanningReminders: (value: boolean) => void; onSignOut: () => void; onCloseAccount: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalScreen, darkMode && styles.modalScreenDark]}>
        <View style={styles.modalTop}>
          <View><Text style={[styles.modalKicker, darkMode && styles.modalMutedDark]}>YOUR PREFERENCES</Text><Text style={[styles.modalTitle, darkMode && styles.modalTitleDark]}>Settings</Text></View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close settings" style={[styles.closeButton, darkMode && styles.closeButtonDark]}><AppSymbol name="xmark" fallback="close" size={17} color={darkMode ? colors.white : colors.ink} weight="semibold" /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.settingsSectionLabel, darkMode && styles.modalMutedDark]}>NOTIFICATIONS</Text>
          <View style={[styles.settingsGroup, darkMode && styles.settingsGroupDark]}>
            <SettingsToggle symbol="bell" fallback="notifications-outline" title="Push notifications" subtitle="Messages, quotes and Smitten updates" value={pushNotifications} darkMode={darkMode} onChange={onPushNotifications} />
            <SettingsToggle symbol="calendar.badge.clock" fallback="calendar-outline" title="Planning reminders" subtitle="Helpful prompts for your checklist" value={planningReminders} darkMode={darkMode} onChange={onPlanningReminders} disabled={!pushNotifications} />
          </View>
          <Text style={[styles.settingsSectionLabel, darkMode && styles.modalMutedDark]}>APPEARANCE</Text>
          <View style={[styles.settingsGroup, darkMode && styles.settingsGroupDark]}>
            <SettingsToggle symbol="moon.stars" fallback="moon-outline" title="Dark mode" subtitle="Use a darker Smitten theme" value={darkMode} darkMode={darkMode} onChange={onDarkMode} />
          </View>
          <Text style={[styles.settingsSectionLabel, darkMode && styles.modalMutedDark]}>ACCOUNT</Text>
          <View style={[styles.settingsGroup, darkMode && styles.settingsGroupDark]}>
            <Pressable onPress={onSignOut} disabled={!signedIn} accessibilityRole="button" accessibilityState={{ disabled: !signedIn }} style={[styles.settingsAction, !signedIn && styles.settingsActionDisabled]}><View style={[styles.settingsIcon, darkMode && styles.settingsIconDark]}><AppSymbol name="rectangle.portrait.and.arrow.right" fallback="log-out-outline" size={20} color={darkMode ? colors.white : colors.plum} weight="medium" /></View><View style={styles.settingsCopy}><Text style={[styles.settingsTitle, darkMode && styles.modalTitleDark]}>{signedIn ? "Sign out" : "You’re signed out"}</Text><Text style={[styles.settingsSubtitle, darkMode && styles.modalBodyDark]}>Sign out of Smitten on this device</Text></View><AppSymbol name="chevron.right" fallback="chevron-forward" size={13} color={colors.muted} weight="semibold" /></Pressable>
            <Pressable onPress={onCloseAccount} disabled={!signedIn} accessibilityRole="button" accessibilityState={{ disabled: !signedIn }} style={[styles.settingsAction, !signedIn && styles.settingsActionDisabled]}><View style={styles.settingsDangerIcon}><AppSymbol name="trash" fallback="trash-outline" size={19} color="#B43C36" weight="medium" /></View><View style={styles.settingsCopy}><Text style={styles.settingsDangerTitle}>Close account</Text><Text style={[styles.settingsSubtitle, darkMode && styles.modalBodyDark]}>Permanently remove your Smitten profile</Text></View><AppSymbol name="chevron.right" fallback="chevron-forward" size={13} color="#B43C36" weight="semibold" /></Pressable>
          </View>
          {!signedIn ? <Text style={[styles.settingsFootnote, darkMode && styles.modalBodyDark]}>Sign in from your profile to manage account actions.</Text> : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SettingsToggle({ symbol, fallback, title, subtitle, value, darkMode, disabled = false, onChange }: { symbol: AppSymbolName; fallback: AppSymbolFallback; title: string; subtitle: string; value: boolean; darkMode: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={[styles.settingsAction, disabled && styles.settingsActionDisabled]}>
      <View style={[styles.settingsIcon, darkMode && styles.settingsIconDark]}><AppSymbol name={symbol} fallback={fallback} size={20} color={darkMode ? colors.white : colors.plum} type="monochrome" weight="regular" /></View>
      <View style={styles.settingsCopy}><Text style={[styles.settingsTitle, darkMode && styles.modalTitleDark]}>{title}</Text><Text style={[styles.settingsSubtitle, darkMode && styles.modalBodyDark]}>{subtitle}</Text></View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} accessibilityLabel={title} trackColor={{ false: darkMode ? "#454842" : "#D7DCCF", true: "#7F8969" }} thumbColor={colors.white} ios_backgroundColor={darkMode ? "#454842" : "#D7DCCF"} />
    </View>
  );
}

function LocationModal({ visible, selected, onClose, onSelect }: { visible: boolean; selected: string; onClose: () => void; onSelect: (city: string) => void }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.sheetBackdrop} onPress={onClose}><SafeAreaView style={styles.sheet} onStartShouldSetResponder={() => true}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><View><Text style={styles.sheetKicker}>YOUR LOCATION</Text><Text style={styles.sheetTitle}>Where are you planning?</Text></View><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close location selector" style={styles.closeButton}><AppSymbol name="xmark" fallback="close" size={17} color={colors.ink} weight="semibold" /></Pressable></View><View style={styles.locationOptions}>{weddingLocations.map((city) => <Pressable key={city} onPress={() => onSelect(city)} accessibilityRole="button" accessibilityState={{ selected: selected === city }} style={[styles.locationOption, selected === city && styles.locationOptionActive]}><AppSymbol name="location.fill" fallback="location-outline" size={18} color={colors.plum} type="hierarchical" weight="medium" /><Text style={styles.locationOptionText}>{city}</Text>{selected === city ? <AppSymbol name="checkmark.circle.fill" fallback="checkmark-circle" size={20} color={colors.coral} weight="semibold" /> : null}</Pressable>)}</View></SafeAreaView></Pressable></Modal>;
}

function VendorModal({ vendor, saved, onClose, onSave, onQuote }: { vendor: CoupleVendor | null; saved: boolean; onClose: () => void; onSave: () => void; onQuote: () => void }) {
  return <Modal visible={Boolean(vendor)} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>{vendor ? <SafeAreaView style={styles.vendorModal}><View style={styles.vendorModalTop}><Brand /><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close vendor profile" style={styles.closeButton}><AppSymbol name="xmark" fallback="close" size={17} color={colors.ink} weight="semibold" /></Pressable></View><ScrollView showsVerticalScrollIndicator={false}><Image source={{ uri: vendor.image }} style={styles.vendorModalImage} alt={`${vendor.name} portfolio`} /><View style={styles.vendorModalContent}><Text style={styles.vendorModalCategory}>{vendor.category}</Text><Text style={styles.vendorModalTitle}>{vendor.name}</Text><View style={styles.vendorModalMeta}><View style={styles.vendorModalLocation}><AppSymbol name="location.fill" fallback="location-outline" size={13} color={colors.muted} /><Text style={styles.vendorModalMetaText}>{vendor.location}</Text></View><View style={styles.vendorModalLocation}><AppSymbol name="star.fill" fallback="star" size={12} color={colors.gold} /><Text style={styles.vendorModalMetaText}>{vendor.rating} ({vendor.reviews})</Text></View></View><Text style={styles.vendorModalReason}>{vendor.reason}</Text><View style={styles.vendorModalFacts}><View style={styles.vendorFact}><Text style={styles.vendorFactLabel}>Starting price</Text><Text style={styles.vendorFactValue}>{vendor.price}</Text></View><View style={styles.vendorFact}><Text style={styles.vendorFactLabel}>Service level</Text><Text style={styles.vendorFactValue}>{vendor.tier}</Text></View></View><View style={styles.vendorModalActions}><Pressable onPress={onSave} accessibilityRole="button" accessibilityState={{ selected: saved }} style={styles.secondaryButton}><AppSymbol name={saved ? "heart.fill" : "heart"} fallback={saved ? "heart" : "heart-outline"} size={18} color={colors.plum} weight="medium" animationSpec={saved ? { effect: { type: "bounce", wholeSymbol: true }, repeating: false } : undefined} /><Text style={styles.secondaryButtonText}>{saved ? "Saved" : "Save"}</Text></Pressable><Pressable onPress={onQuote} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Request a quote</Text><AppSymbol name="arrow.right" fallback="arrow-forward" size={15} color={colors.white} weight="semibold" /></Pressable></View></View></ScrollView></SafeAreaView> : null}</Modal>;
}

function VendorPlanCard({ vendor, tone, tall = false, saved, score, onSave, onView }: { vendor: CoupleVendor; tone: "peach" | "blue" | "mint"; tall?: boolean; saved: boolean; score?: number; onSave: () => void; onView: () => void }) {
  void tone;
  return (
    <View style={[styles.vendorPlanCard, tall && styles.vendorPlanCardTall]}>
      <Image source={{ uri: vendor.image }} style={styles.vendorPlanImage} resizeMode="cover" alt={`${vendor.name} wedding portfolio`} />
      <LinearGradient colors={["rgba(14,16,13,0.02)", "rgba(14,16,13,0.2)", "rgba(14,16,13,0.86)"]} locations={[0.05, 0.44, 1]} style={styles.vendorPlanGradient} />
      <Pressable onPress={onView} accessibilityRole="button" accessibilityLabel={`View ${vendor.name} profile`} style={styles.vendorPlanContent}>
        <View style={styles.vendorPlanTop}><View style={styles.vendorPlanPill}><Text style={styles.vendorPlanPillText}>{score ? `${score}% match` : vendor.category}</Text></View></View>
        <View style={styles.vendorPlanCopy}><Text style={[styles.vendorPlanName, !tall && styles.vendorPlanNameCompact]} numberOfLines={2}>{vendor.name}</Text><Text style={styles.vendorPlanMeta}>{vendor.location} · {vendor.price}</Text></View>
      </Pressable>
      <Pressable onPress={onSave} accessibilityRole="button" accessibilityLabel={saved ? `Remove ${vendor.name} from saved vendors` : `Save ${vendor.name}`} style={[styles.vendorPlanSave, saved && styles.vendorPlanSaveActive]}><AppSymbol name={saved ? "heart.fill" : "heart"} fallback={saved ? "heart" : "heart-outline"} size={17} color={saved ? colors.white : colors.ink} weight="medium" animationSpec={saved ? { effect: { type: "bounce", wholeSymbol: true }, repeating: false } : undefined} /></Pressable>
    </View>
  );
}

function PlanningMetric({ tone, label, value }: { tone: "mint" | "blue" | "peach"; label: string; value: string }) {
  const toneStyle = tone === "mint" ? styles.metricMint : tone === "blue" ? styles.metricBlue : styles.metricPeach;
  return <View style={[styles.planMetric, toneStyle]}><Text style={styles.planMetricLabel}>{label}</Text><Text style={styles.planMetricValue}>{value}</Text></View>;
}

function ProfileMetric({ tone, label, value }: { tone: "mint" | "blue" | "peach"; label: string; value: string }) {
  const toneStyle = tone === "mint" ? styles.metricMint : tone === "blue" ? styles.metricBlue : styles.metricPeach;
  return <View style={[styles.profileMetric, toneStyle]}><Text style={styles.profileMetricLabel}>{label}</Text><Text style={styles.profileMetricValue}>{value}</Text></View>;
}

function Brand() { return <View style={styles.brand}><View style={styles.brandLogoShell}><Image source={smittenWordmark} style={styles.brandLogo} resizeMode="contain" accessibilityLabel="Smitten" alt="Smitten" /></View></View>; }
function PageHeader({ title, subtitle, darkMode = false }: { title: string; subtitle: string; darkMode?: boolean }) { return <View style={styles.pageHeader}><Text style={[styles.pageTitle, darkMode && styles.pageTitleDark]}>{title}</Text><Text style={[styles.pageSubtitle, darkMode && styles.pageSubtitleDark]}>{subtitle}</Text></View>; }
function SectionTitle({ kicker, title, compact = false, darkMode = false }: { kicker: string; title: string; compact?: boolean; darkMode?: boolean }) { return <View style={[styles.sectionHeading, compact && styles.sectionHeadingCompact]}><Text style={styles.sectionKicker}>{kicker}</Text><Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact, darkMode && styles.sectionTitleDark]}>{title}</Text></View>; }
function TrustItem({ symbol, fallback, text }: SymbolPair & { text: string }) { return <View style={styles.trustItem}><AppSymbol name={symbol} fallback={fallback} size={18} color={colors.coral} type="monochrome" weight="regular" /><Text style={styles.trustText}>{text}</Text></View>; }
function ChecklistItem({ label, checked = false, onPress }: { label: string; checked?: boolean; onPress: () => void }) { return <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked }} style={styles.checkRow}><View style={[styles.checkCircle, checked && styles.checkCircleDone]}>{checked ? <AppSymbol name="checkmark" fallback="checkmark" size={12} color={colors.white} weight="bold" /> : null}</View><Text style={[styles.checkLabel, checked && styles.checkLabelDone]}>{label}</Text><AppSymbol name="chevron.right" fallback="chevron-forward" size={13} color={colors.muted} weight="semibold" /></Pressable>; }
function ProfileLink({ symbol, fallback, text, onPress }: SymbolPair & { text: string; onPress: () => void }) { return <Pressable onPress={onPress} accessibilityRole="button" style={styles.profileLink}><View style={styles.profileLinkIcon}><AppSymbol name={symbol} fallback={fallback} size={20} color={colors.plum} type="monochrome" weight="regular" /></View><Text style={styles.profileLinkText}>{text}</Text><AppSymbol name="chevron.right" fallback="chevron-forward" size={13} color={colors.muted} weight="regular" /></Pressable>; }
function RoleCard({ symbol, fallback, label, selected, onPress }: SymbolPair & { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.roleCard, selected && styles.roleCardSelected]}><AppSymbol name={symbol} fallback={fallback} size={24} color={colors.plum} type="monochrome" weight={selected ? "medium" : "regular"} /><Text style={styles.roleLabel}>{label}</Text>{selected ? <AppSymbol name="checkmark.circle.fill" fallback="checkmark-circle" size={18} color={colors.coral} weight="semibold" style={styles.roleCheck} /> : null}</Pressable>; }

function TabButton({ tab, active, savedCount, darkMode, onPress }: { tab: Tab; active: boolean; savedCount: number; darkMode: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(active ? 1 : 0.96)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: active ? 1 : 0.96, damping: 16, stiffness: 220, mass: 0.75, useNativeDriver: true }).start();
  }, [active, scale]);
  const iconColor = active ? colors.ink : darkMode ? "rgba(255,255,255,0.62)" : colors.muted;
  return <Animated.View style={[styles.tabButtonMotion, { transform: [{ scale }] }]}><Pressable onPress={onPress} accessibilityRole="tab" accessibilityLabel={`${tab} tab`} accessibilityState={{ selected: active }} style={({ pressed }) => [styles.tabButton, active && styles.tabButtonActive, pressed && styles.tabButtonPressed]}><View>{savedCount > 0 ? <View style={styles.countBadge}><Text style={styles.countText}>{savedCount}</Text></View> : null}<TabVectorIcon tab={tab} active={active} color={iconColor} /></View><Text numberOfLines={1} style={[styles.tabLabel, darkMode && styles.tabLabelDark, active && styles.tabLabelActive]}>{tab}</Text></Pressable></Animated.View>;
}

function TabVectorIcon({ tab, active, color }: { tab: Tab; active: boolean; color: string }) {
  const icon = active ? tabIcons[tab].active : tabIcons[tab].base;

  return (
    <View style={[styles.tabIcon, active && styles.tabIconActive]}>
      <AppSymbol name={icon.symbol} fallback={icon.fallback} size={active ? 23 : 22} color={color} type="monochrome" weight={active ? "medium" : "regular"} />
    </View>
  );
}

function categorySymbol(category: string): SymbolPair {
  if (category === "Photography") return { symbol: "camera", fallback: "camera-outline" };
  if (category === "Venues") return { symbol: "building.2", fallback: "business-outline" };
  if (category === "Cakes & desserts") return { symbol: "birthday.cake", fallback: "cafe-outline" };
  if (category === "Bridal beauty") return { symbol: "paintbrush.pointed", fallback: "sparkles-outline" };
  if (category === "Planning & décor") return { symbol: "list.clipboard", fallback: "calendar-outline" };
  return { symbol: "square.grid.2x2", fallback: "grid-outline" };
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.cream },
  appDark: { backgroundColor: "#1B1816" },
  screen: { flex: 1 },
  scroll: { flex: 1, backgroundColor: colors.cream },
  darkScreen: { backgroundColor: "#1B1816" },
  scrollContent: { paddingBottom: 132 },
  safeScreen: { flex: 1, backgroundColor: colors.cream },
  pagePadding: { paddingHorizontal: 20, paddingBottom: 132 },
  header: { minHeight: 82, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  homeIdentity: { gap: 4 },
  homeLocation: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  homeLocationText: { color: colors.ink, fontFamily: mediumFont, fontWeight: "500", fontSize: 11 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { flexDirection: "row", alignItems: "center" },
  brandLogoShell: { width: 104, height: 32, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.plum },
  brandLogo: { width: "100%", height: "100%" },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  darkIconButton: { backgroundColor: "rgba(36,32,30,0.9)", borderColor: "rgba(255,255,255,0.08)" },
  notificationBadge: { minWidth: 16, height: 16, paddingHorizontal: 3, position: "absolute", right: -3, top: -3, borderRadius: 8, backgroundColor: "#E86F68", alignItems: "center", justifyContent: "center" },
  notificationBadgeText: { color: colors.white, fontFamily: boldFont, fontWeight: "700", fontSize: 8, lineHeight: 11 },
  matchHero: { height: 388, marginHorizontal: 16, overflow: "hidden", position: "relative", borderRadius: 24, backgroundColor: colors.plumDark, ...cardShadow },
  matchHeroImage: { position: "absolute", width: "100%", height: "100%" },
  matchHeroGradient: { position: "absolute", inset: 0 },
  matchHeroCopy: { flex: 1, zIndex: 2, padding: 24, justifyContent: "flex-end" },
  matchHeroBottom: { maxWidth: 320 },
  heroTitle: { maxWidth: 320, color: colors.white, fontFamily: headingFont, fontWeight: "600", fontSize: 36, lineHeight: 40, letterSpacing: -1.05 },
  heroText: { maxWidth: 290, color: "rgba(255,255,255,0.8)", fontFamily: appFont, fontWeight: "400", fontSize: 13, lineHeight: 20, marginTop: 10 },
  heroAction: { minHeight: 34, alignSelf: "flex-start", marginTop: 18, paddingHorizontal: 12, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", flexDirection: "row", alignItems: "center", gap: 7 },
  heroActionText: { color: colors.white, fontFamily: mediumFont, fontWeight: "500", fontSize: 11 },
  searchBar: { minHeight: 62, marginHorizontal: 20, marginTop: -25, zIndex: 3, paddingLeft: 18, paddingRight: 8, overflow: "hidden", borderRadius: 18, borderWidth: 1, borderColor: "rgba(18,19,16,0.07)", backgroundColor: "rgba(254,254,252,0.93)", flexDirection: "row", alignItems: "center", gap: 10, shadowColor: colors.ink, shadowOpacity: 0.09, shadowRadius: 20, shadowOffset: { width: 0, height: 9 }, elevation: 7 },
  searchInput: { flex: 1, color: colors.ink, fontFamily: appFont, fontWeight: "400", fontSize: 13, paddingVertical: 12 },
  searchFilter: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.input, alignItems: "center", justifyContent: "center" },
  inputFocused: { borderWidth: 1, borderColor: colors.green, backgroundColor: colors.white },
  sectionHeading: { marginHorizontal: 20, marginTop: 29, marginBottom: 16 },
  sectionHeadingCompact: { marginBottom: 0 },
  sectionKicker: { color: colors.green, fontFamily: headingFont, fontWeight: "600", fontSize: 9, letterSpacing: 1.25 },
  sectionTitle: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 30, lineHeight: 36, letterSpacing: -0.72, marginTop: 5 },
  sectionTitleCompact: { fontSize: 28, lineHeight: 34 },
  categoryScroll: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 8, gap: 8 },
  categoryCard: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: 8 },
  categoryCardActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  categoryText: { color: colors.ink, fontFamily: mediumFont, fontWeight: "500", fontSize: 11, lineHeight: 14 },
  categoryTextActive: { color: colors.white },
  sectionRow: { marginTop: 11, marginRight: 20, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  seeAll: { color: colors.ink, fontFamily: mediumFont, fontWeight: "500", fontSize: 12, paddingBottom: 3 },
  vendorMosaic: { minHeight: 386, marginHorizontal: 20, marginTop: 18, flexDirection: "row", gap: 10 },
  vendorMosaicSide: { flex: 1, gap: 10 },
  vendorPlanCard: { flex: 1, minHeight: 0, overflow: "hidden", position: "relative", borderRadius: 20, backgroundColor: colors.surfaceDark, ...cardShadow },
  vendorPlanCardTall: { flex: 1.08 },
  vendorPlanPeach: { backgroundColor: colors.peach },
  vendorPlanBlue: { backgroundColor: colors.blue },
  vendorPlanMint: { backgroundColor: colors.mint },
  vendorPlanImage: { position: "absolute", width: "100%", height: "100%" },
  vendorPlanGradient: { position: "absolute", inset: 0 },
  vendorPlanContent: { flex: 1, zIndex: 2, padding: 13, justifyContent: "space-between" },
  vendorPlanTop: { flexDirection: "row", alignItems: "center" },
  vendorPlanPill: { maxWidth: "75%", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 11, backgroundColor: "rgba(254,254,252,0.9)" },
  vendorPlanPillText: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 8, textTransform: "uppercase", letterSpacing: 0.55 },
  vendorPlanCopy: { marginTop: 13, paddingRight: 2 },
  vendorPlanCopyCompact: { marginTop: 10 },
  vendorPlanName: { color: colors.white, fontFamily: headingFont, fontWeight: "600", fontSize: 21, lineHeight: 25, letterSpacing: -0.5 },
  vendorPlanNameCompact: { fontSize: 15, lineHeight: 19, letterSpacing: -0.25 },
  vendorPlanMeta: { color: "rgba(255,255,255,0.72)", fontFamily: appFont, fontWeight: "400", fontSize: 10, lineHeight: 14, marginTop: 5 },
  vendorPlanImageTall: { position: "absolute", width: "100%", height: "100%" },
  vendorPlanSave: { width: 35, height: 35, position: "absolute", right: 12, bottom: 12, zIndex: 3, borderRadius: 18, backgroundColor: "rgba(254,254,252,0.9)", alignItems: "center", justifyContent: "center" },
  vendorPlanSaveActive: { backgroundColor: colors.plum },
  vendorExploreCard: { padding: 15, justifyContent: "space-between", backgroundColor: colors.mint },
  vendorExploreIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.58)", alignItems: "center", justifyContent: "center" },
  inlineEmpty: { margin: 20, padding: 28, alignItems: "center", borderRadius: 24, backgroundColor: colors.white, ...cardShadow },
  inlineEmptyTitle: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 20, marginTop: 10 },
  inlineEmptyText: { color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 6 },
  trustCard: { marginHorizontal: 20, marginTop: 24, padding: 24, borderRadius: 20, backgroundColor: colors.mint },
  trustKicker: { color: colors.green, fontFamily: headingFont, fontWeight: "600", fontSize: 9, letterSpacing: 1.15 },
  trustTitle: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 27, lineHeight: 32, letterSpacing: -0.65, marginTop: 7 },
  trustList: { gap: 12, marginTop: 20 },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 9 },
  trustText: { color: colors.ink, fontFamily: appFont, fontWeight: "400", fontSize: 12 },
  tabBar: { height: 70, position: "absolute", left: 16, right: 16, zIndex: 12, overflow: "hidden", paddingHorizontal: 6, paddingVertical: 6, borderRadius: 23, borderWidth: 1, borderColor: "rgba(18,19,16,0.08)", backgroundColor: "rgba(254,254,252,0.82)", flexDirection: "row", alignItems: "center", shadowColor: colors.ink, shadowOpacity: 0.1, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  tabBarDark: { borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(14,16,13,0.96)" },
  tabButtonMotion: { flex: 1, height: 58 },
  tabButton: { width: "100%", height: 58, minWidth: 0, borderRadius: 17, alignItems: "center", justifyContent: "center", gap: 2 },
  tabButtonActive: { backgroundColor: colors.mint },
  tabButtonPressed: { opacity: 0.72 },
  tabIcon: { width: 25, height: 25, alignItems: "center", justifyContent: "center" },
  tabIconActive: { transform: [{ translateY: -1 }] },
  tabLabel: { maxWidth: "100%", color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 8.5, letterSpacing: -0.05 },
  tabLabelActive: { color: colors.ink, fontFamily: headingFont, fontWeight: "600" },
  tabLabelDark: { color: "#A8A29E" },
  tabLabelActiveDark: { color: colors.white },
  tabDot: { display: "none" },
  tabDotActive: { backgroundColor: colors.green },
  tabDotActiveDark: { backgroundColor: colors.green },
  countBadge: { minWidth: 16, height: 16, paddingHorizontal: 3, position: "absolute", zIndex: 2, right: -8, top: -5, borderRadius: 8, backgroundColor: "#EB6F68", alignItems: "center", justifyContent: "center" },
  countText: { color: colors.white, fontFamily: boldFont, fontWeight: "700", fontSize: 8 },
  pageHeader: { paddingTop: 34, paddingBottom: 26 },
  pageTitle: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 40, lineHeight: 46, letterSpacing: -1.05 },
  pageSubtitle: { color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 13, lineHeight: 20, marginTop: 4 },
  pageTitleDark: { color: "#F8F9F2" },
  pageSubtitleDark: { color: "#AAA8B0" },
  sectionTitleDark: { color: "#F8F9F2" },
  fullSearch: { minHeight: 58, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: "transparent", backgroundColor: colors.input, flexDirection: "row", alignItems: "center", gap: 10 },
  filterRow: { gap: 8, paddingVertical: 16 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  filterChipActive: { borderColor: colors.plum, backgroundColor: colors.plum },
  filterText: { color: colors.ink, fontFamily: mediumFont, fontWeight: "500", fontSize: 11 },
  filterTextActive: { color: colors.white },
  resultCount: { color: colors.green, fontFamily: headingFont, fontWeight: "600", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  verticalList: { gap: 16 },
  emptyState: { alignItems: "center", paddingTop: 90, paddingHorizontal: 27 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.mint },
  emptyTitle: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 25, letterSpacing: -0.5, marginTop: 20 },
  emptyText: { color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 8 },
  emptyButton: { minHeight: 48, marginTop: 22, paddingHorizontal: 22, borderRadius: 14, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  emptyButtonText: { color: colors.white, fontFamily: headingFont, fontWeight: "600", fontSize: 12 },
  planProgressCard: { padding: 20, marginBottom: 10, borderRadius: 20, backgroundColor: colors.ink },
  planProgressHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  planProgressKicker: { color: "rgba(255,255,255,0.56)", fontFamily: headingFont, fontWeight: "600", fontSize: 9, letterSpacing: 1.15 },
  planProgressTitle: { color: colors.white, fontFamily: headingFont, fontWeight: "600", fontSize: 18, lineHeight: 23, marginTop: 7 },
  planProgressPercent: { color: colors.white, fontFamily: headingFont, fontWeight: "600", fontSize: 28, letterSpacing: -0.7 },
  planProgressTrack: { height: 5, overflow: "hidden", borderRadius: 3, marginTop: 20, backgroundColor: "rgba(255,255,255,0.16)" },
  planProgressFill: { height: "100%", borderRadius: 3, backgroundColor: "#D9E1CB" },
  planMetrics: { flexDirection: "row", gap: 8, marginBottom: 14 },
  planMetric: { flex: 1, minHeight: 86, padding: 13, borderRadius: 16, borderWidth: 1, borderColor: colors.border, justifyContent: "space-between" },
  metricMint: { backgroundColor: colors.mint },
  metricBlue: { backgroundColor: colors.blue },
  metricPeach: { backgroundColor: colors.peach },
  planMetricLabel: { color: "rgba(18,19,16,0.62)", fontFamily: appFont, fontWeight: "400", fontSize: 10, lineHeight: 13 },
  planMetricValue: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 16, lineHeight: 20 },
  planHero: { overflow: "hidden", position: "relative", padding: 24, marginTop: 2, marginBottom: 3, borderRadius: 20, backgroundColor: colors.white },
  planHeroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  planHeroEyebrow: { color: colors.green, fontFamily: headingFont, fontWeight: "600", fontSize: 9, letterSpacing: 1.15, marginTop: 22 },
  planHeroTitle: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 28, lineHeight: 34, letterSpacing: -0.56, marginTop: 6 },
  planHeroText: { color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 13, lineHeight: 20, marginTop: 8 },
  creamButton: { minHeight: 48, marginTop: 20, paddingHorizontal: 18, alignSelf: "flex-start", borderRadius: 14, backgroundColor: colors.plum, flexDirection: "row", alignItems: "center", gap: 8 },
  creamButtonText: { color: colors.white, fontFamily: headingFont, fontWeight: "600", fontSize: 12 },
  checklist: { overflow: "hidden", borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  checkRow: { minHeight: 70, paddingHorizontal: 17, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 13 },
  checkCircle: { width: 25, height: 25, borderRadius: 13, borderWidth: 1, borderColor: "#CFCAC6", alignItems: "center", justifyContent: "center" },
  checkCircleDone: { borderColor: colors.green, backgroundColor: colors.green },
  checkLabel: { flex: 1, color: colors.ink, fontFamily: mediumFont, fontWeight: "500", fontSize: 13 },
  checkLabelDone: { color: colors.muted, textDecorationLine: "line-through" },
  profileHeader: { minHeight: 66, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  profileHeaderSpacer: { width: 44, height: 44 },
  profileHeaderTitle: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 25, letterSpacing: -0.5 },
  profileSettingsButton: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  profileIdentity: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 16, paddingBottom: 19 },
  profileAvatar: { width: 66, height: 66, borderRadius: 22, position: "relative", backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { color: colors.white, fontFamily: headingFont, fontWeight: "600", fontSize: 26 },
  profileStatusDot: { width: 14, height: 14, position: "absolute", right: 0, bottom: 2, borderRadius: 7, borderWidth: 3, borderColor: colors.cream, backgroundColor: colors.mint },
  profileIdentityCopy: { flex: 1 },
  profileName: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 20, letterSpacing: -0.4 },
  profileLocation: { color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 12, lineHeight: 17, marginTop: 3 },
  profileMiniAction: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", ...cardShadow },
  profileMetrics: { flexDirection: "row", gap: 8 },
  profileMetric: { flex: 1, minHeight: 98, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, justifyContent: "space-between" },
  profileMetricLabel: { color: "rgba(18,19,16,0.64)", fontFamily: appFont, fontWeight: "400", fontSize: 10, lineHeight: 13 },
  profileMetricValue: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 25, lineHeight: 28 },
  profileSignIn: { marginTop: 15, padding: 18, borderRadius: 18, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: 12 },
  profileSignInCopy: { flex: 1 },
  profileSignInTitle: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 14 },
  profileSignInText: { color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 11, lineHeight: 16, marginTop: 3 },
  profileSignInButton: { minHeight: 42, paddingHorizontal: 15, borderRadius: 13, backgroundColor: colors.plum, flexDirection: "row", alignItems: "center", gap: 6 },
  profileSignInButtonText: { color: colors.white, fontFamily: headingFont, fontWeight: "600", fontSize: 11 },
  primaryButton: { width: "100%", minHeight: 52, borderRadius: 14, backgroundColor: colors.plum, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryButtonText: { color: colors.white, fontFamily: headingFont, fontWeight: "600", fontSize: 13 },
  profileLinks: { overflow: "hidden", marginTop: 17, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  profileLink: { minHeight: 68, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
  profileLinkIcon: { width: 40, height: 40, borderRadius: 15, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" },
  profileLinkText: { flex: 1, color: colors.ink, fontFamily: mediumFont, fontWeight: "500", fontSize: 13 },
  authScreen: { flex: 1, backgroundColor: colors.cream },
  authTop: { paddingHorizontal: 20, paddingTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  closeButtonDark: { backgroundColor: colors.surfaceDark, borderColor: "#2A2B33" },
  authContent: { paddingHorizontal: 22, paddingTop: 36, paddingBottom: 48 },
  authKicker: { color: colors.green, fontFamily: headingFont, fontWeight: "600", fontSize: 9, letterSpacing: 1.3 },
  authTitle: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 35, lineHeight: 41, letterSpacing: -0.9, marginTop: 9 },
  authSubtitle: { maxWidth: 335, color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 24 },
  authSegment: { height: 50, padding: 4, borderRadius: 15, backgroundColor: colors.input, flexDirection: "row", gap: 4, marginBottom: 9 },
  authSegmentItem: { flex: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  authSegmentItemActive: { backgroundColor: colors.white, ...cardShadow },
  authSegmentText: { color: colors.muted, fontFamily: mediumFont, fontWeight: "500", fontSize: 12 },
  authSegmentTextActive: { color: colors.ink, fontFamily: headingFont, fontWeight: "600" },
  roleRow: { flexDirection: "row", gap: 9, marginBottom: 9 },
  roleCard: { flex: 1, minHeight: 52, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: 8 },
  roleCardSelected: { borderColor: colors.green, backgroundColor: colors.mint },
  roleLabel: { flex: 1, color: colors.ink, fontFamily: mediumFont, fontWeight: "500", fontSize: 11, lineHeight: 15 },
  roleCheck: { marginLeft: "auto" },
  inputLabel: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 9, letterSpacing: 1.05, marginTop: 15, marginBottom: 8 },
  authField: { height: 56, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: "transparent", backgroundColor: colors.input, flexDirection: "row", alignItems: "center", gap: 10 },
  authFieldInput: { flex: 1, height: "100%", color: colors.ink, fontFamily: appFont, fontWeight: "400", fontSize: 14 },
  authInput: { height: 56, paddingHorizontal: 17, marginBottom: 4, borderRadius: 14, borderWidth: 1, borderColor: "transparent", backgroundColor: colors.input, color: colors.ink, fontFamily: appFont, fontWeight: "400", fontSize: 13 },
  passwordHint: { color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 10, lineHeight: 15, marginTop: 3, marginBottom: 12 },
  forgotButton: { alignSelf: "flex-end", paddingVertical: 12, paddingLeft: 12 },
  forgotText: { color: colors.green, fontFamily: mediumFont, fontWeight: "500", fontSize: 11 },
  formError: { color: "#9F332C", fontFamily: appFont, fontWeight: "400", fontSize: 11, lineHeight: 16, marginVertical: 10, padding: 12, borderRadius: 12, backgroundColor: "#F9E8E5" },
  primaryButtonPressed: { transform: [{ scale: 0.985 }], opacity: 0.88 },
  terms: { color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 9, lineHeight: 15, textAlign: "center", paddingHorizontal: 20, marginTop: 17 },
  modalScreen: { flex: 1, backgroundColor: colors.cream },
  modalScreenDark: { backgroundColor: "#1B1816" },
  modalTop: { minHeight: 90, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalHeadingIcon: { width: 46, height: 46, borderRadius: 18, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  modalKicker: { color: colors.green, fontFamily: headingFont, fontWeight: "600", fontSize: 9, letterSpacing: 1.2 },
  modalTitle: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 28, lineHeight: 34, letterSpacing: -0.56, marginTop: 2 },
  modalTitleDark: { color: "#F8F9F2" },
  modalBodyDark: { color: "#AAA8B0" },
  modalMutedDark: { color: "#B5B2BB" },
  notificationSummary: { minHeight: 43, marginHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  notificationSummaryText: { color: colors.muted, fontFamily: mediumFont, fontWeight: "500", fontSize: 12 },
  markReadButton: { minHeight: 36, paddingHorizontal: 12, justifyContent: "center" },
  markReadText: { color: colors.coral, fontFamily: mediumFont, fontWeight: "500", fontSize: 10 },
  notificationList: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 10 },
  notificationRow: { padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  notificationRowDark: { backgroundColor: colors.surfaceDark },
  notificationRowUnread: { backgroundColor: colors.lavenderSoft },
  notificationRowUnreadDark: { backgroundColor: "#29243C" },
  notificationIcon: { width: 43, height: 43, borderRadius: 17, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" },
  notificationIconDark: { backgroundColor: "#25262E" },
  notificationCopy: { flex: 1 },
  notificationTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  notificationTitle: { flex: 1, color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 13 },
  notificationBody: { color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 11, lineHeight: 17, marginTop: 4 },
  notificationTime: { color: colors.green, fontFamily: headingFont, fontWeight: "600", fontSize: 9, marginTop: 8 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#E86F68" },
  settingsContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  settingsSectionLabel: { color: colors.green, fontFamily: headingFont, fontWeight: "600", fontSize: 9, letterSpacing: 1.2, marginTop: 17, marginBottom: 8 },
  settingsGroup: { overflow: "hidden", borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  settingsGroupDark: { backgroundColor: colors.surfaceDark },
  settingsAction: { minHeight: 76, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
  settingsActionDisabled: { opacity: 0.48 },
  settingsIcon: { width: 42, height: 42, borderRadius: 17, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" },
  settingsIconDark: { backgroundColor: "#25262E" },
  settingsDangerIcon: { width: 42, height: 42, borderRadius: 17, backgroundColor: "#FFF1F0", alignItems: "center", justifyContent: "center" },
  settingsCopy: { flex: 1 },
  settingsTitle: { color: colors.ink, fontFamily: mediumFont, fontWeight: "500", fontSize: 13 },
  settingsDangerTitle: { color: "#B43C36", fontFamily: mediumFont, fontWeight: "500", fontSize: 11 },
  settingsSubtitle: { color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 10, lineHeight: 15, marginTop: 3 },
  settingsFootnote: { color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 9, lineHeight: 15, textAlign: "center", marginTop: 12 },
  toast: { minHeight: 50, position: "absolute", left: 20, right: 20, zIndex: 20, paddingHorizontal: 16, borderRadius: 25, backgroundColor: colors.plum, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  toastText: { flex: 1, color: colors.white, fontFamily: mediumFont, fontWeight: "500", fontSize: 11 },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.cream },
  sheetHandle: { width: 42, height: 4, alignSelf: "center", marginBottom: 18, borderRadius: 2, backgroundColor: colors.border },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  sheetKicker: { color: colors.green, fontFamily: headingFont, fontWeight: "600", fontSize: 9, letterSpacing: 1.2 },
  sheetTitle: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 26, letterSpacing: -0.52, marginTop: 4 },
  locationOptions: { gap: 9 },
  locationOption: { minHeight: 60, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: 10 },
  locationOptionActive: { borderColor: colors.green, backgroundColor: colors.mint },
  locationOptionText: { flex: 1, color: colors.ink, fontFamily: mediumFont, fontWeight: "500", fontSize: 13 },
  vendorModal: { flex: 1, backgroundColor: colors.cream },
  vendorModalTop: { minHeight: 66, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  vendorModalImage: { width: "100%", height: 390, backgroundColor: colors.blush },
  vendorModalContent: { padding: 22, paddingBottom: 42 },
  vendorModalCategory: { color: colors.green, fontFamily: headingFont, fontWeight: "600", fontSize: 10, letterSpacing: 1.05, textTransform: "uppercase" },
  vendorModalTitle: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 34, lineHeight: 40, letterSpacing: -0.68, marginTop: 7 },
  vendorModalMeta: { marginTop: 9, flexDirection: "row", justifyContent: "space-between" },
  vendorModalLocation: { flexDirection: "row", alignItems: "center", gap: 4 },
  vendorModalMetaText: { color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 12 },
  vendorModalReason: { color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 14, lineHeight: 22, marginTop: 20 },
  vendorModalFacts: { marginTop: 22, padding: 18, borderRadius: 18, backgroundColor: colors.mint, flexDirection: "row", gap: 35 },
  vendorFact: { flex: 1 },
  vendorFactLabel: { color: colors.muted, fontFamily: appFont, fontWeight: "400", fontSize: 10, lineHeight: 14 },
  vendorFactValue: { color: colors.ink, fontFamily: headingFont, fontWeight: "600", fontSize: 14, lineHeight: 19, marginTop: 4 },
  vendorModalActions: { gap: 10, marginTop: 22 },
  secondaryButton: { width: "100%", minHeight: 50, borderRadius: 14, borderWidth: 0, backgroundColor: colors.input, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  secondaryButtonText: { color: colors.plum, fontFamily: mediumFont, fontWeight: "500", fontSize: 12 }
});
