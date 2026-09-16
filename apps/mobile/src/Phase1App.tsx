import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { coupleVendors } from "@smitten/shared";
import App from "../App";
import { loadMarketplaceVendors } from "./api/marketplace";

export default function Phase1App() {
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
    backgroundColor: "#F8F4EF",
  },
  loadingText: {
    fontSize: 14,
    color: "#6F6460",
  },
});
