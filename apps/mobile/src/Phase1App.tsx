import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { coupleVendors } from "@smitten/shared";
import App from "../App";
import { loadMarketplaceVendors } from "./api/marketplace";

declare const process: {
  env: {
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  };
};

export default function Phase1App() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

  if (!publishableKey) {
    return (
      <View style={styles.loading}>
        <StatusBar style="dark" />
        <Text style={styles.brand}>Smitten</Text>
        <Text style={styles.loadingText}>Mobile sign-in is not configured yet.</Text>
        <Text style={styles.helperText}>Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY using the same Clerk project as the Smitten website.</Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <MarketplaceBootstrap />
    </ClerkProvider>
  );
}

function MarketplaceBootstrap() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    void loadMarketplaceVendors(controller.signal)
      .then((vendors) => {
        if (vendors.length > 0) {
          coupleVendors.splice(0, coupleVendors.length, ...vendors);
        }
      })
      .catch(() => {
        // Keep the bundled Nigerian vendor catalogue available offline or during API outages.
      })
      .finally(() => {
        clearTimeout(timeout);
        setReady(true);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <StatusBar style="dark" />
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Loading Smitten…</Text>
      </View>
    );
  }

  return <App />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
    backgroundColor: "#F8F4EF",
  },
  brand: {
    fontSize: 34,
    fontWeight: "700",
    color: "#181516",
  },
  loadingText: {
    fontSize: 14,
    color: "#6F6460",
    textAlign: "center",
  },
  helperText: {
    maxWidth: 330,
    fontSize: 12,
    lineHeight: 18,
    color: "#8A807B",
    textAlign: "center",
  },
});
