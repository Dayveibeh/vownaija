import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { coupleVendors, recommendCoupleVendors, serviceOptions, weddingLocations, type CoupleVendor } from "@smitten/shared";
import { AppSymbol, type AppSymbolFallback, type AppSymbolName } from "./src/components/AppSymbol";
import { MatchModal } from "./src/components/MatchModal";
import { VendorCard } from "./src/components/VendorCard";
import { colors } from "./src/theme";

type Tab = "Home" | "Discover" | "Saved" | "Planning" | "Profile";
type SymbolPair = { symbol: AppSymbolName; fallback: AppSymbolFallback };
type TabIconSet = { base: SymbolPair; active: SymbolPair };

const tabIcons: Record<Tab, TabIconSet> = {
  Home: { base: { symbol: "house", fallback: "home-outline" }, active: { symbol: "house.fill", fallback: "home" } },
  Discover: { base: { symbol: "safari", fallback: "compass-outline" }, active: { symbol: "safari.fill", fallback: "compass" } },
  Saved: { base: { symbol: "heart", fallback: "heart-outline" }, active: { symbol: "heart.fill", fallback: "heart" } },
  Planning: { base: { symbol: "calendar", fallback: "calendar-outline" }, active: { symbol: "calendar.badge.checkmark", fallback: "calendar" } },
  Profile: { base: { symbol: "person.crop.circle", fallback: "person-circle-outline" }, active: { symbol: "person.crop.circle.fill", fallback: "person-circle" } },
};

const heroImage = "https://static.wixstatic.com/media/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg/v1/fill/w_980%2Ch_980%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg";
const appFont = Platform.OS === "ios" ? "System" : "sans-serif";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const smittenWordmark = require("./assets/smitten-wordmark.png");

export default function App() {
  return <SafeAreaProvider><SmittenApp /></SafeAreaProvider>;
}

function SmittenApp() {
  const insets = useSafeAreaInsets();
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
          : <ProfileScreen darkMode={darkMode} signedIn={signedIn} openAuth={() => setAuthVisible(true)} openSettings={() => setSettingsVisible(true)} onAction={showNotice} />;

  return (
    <View style={[styles.app, darkMode && styles.appDark]}>
      <StatusBar style={darkMode ? "light" : "dark"} />
      <View style={styles.screen}>{screen}</View>
      <View style={[styles.tabBar, darkMode && styles.tabBarDark, { bottom: Math.max(insets.bottom, 10) }]}>
        {(["Home", "Discover", "Saved", "Planning", "Profile"] as Tab[]).map((item) => (
          <TabButton key={item} darkMode={darkMode} tab={item} active={tab === item} savedCount={item === "Saved" ? saved.length : 0} onPress={() => setTab(item)} />
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
  const vendors = useMemo(() => (matches ?? coupleVendors).filter((vendor) => {
    const locationMatch = vendor.location === location;
    const categoryMatch = category === "All" || vendor.category === category;
    const queryMatch = !query.trim() || `${vendor.name} ${vendor.category}`.toLowerCase().includes(query.trim().toLowerCase());
    return locationMatch && categoryMatch && queryMatch;
  }), [category, location, matches, query]);

  return (
    <ScrollView style={[styles.scroll, darkMode && styles.darkScreen]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}><Brand /><View style={styles.headerActions}><Pressable onPress={openNotifications} accessibilityRole="button" accessibilityLabel={`${unreadNotifications} unread notifications`} style={[styles.avatar, darkMode && styles.darkIconButton]}><AppSymbol name={unreadNotifications > 0 ? "bell.badge.fill" : "bell"} fallback={unreadNotifications > 0 ? "notifications" : "notifications-outline"} size={20} color={darkMode ? colors.white : colors.plum} type="hierarchical" weight="medium" animationSpec={unreadNotifications > 0 ? { effect: { type: "pulse", wholeSymbol: true }, repeating: false } : undefined} />{unreadNotifications > 0 ? <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{unreadNotifications}</Text></View> : null}</Pressable><Pressable onPress={openAuth} accessibilityRole="button" accessibilityLabel="Sign in" style={[styles.avatar, darkMode && styles.darkIconButton]}><AppSymbol name="person.crop.circle" fallback="person-circle-outline" size={21} color={darkMode ? colors.white : colors.plum} weight="medium" /></Pressable></View></View>
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
        <AppSymbol name="magnifyingglass" fallback="search" size={18} color={colors.plum} weight="medium" />
        <TextInput value={query} onChangeText={onQuery} placeholder="Photographer, venue, caterer..." placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search" />
        <View style={styles.searchDivider} />
        <Pressable onPress={openLocation} accessibilityRole="button" accessibilityLabel={`Change location, currently ${location}`} style={styles.locationButton}><AppSymbol name="location.fill" fallback="location-outline" size={16} color={colors.plum} weight="medium" /><Text numberOfLines={1} style={styles.searchLocation}>{location}</Text><AppSymbol name="chevron.down" fallback="chevron-down" size={11} color={colors.muted} weight="semibold" /></Pressable>
      </View>
      <Pressable onPress={openMatch} accessibilityRole="button" style={styles.vowiCard}>
        <View style={styles.vowiIcon}><AppSymbol name="wand.and.stars" fallback="sparkles" size={21} color={colors.white} weight="semibold" type="hierarchical" /></View>
        <View style={styles.vowiCopy}><Text style={styles.vowiKicker}>NOT SURE WHERE TO START?</Text><Text style={styles.vowiTitle}>Let Smitten find your best matches</Text></View>
        <AppSymbol name="arrow.right" fallback="arrow-forward" size={18} color={colors.plum} weight="semibold" />
      </Pressable>
      <SectionTitle darkMode={darkMode} kicker="BROWSE BY SERVICE" title="Everything you need, all in one place." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
        {["All", ...serviceOptions].map((item) => {
          const icon = categorySymbol(item);
          return (
            <Pressable key={item} onPress={() => onCategory(item)} accessibilityRole="button" accessibilityState={{ selected: category === item }} style={[styles.categoryCard, category === item && styles.categoryCardActive]}>
              <AppSymbol name={icon.symbol} fallback={icon.fallback} size={21} color={category === item ? colors.white : colors.plum} weight={category === item ? "semibold" : "regular"} type={category === item ? "hierarchical" : "monochrome"} />
              <Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item === "All" ? "All services" : item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.sectionRow}>
        <SectionTitle darkMode={darkMode} kicker={matches ? "CHOSEN AROUND YOUR PLANS" : "CURATED FOR YOU"} title={matches ? "Your Smitten shortlist" : `Popular around ${location}`} compact />
        <Pressable onPress={openDiscover} accessibilityRole="button"><Text style={styles.seeAll}>See all</Text></Pressable>
      </View>
      {vendors.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vendorScroll}>
        {vendors.map((vendor) => {
          const score = matches ? (vendor as CoupleVendor & { score: number }).score : undefined;
          return <VendorCard key={vendor.name} vendor={vendor} saved={saved.includes(vendor.name)} score={score} onSave={() => onSave(vendor.name)} onView={() => onView(vendor)} />;
        })}
      </ScrollView> : <View style={styles.inlineEmpty}><AppSymbol name="mappin.and.ellipse" fallback="location-outline" size={26} color={colors.coral} weight="medium" /><Text style={styles.inlineEmptyTitle}>No exact matches in {location} yet</Text><Text style={styles.inlineEmptyText}>Try another service or tap the location above to browse another city.</Text></View>}
      <View style={styles.trustCard}>
        <Text style={styles.trustKicker}>PLAN WITH CONFIDENCE</Text><Text style={styles.trustTitle}>Clear choices for your kind of wedding.</Text>
        <View style={styles.trustList}><TrustItem symbol="checkmark.seal.fill" fallback="checkmark-circle" text="Verified vendor profiles" /><TrustItem symbol="banknote.fill" fallback="wallet-outline" text="Options for every budget" /><TrustItem symbol="message.fill" fallback="chatbubble-ellipses-outline" text="Simple, protected enquiries" /></View>
      </View>
    </ScrollView>
  );
}

function DiscoverScreen({ darkMode, saved, onSave, onView }: { darkMode: boolean; saved: string[]; onSave: (name: string) => void; onView: (vendor: CoupleVendor) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const results = useMemo(() => coupleVendors.filter((vendor) => {
    const categoryMatch = category === "All" || vendor.category === category;
    const queryMatch = !query || `${vendor.name} ${vendor.location} ${vendor.category}`.toLowerCase().includes(query.toLowerCase());
    return categoryMatch && queryMatch;
  }), [category, query]);

  return (
    <SafeAreaView style={[styles.safeScreen, darkMode && styles.darkScreen]} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pagePadding}>
        <PageHeader darkMode={darkMode} title="Discover" subtitle="Find the people who’ll make your day." />
        <View style={styles.fullSearch}><AppSymbol name="magnifyingglass" fallback="search" size={18} color={colors.plum} weight="medium" /><TextInput value={query} onChangeText={setQuery} placeholder="Search vendors or locations" placeholderTextColor={colors.muted} style={styles.searchInput} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {["All", ...serviceOptions].map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.filterChip, category === item && styles.filterChipActive]}><Text style={[styles.filterText, category === item && styles.filterTextActive]}>{item}</Text></Pressable>)}
        </ScrollView>
        <Text style={styles.resultCount}>{results.length} trusted vendors</Text>
        {results.length > 0 ? <View style={styles.verticalList}>{results.map((vendor) => <VendorCard key={vendor.name} fullWidth vendor={vendor} saved={saved.includes(vendor.name)} onSave={() => onSave(vendor.name)} onView={() => onView(vendor)} />)}</View> : <View style={styles.emptyState}><View style={styles.emptyIcon}><AppSymbol name="magnifyingglass" fallback="search-outline" size={28} color={colors.plum} weight="light" /></View><Text style={styles.emptyTitle}>No matches yet</Text><Text style={styles.emptyText}>Try a broader search or choose All services.</Text></View>}
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
          ? <View style={styles.verticalList}>{savedVendors.map((vendor) => <VendorCard key={vendor.name} fullWidth vendor={vendor} saved onSave={() => onSave(vendor.name)} onView={() => onView(vendor)} />)}</View>
          : <View style={styles.emptyState}><View style={styles.emptyIcon}><AppSymbol name="heart" fallback="heart-outline" size={29} color={colors.plum} weight="light" /></View><Text style={styles.emptyTitle}>Your shortlist starts here</Text><Text style={styles.emptyText}>Tap the heart on any vendor to save them and compare your favourites.</Text><Pressable onPress={openDiscover} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Discover vendors</Text></Pressable></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanningScreen({ darkMode, checklist, onToggle, openMatch }: { darkMode: boolean; checklist: boolean[]; onToggle: (index: number) => void; openMatch: () => void }) {
  const labels = ["Set an overall budget", "Choose a venue", "Book photography", "Confirm catering", "Find your music & DJ"];
  return (
    <SafeAreaView style={[styles.safeScreen, darkMode && styles.darkScreen]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.pagePadding} showsVerticalScrollIndicator={false}>
        <PageHeader darkMode={darkMode} title="Planning" subtitle="One calm place for all the details." />
        <View style={styles.planHero}><AppSymbol name="wand.and.stars" fallback="sparkles" size={24} color={colors.white} type="hierarchical" weight="semibold" /><Text style={styles.planHeroTitle}>Build your vendor shortlist with Smitten</Text><Text style={styles.planHeroText}>Three quick questions turn your plans into personal recommendations.</Text><Pressable onPress={openMatch} style={styles.creamButton}><Text style={styles.creamButtonText}>Find my matches</Text><AppSymbol name="arrow.right" fallback="arrow-forward" size={15} color={colors.plum} weight="semibold" /></Pressable></View>
        <SectionTitle darkMode={darkMode} kicker="YOUR WEDDING" title="Planning checklist" />
        <View style={styles.checklist}>{labels.map((label, index) => <ChecklistItem key={label} checked={checklist[index]} label={label} onPress={() => onToggle(index)} />)}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileScreen({ darkMode, signedIn, openAuth, openSettings, onAction }: { darkMode: boolean; signedIn: boolean; openAuth: () => void; openSettings: () => void; onAction: (message: string) => void }) {
  return (
    <SafeAreaView style={[styles.safeScreen, darkMode && styles.darkScreen]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.pagePadding}>
        <PageHeader darkMode={darkMode} title="Your Smitten" subtitle="Save plans and make the app yours." />
        <View style={styles.profileCard}><View style={styles.profileIcon}><AppSymbol name={signedIn ? "checkmark.seal.fill" : "person.crop.circle"} fallback={signedIn ? "checkmark-circle" : "person-outline"} size={30} color={colors.plum} type="hierarchical" weight="medium" /></View><Text style={styles.profileTitle}>{signedIn ? "You’re signed in" : "Sign in to keep planning"}</Text><Text style={styles.profileText}>{signedIn ? "Your favourites, Smitten shortlist and checklist are ready on this device." : "Sync your saved vendors, Smitten shortlist and wedding checklist across devices."}</Text><Pressable onPress={signedIn ? () => onAction("Your Smitten profile is up to date") : openAuth} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{signedIn ? "View account status" : "Sign in or create account"}</Text></Pressable></View>
        <View style={styles.profileLinks}><ProfileLink symbol="gearshape" fallback="settings-outline" text="Settings" onPress={openSettings}/><ProfileLink symbol="storefront.fill" fallback="briefcase-outline" text="I’m a wedding vendor" onPress={() => onAction("Vendor onboarding will open on smitten.ng")}/><ProfileLink symbol="questionmark.circle.fill" fallback="help-circle-outline" text="Help & support" onPress={() => onAction("Support request started")}/><ProfileLink symbol="hand.raised.fill" fallback="shield-checkmark-outline" text="Privacy & safety" onPress={() => onAction("Privacy & safety centre opened")}/></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AuthModal({ visible, onClose, onComplete }: { visible: boolean; onClose: () => void; onComplete: () => void }) {
  const [role, setRole] = useState<"couple" | "vendor">("couple");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (!email.includes("@") || password.length < 6) {
      setError("Enter a valid email and at least 6 password characters.");
      return;
    }
    setError("");
    onComplete();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.authScreen}>
        <View style={styles.authTop}><Brand /><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.closeButton}><AppSymbol name="xmark" fallback="close" size={17} color={colors.ink} weight="semibold" /></Pressable></View>
        <ScrollView contentContainerStyle={styles.authContent}>
          <Text style={styles.authKicker}>WELCOME TO SMITTEN</Text><Text style={styles.authTitle}>Plan beautifully, together.</Text><Text style={styles.authSubtitle}>Choose how you use Smitten to continue.</Text>
          <View style={styles.roleRow}><RoleCard symbol="heart" fallback="heart-outline" label="Planning a wedding" selected={role === "couple"} onPress={() => setRole("couple")} /><RoleCard symbol="storefront" fallback="briefcase-outline" label="Wedding vendor" selected={role === "vendor"} onPress={() => setRole("vendor")} /></View>
          <Text style={styles.inputLabel}>EMAIL ADDRESS</Text><TextInput value={email} onChangeText={setEmail} style={styles.authInput} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.inputLabel}>PASSWORD</Text><TextInput value={password} onChangeText={setPassword} style={styles.authInput} placeholder="••••••••" secureTextEntry />
          {error ? <Text style={styles.formError}>{error}</Text> : null}
          <Pressable onPress={submit} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Continue</Text><AppSymbol name="arrow.right" fallback="arrow-forward" size={16} color={colors.white} weight="semibold" /></Pressable>
          <Text style={styles.terms}>By continuing, you agree to Smitten’s Terms and Privacy Policy.</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function NotificationsModal({ visible, darkMode, unreadCount, onClose, onMarkAllRead }: { visible: boolean; darkMode: boolean; unreadCount: number; onClose: () => void; onMarkAllRead: () => void }) {
  const notifications = [
    { symbol: "message.fill" as const, fallback: "chatbubble-ellipses-outline" as const, title: "Aurora Events replied", body: "Your quote request has a new message.", time: "8 min ago" },
    { symbol: "wand.and.stars" as const, fallback: "sparkles-outline" as const, title: "Your Smitten shortlist is ready", body: "We found vendors that fit your wedding plans.", time: "Today" },
    { symbol: "calendar.badge.clock" as const, fallback: "calendar-outline" as const, title: "Planning reminder", body: "Choose a venue to keep your checklist moving.", time: "Yesterday" },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalScreen, darkMode && styles.modalScreenDark]}>
        <View style={styles.modalTop}>
          <View style={styles.modalHeading}>
            <View style={styles.modalHeadingIcon}><AppSymbol name="bell.badge.fill" fallback="notifications" size={22} color={colors.white} type="hierarchical" weight="semibold" /></View>
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
              <View key={notification.title} style={[styles.notificationRow, darkMode && styles.notificationRowDark, unread && styles.notificationRowUnread]}>
                <View style={[styles.notificationIcon, darkMode && styles.notificationIconDark]}><AppSymbol name={notification.symbol} fallback={notification.fallback} size={21} color={darkMode ? "#DCE4CA" : colors.plum} type="hierarchical" weight="medium" /></View>
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
      <View style={[styles.settingsIcon, darkMode && styles.settingsIconDark]}><AppSymbol name={symbol} fallback={fallback} size={20} color={darkMode ? colors.white : colors.plum} type="hierarchical" weight="medium" /></View>
      <View style={styles.settingsCopy}><Text style={[styles.settingsTitle, darkMode && styles.modalTitleDark]}>{title}</Text><Text style={[styles.settingsSubtitle, darkMode && styles.modalBodyDark]}>{subtitle}</Text></View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} accessibilityLabel={title} trackColor={{ false: darkMode ? "#454842" : "#D7DCCF", true: "#7F8969" }} thumbColor={colors.white} ios_backgroundColor={darkMode ? "#454842" : "#D7DCCF"} />
    </View>
  );
}

function LocationModal({ visible, selected, onClose, onSelect }: { visible: boolean; selected: string; onClose: () => void; onSelect: (city: string) => void }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.sheetBackdrop} onPress={onClose}><SafeAreaView style={styles.sheet} onStartShouldSetResponder={() => true}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><View><Text style={styles.sheetKicker}>YOUR LOCATION</Text><Text style={styles.sheetTitle}>Where are you planning?</Text></View><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close location selector" style={styles.closeButton}><AppSymbol name="xmark" fallback="close" size={17} color={colors.ink} weight="semibold" /></Pressable></View><View style={styles.locationOptions}>{weddingLocations.map((city) => <Pressable key={city} onPress={() => onSelect(city)} accessibilityRole="button" accessibilityState={{ selected: selected === city }} style={[styles.locationOption, selected === city && styles.locationOptionActive]}><AppSymbol name="location.fill" fallback="location-outline" size={18} color={colors.plum} type="hierarchical" weight="medium" /><Text style={styles.locationOptionText}>{city}</Text>{selected === city ? <AppSymbol name="checkmark.circle.fill" fallback="checkmark-circle" size={20} color={colors.coral} weight="semibold" /> : null}</Pressable>)}</View></SafeAreaView></Pressable></Modal>;
}

function VendorModal({ vendor, saved, onClose, onSave, onQuote }: { vendor: CoupleVendor | null; saved: boolean; onClose: () => void; onSave: () => void; onQuote: () => void }) {
  return <Modal visible={Boolean(vendor)} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>{vendor ? <SafeAreaView style={styles.vendorModal}><View style={styles.vendorModalTop}><Brand /><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close vendor profile" style={styles.closeButton}><AppSymbol name="xmark" fallback="close" size={17} color={colors.ink} weight="semibold" /></Pressable></View><ScrollView showsVerticalScrollIndicator={false}><Image source={{ uri: vendor.image }} style={styles.vendorModalImage} alt={`${vendor.name} portfolio`} /><View style={styles.vendorModalContent}><Text style={styles.vendorModalCategory}>{vendor.category}</Text><Text style={styles.vendorModalTitle}>{vendor.name}</Text><View style={styles.vendorModalMeta}><View style={styles.vendorModalLocation}><AppSymbol name="location.fill" fallback="location-outline" size={13} color={colors.muted} /><Text style={styles.vendorModalMetaText}>{vendor.location}</Text></View><View style={styles.vendorModalLocation}><AppSymbol name="star.fill" fallback="star" size={12} color={colors.gold} /><Text style={styles.vendorModalMetaText}>{vendor.rating} ({vendor.reviews})</Text></View></View><Text style={styles.vendorModalReason}>{vendor.reason}</Text><View style={styles.vendorModalFacts}><View><Text>Starting price</Text><Text>{vendor.price}</Text></View><View><Text>Service level</Text><Text>{vendor.tier}</Text></View></View><View style={styles.vendorModalActions}><Pressable onPress={onSave} accessibilityRole="button" accessibilityState={{ selected: saved }} style={styles.secondaryButton}><AppSymbol name={saved ? "heart.fill" : "heart"} fallback={saved ? "heart" : "heart-outline"} size={18} color={colors.plum} weight="medium" animationSpec={saved ? { effect: { type: "bounce", wholeSymbol: true }, repeating: false } : undefined} /><Text style={styles.secondaryButtonText}>{saved ? "Saved" : "Save"}</Text></Pressable><Pressable onPress={onQuote} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Request a quote</Text><AppSymbol name="arrow.right" fallback="arrow-forward" size={15} color={colors.white} weight="semibold" /></Pressable></View></View></ScrollView></SafeAreaView> : null}</Modal>;
}

function Brand() { return <View style={styles.brand}><View style={styles.brandLogoShell}><Image source={smittenWordmark} style={styles.brandLogo} resizeMode="contain" accessibilityLabel="Smitten" alt="Smitten" /></View></View>; }
function PageHeader({ title, subtitle, darkMode = false }: { title: string; subtitle: string; darkMode?: boolean }) { return <View style={styles.pageHeader}><Text style={[styles.pageTitle, darkMode && styles.pageTitleDark]}>{title}</Text><Text style={[styles.pageSubtitle, darkMode && styles.pageSubtitleDark]}>{subtitle}</Text></View>; }
function SectionTitle({ kicker, title, compact = false, darkMode = false }: { kicker: string; title: string; compact?: boolean; darkMode?: boolean }) { return <View style={[styles.sectionHeading, compact && styles.sectionHeadingCompact]}><Text style={styles.sectionKicker}>{kicker}</Text><Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact, darkMode && styles.sectionTitleDark]}>{title}</Text></View>; }
function TrustItem({ symbol, fallback, text }: SymbolPair & { text: string }) { return <View style={styles.trustItem}><AppSymbol name={symbol} fallback={fallback} size={18} color="#B8C4A4" type="hierarchical" weight="semibold" /><Text style={styles.trustText}>{text}</Text></View>; }
function ChecklistItem({ label, checked = false, onPress }: { label: string; checked?: boolean; onPress: () => void }) { return <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked }} style={styles.checkRow}><View style={[styles.checkCircle, checked && styles.checkCircleDone]}>{checked ? <AppSymbol name="checkmark" fallback="checkmark" size={12} color={colors.white} weight="bold" /> : null}</View><Text style={[styles.checkLabel, checked && styles.checkLabelDone]}>{label}</Text><AppSymbol name="chevron.right" fallback="chevron-forward" size={13} color={colors.muted} weight="semibold" /></Pressable>; }
function ProfileLink({ symbol, fallback, text, onPress }: SymbolPair & { text: string; onPress: () => void }) { return <Pressable onPress={onPress} accessibilityRole="button" style={styles.profileLink}><View style={styles.profileLinkIcon}><AppSymbol name={symbol} fallback={fallback} size={20} color={colors.plum} type="hierarchical" weight="medium" /></View><Text style={styles.profileLinkText}>{text}</Text><AppSymbol name="chevron.right" fallback="chevron-forward" size={13} color={colors.muted} weight="semibold" /></Pressable>; }
function RoleCard({ symbol, fallback, label, selected, onPress }: SymbolPair & { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.roleCard, selected && styles.roleCardSelected]}><AppSymbol name={symbol} fallback={fallback} size={24} color={colors.plum} type="hierarchical" weight={selected ? "semibold" : "regular"} /><Text style={styles.roleLabel}>{label}</Text>{selected ? <AppSymbol name="checkmark.circle.fill" fallback="checkmark-circle" size={18} color={colors.coral} weight="semibold" style={styles.roleCheck} /> : null}</Pressable>; }

function TabButton({ tab, active, savedCount, darkMode, onPress }: { tab: Tab; active: boolean; savedCount: number; darkMode: boolean; onPress: () => void }) {
  const iconColor = active ? (darkMode ? colors.ink : colors.white) : (darkMode ? "#A1A1A1" : "#666666");
  return <Pressable onPress={onPress} accessibilityRole="tab" accessibilityLabel={`${tab} tab`} accessibilityState={{ selected: active }} style={[styles.tabButton, active && styles.tabButtonActive, active && darkMode && styles.tabButtonActiveDark]}><View>{savedCount > 0 && <View style={styles.countBadge}><Text style={styles.countText}>{savedCount}</Text></View>}<TabVectorIcon tab={tab} active={active} color={iconColor} /></View><Text numberOfLines={1} style={[styles.tabLabel, darkMode && styles.tabLabelDark, active && styles.tabLabelActive, active && darkMode && styles.tabLabelActiveDark]}>{tab}</Text></Pressable>;
}

function TabVectorIcon({ tab, active, color }: { tab: Tab; active: boolean; color: string }) {
  const icon = active ? tabIcons[tab].active : tabIcons[tab].base;

  return (
    <View style={[styles.tabIcon, active && styles.tabIconActive]}>
      <AppSymbol name={icon.symbol} fallback={icon.fallback} size={active ? 24 : 22} color={color} type={active ? "hierarchical" : "monochrome"} weight={active ? "semibold" : "regular"} animationSpec={active ? { effect: { type: "bounce", wholeSymbol: true }, repeating: false, speed: 1.15 } : undefined} />
    </View>
  );
}

function categorySymbol(category: string): SymbolPair {
  if (category === "Photography") return { symbol: "camera.fill", fallback: "camera-outline" };
  if (category === "Venues") return { symbol: "building.2.fill", fallback: "business-outline" };
  if (category === "Cakes & desserts") return { symbol: "birthday.cake.fill", fallback: "cafe-outline" };
  if (category === "Bridal beauty") return { symbol: "paintbrush.pointed.fill", fallback: "sparkles-outline" };
  if (category === "Planning & décor") return { symbol: "list.clipboard.fill", fallback: "calendar-outline" };
  return { symbol: "square.grid.2x2", fallback: "grid-outline" };
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.cream },
  appDark: { backgroundColor: "#000000" },
  screen: { flex: 1 },
  scroll: { flex: 1, backgroundColor: colors.cream },
  darkScreen: { backgroundColor: "#0A0A0A" },
  scrollContent: { paddingBottom: 132 },
  safeScreen: { flex: 1, backgroundColor: colors.cream },
  pagePadding: { paddingHorizontal: 18, paddingBottom: 132 },
  header: { height: 62, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { flexDirection: "row", alignItems: "center" },
  brandLogoShell: { width: 112, height: 34, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, backgroundColor: colors.plum },
  brandLogo: { width: "100%", height: "100%" },
  avatar: { width: 38, height: 38, borderRadius: 9, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  darkIconButton: { backgroundColor: "#1A1A1A", borderColor: "#333333" },
  notificationBadge: { minWidth: 15, height: 15, paddingHorizontal: 3, position: "absolute", right: -4, top: -4, borderRadius: 8, backgroundColor: "#C85E52", alignItems: "center", justifyContent: "center" },
  notificationBadgeText: { color: colors.white, fontSize: 8, lineHeight: 11, fontWeight: "900" },
  hero: { height: 344, marginHorizontal: 14, overflow: "hidden", position: "relative", borderRadius: 14, borderWidth: 1, borderColor: "#222222", backgroundColor: colors.plumDark },
  heroImage: { position: "absolute", width: "100%", height: "100%" },
  heroShade: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.48)" },
  heroCopy: { position: "absolute", left: 23, right: 23, bottom: 26 },
  heroKicker: { color: "#DDE4D0", fontSize: 8, fontWeight: "700", letterSpacing: 1.2 },
  heroTitle: { maxWidth: 315, color: colors.white, fontFamily: appFont, fontSize: 35, lineHeight: 40, fontWeight: "600", letterSpacing: -1.2, marginTop: 8 },
  heroText: { maxWidth: 285, color: "rgba(255,255,255,0.8)", fontSize: 11, lineHeight: 17, marginTop: 8 },
  searchBar: { minHeight: 57, marginHorizontal: 25, marginTop: -18, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: colors.plumDark, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 11, paddingVertical: 12 },
  searchDivider: { width: 1, height: 25, backgroundColor: colors.border },
  locationButton: { maxWidth: 112, minHeight: 40, flexDirection: "row", alignItems: "center", gap: 4 },
  searchLocation: { maxWidth: 68, color: colors.ink, fontSize: 10, fontWeight: "700" },
  vowiCard: { marginHorizontal: 18, marginTop: 24, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: 11 },
  vowiIcon: { width: 42, height: 42, borderRadius: 8, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  vowiCopy: { flex: 1 },
  vowiKicker: { color: colors.muted, fontSize: 8, fontWeight: "600", letterSpacing: 0.8 },
  vowiTitle: { color: colors.ink, fontSize: 12, fontWeight: "700", marginTop: 3 },
  sectionHeading: { marginHorizontal: 18, marginTop: 27, marginBottom: 15 },
  sectionHeadingCompact: { marginBottom: 0 },
  sectionKicker: { color: colors.muted, fontSize: 8, fontWeight: "600", letterSpacing: 1.1 },
  sectionTitle: { color: colors.ink, fontFamily: appFont, fontSize: 27, lineHeight: 33, fontWeight: "600", letterSpacing: -0.6, marginTop: 5 },
  sectionTitleCompact: { fontSize: 25, lineHeight: 30 },
  categoryScroll: { paddingHorizontal: 18, paddingBottom: 8, gap: 10 },
  categoryCard: { width: 116, height: 91, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "space-between" },
  categoryCardActive: { backgroundColor: colors.plum, borderColor: colors.plum },
  categoryText: { color: colors.ink, fontSize: 10, lineHeight: 14, fontWeight: "600" },
  categoryTextActive: { color: colors.white },
  sectionRow: { marginTop: 16, marginRight: 18, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  seeAll: { color: colors.ink, fontSize: 10, fontWeight: "600", paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: colors.ink },
  vendorScroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 25, gap: 14 },
  inlineEmpty: { margin: 18, padding: 25, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  inlineEmptyTitle: { color: colors.ink, fontFamily: appFont, fontSize: 20, fontWeight: "600", marginTop: 10 },
  inlineEmptyText: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 6 },
  trustCard: { marginHorizontal: 18, padding: 23, borderRadius: 12, borderWidth: 1, borderColor: "#242424", backgroundColor: colors.plumDark },
  trustKicker: { color: "#A1A1A1", fontSize: 8, fontWeight: "600", letterSpacing: 1.1 },
  trustTitle: { color: colors.white, fontFamily: appFont, fontSize: 24, lineHeight: 30, fontWeight: "600", marginTop: 6 },
  trustList: { gap: 12, marginTop: 20 },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 9 },
  trustText: { color: "rgba(255,255,255,0.76)", fontSize: 10 },
  tabBar: { height: 72, position: "absolute", left: 12, right: 12, zIndex: 12, padding: 6, borderWidth: 1, borderColor: "rgba(234,234,234,0.98)", borderRadius: 30, backgroundColor: "rgba(255,255,255,0.98)", flexDirection: "row", alignItems: "center", shadowColor: "#000000", shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  tabBarDark: { backgroundColor: "rgba(17,17,17,0.98)", borderColor: "#333333" },
  tabButton: { flex: 1, height: 58, minWidth: 0, borderRadius: 24, alignItems: "center", justifyContent: "center", gap: 2 },
  tabButtonActive: { flex: 1.48, paddingHorizontal: 7, borderWidth: 1, borderColor: "#000000", backgroundColor: "#000000", shadowColor: "#000000", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  tabButtonActiveDark: { borderColor: "#FFFFFF", backgroundColor: "#FFFFFF" },
  tabIcon: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  tabIconActive: { transform: [{ translateY: -1 }] },
  tabLabel: { maxWidth: "100%", color: "#666666", fontFamily: appFont, fontSize: 9, fontWeight: "500", letterSpacing: -0.1 },
  tabLabelActive: { color: colors.white, fontWeight: "600" },
  tabLabelDark: { color: "#A1A1A1" },
  tabLabelActiveDark: { color: colors.ink },
  countBadge: { minWidth: 14, height: 14, paddingHorizontal: 3, position: "absolute", zIndex: 2, right: -8, top: -4, borderRadius: 7, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  countText: { color: colors.white, fontSize: 8, fontWeight: "900" },
  pageHeader: { paddingTop: 24, paddingBottom: 25 },
  pageTitle: { color: colors.ink, fontFamily: appFont, fontSize: 36, lineHeight: 43, fontWeight: "600", letterSpacing: -1.2 },
  pageSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  pageTitleDark: { color: "#F8F9F2" },
  pageSubtitleDark: { color: "#A8ADA0" },
  sectionTitleDark: { color: "#F8F9F2" },
  fullSearch: { minHeight: 55, paddingHorizontal: 15, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: 10 },
  filterRow: { gap: 8, paddingVertical: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  filterChipActive: { borderColor: colors.plum, backgroundColor: colors.plum },
  filterText: { color: colors.ink, fontSize: 10, fontWeight: "600" },
  filterTextActive: { color: colors.white },
  resultCount: { color: colors.muted, fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 12 },
  verticalList: { gap: 17 },
  emptyState: { alignItems: "center", paddingTop: 90, paddingHorizontal: 27 },
  emptyIcon: { width: 68, height: 68, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  emptyTitle: { color: colors.ink, fontFamily: appFont, fontSize: 25, fontWeight: "600", marginTop: 20 },
  emptyText: { color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: "center", marginTop: 8 },
  emptyButton: { minHeight: 43, marginTop: 20, paddingHorizontal: 20, borderRadius: 8, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  emptyButtonText: { color: colors.white, fontSize: 11, fontWeight: "600" },
  planHero: { padding: 24, marginBottom: 4, borderRadius: 12, borderWidth: 1, borderColor: "#242424", backgroundColor: colors.plum },
  planHeroTitle: { color: colors.white, fontFamily: appFont, fontSize: 28, lineHeight: 34, fontWeight: "600", marginTop: 18 },
  planHeroText: { color: "rgba(255,255,255,0.72)", fontSize: 11, lineHeight: 18, marginTop: 8 },
  creamButton: { minHeight: 44, marginTop: 20, paddingHorizontal: 18, alignSelf: "flex-start", borderRadius: 8, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: 8 },
  creamButtonText: { color: colors.plum, fontSize: 11, fontWeight: "600" },
  checklist: { overflow: "hidden", borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  checkRow: { minHeight: 61, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 11 },
  checkCircle: { width: 23, height: 23, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkCircleDone: { borderColor: colors.green, backgroundColor: colors.green },
  checkLabel: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: "700" },
  checkLabelDone: { color: colors.muted, textDecorationLine: "line-through" },
  profileCard: { alignItems: "center", padding: 28, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  profileIcon: { width: 66, height: 66, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  profileTitle: { color: colors.ink, fontFamily: appFont, fontSize: 26, fontWeight: "600", marginTop: 18 },
  profileText: { color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: "center", marginTop: 8, marginBottom: 20 },
  primaryButton: { width: "100%", minHeight: 49, borderRadius: 8, backgroundColor: colors.plum, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryButtonText: { color: colors.white, fontSize: 12, fontWeight: "600" },
  profileLinks: { overflow: "hidden", marginTop: 18, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  profileLink: { minHeight: 62, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
  profileLinkIcon: { width: 36, height: 36, borderRadius: 7, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  profileLinkText: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: "700" },
  authScreen: { flex: 1, backgroundColor: colors.cream },
  authTop: { paddingHorizontal: 20, paddingTop: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeButton: { width: 38, height: 38, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  closeButtonDark: { backgroundColor: "#1A1A1A", borderColor: "#333333" },
  authContent: { padding: 22, paddingTop: 55 },
  authKicker: { color: colors.coral, fontSize: 8, fontWeight: "900", letterSpacing: 1.3, textAlign: "center" },
  authTitle: { color: colors.ink, fontFamily: appFont, fontSize: 34, lineHeight: 41, fontWeight: "500", textAlign: "center", marginTop: 8 },
  authSubtitle: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 6, marginBottom: 26 },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  roleCard: { flex: 1, minHeight: 106, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "space-between" },
  roleCardSelected: { borderColor: colors.ink, backgroundColor: colors.white },
  roleLabel: { maxWidth: 108, color: colors.ink, fontSize: 10, lineHeight: 14, fontWeight: "800" },
  roleCheck: { position: "absolute", right: 11, top: 11 },
  inputLabel: { color: colors.ink, fontSize: 8, fontWeight: "900", letterSpacing: 1, marginTop: 13, marginBottom: 6 },
  authInput: { height: 52, paddingHorizontal: 15, marginBottom: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, color: colors.ink },
  formError: { color: "#9F332C", fontSize: 10, lineHeight: 15, marginVertical: 9 },
  terms: { color: colors.muted, fontSize: 8, lineHeight: 14, textAlign: "center", paddingHorizontal: 20, marginTop: 16 },
  modalScreen: { flex: 1, backgroundColor: colors.cream },
  modalScreenDark: { backgroundColor: "#0A0A0A" },
  modalTop: { minHeight: 82, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalHeadingIcon: { width: 43, height: 43, borderRadius: 8, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  modalKicker: { color: colors.coral, fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  modalTitle: { color: colors.ink, fontFamily: appFont, fontSize: 28, lineHeight: 34, fontWeight: "600", marginTop: 2 },
  modalTitleDark: { color: "#F8F9F2" },
  modalBodyDark: { color: "#A8ADA0" },
  modalMutedDark: { color: "#AEB999" },
  notificationSummary: { minHeight: 43, marginHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  notificationSummaryText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  markReadButton: { minHeight: 36, paddingHorizontal: 12, justifyContent: "center" },
  markReadText: { color: colors.coral, fontSize: 10, fontWeight: "900" },
  notificationList: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 9 },
  notificationRow: { padding: 15, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  notificationRowDark: { backgroundColor: "#171717", borderColor: "#333333" },
  notificationRowUnread: { borderColor: "#9AA886" },
  notificationIcon: { width: 41, height: 41, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  notificationIconDark: { backgroundColor: "#242424" },
  notificationCopy: { flex: 1 },
  notificationTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  notificationTitle: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: "900" },
  notificationBody: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 3 },
  notificationTime: { color: colors.coral, fontSize: 8, fontWeight: "800", marginTop: 7 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.coral },
  settingsContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  settingsSectionLabel: { color: colors.coral, fontSize: 8, fontWeight: "900", letterSpacing: 1.2, marginTop: 15, marginBottom: 7 },
  settingsGroup: { overflow: "hidden", borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  settingsGroupDark: { backgroundColor: "#171717", borderColor: "#333333" },
  settingsAction: { minHeight: 72, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 11 },
  settingsActionDisabled: { opacity: 0.48 },
  settingsIcon: { width: 39, height: 39, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  settingsIconDark: { backgroundColor: "#242424" },
  settingsDangerIcon: { width: 39, height: 39, borderRadius: 8, backgroundColor: "#FFF1F0", alignItems: "center", justifyContent: "center" },
  settingsCopy: { flex: 1 },
  settingsTitle: { color: colors.ink, fontSize: 11, fontWeight: "900" },
  settingsDangerTitle: { color: "#B43C36", fontSize: 11, fontWeight: "900" },
  settingsSubtitle: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  settingsFootnote: { color: colors.muted, fontSize: 9, lineHeight: 15, textAlign: "center", marginTop: 12 },
  toast: { minHeight: 48, position: "absolute", left: 18, right: 18, zIndex: 20, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: "#2A2A2A", backgroundColor: colors.plum, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  toastText: { flex: 1, color: colors.white, fontSize: 11, fontWeight: "800" },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { paddingHorizontal: 19, paddingTop: 9, paddingBottom: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.cream },
  sheetHandle: { width: 42, height: 4, alignSelf: "center", marginBottom: 18, borderRadius: 2, backgroundColor: colors.border },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  sheetKicker: { color: colors.coral, fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  sheetTitle: { color: colors.ink, fontFamily: appFont, fontSize: 26, fontWeight: "600", marginTop: 4 },
  locationOptions: { gap: 8 },
  locationOption: { minHeight: 54, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: 9 },
  locationOptionActive: { borderColor: colors.ink, backgroundColor: colors.white },
  locationOptionText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: "800" },
  vendorModal: { flex: 1, backgroundColor: colors.cream },
  vendorModalTop: { minHeight: 58, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  vendorModalImage: { width: "100%", height: 330, backgroundColor: colors.blush },
  vendorModalContent: { padding: 22, paddingBottom: 42 },
  vendorModalCategory: { color: colors.coral, fontSize: 9, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  vendorModalTitle: { color: colors.ink, fontFamily: appFont, fontSize: 33, lineHeight: 40, fontWeight: "600", marginTop: 7 },
  vendorModalMeta: { marginTop: 9, flexDirection: "row", justifyContent: "space-between" },
  vendorModalLocation: { flexDirection: "row", alignItems: "center", gap: 4 },
  vendorModalMetaText: { color: colors.muted, fontSize: 10 },
  vendorModalReason: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 20 },
  vendorModalFacts: { marginTop: 22, paddingVertical: 17, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, flexDirection: "row", gap: 35 },
  vendorModalActions: { gap: 10, marginTop: 22 },
  secondaryButton: { width: "100%", minHeight: 49, borderRadius: 8, borderWidth: 1, borderColor: colors.plum, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  secondaryButtonText: { color: colors.plum, fontSize: 11, fontWeight: "600" }
});
