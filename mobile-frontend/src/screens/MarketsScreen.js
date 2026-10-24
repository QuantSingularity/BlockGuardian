import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Card from "../components/Card";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import RequireAuth from "../components/RequireAuth";
import { useToast } from "../context/ToastContext";
import { assetAPI } from "../lib/api";
import { formatCurrency, formatPercent, formatLabel } from "../lib/format";
import { ASSET_TYPES } from "../lib/constants";

const changeColor = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "#64748b";
  }
  return Number(value) >= 0 ? "#34d399" : "#f87171";
};

function MarketsContent() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [assetType, setAssetType] = useState("");
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 1) return undefined;
    let cancelled = false;
    setIsLoading(true);

    const run = async (request, fallbackMessage) => {
      try {
        const results = await request();
        if (!cancelled) setAssets(results || []);
      } catch (err) {
        if (!cancelled) toast.error(err.message || fallbackMessage);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    if (trimmed.length === 0) {
      run(
        () =>
          assetAPI.list({
            limit: 60,
            ...(assetType ? { asset_type: assetType } : {}),
          }),
        "Failed to load market data",
      );
      return () => {
        cancelled = true;
      };
    }

    const handle = setTimeout(() => {
      run(
        () => assetAPI.search(trimmed, assetType ? { type: assetType } : {}),
        "Search failed",
      );
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, assetType]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Markets</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons
          name="search"
          size={16}
          color="#64748b"
          style={{ marginLeft: 12 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search symbol or name"
          placeholderTextColor="#475569"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ value: "", label: "All" }, ...ASSET_TYPES]}
          keyExtractor={(item) => item.value || "all"}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                assetType === item.value && styles.filterChipActive,
              ]}
              onPress={() => setAssetType(item.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  assetType === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={assets}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading && (
            <Card>
              <EmptyState
                icon="search-outline"
                title="No assets found"
                description="Try a different search term or filter."
              />
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.assetRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.assetTopRow}>
                  <Text style={styles.assetSymbol}>{item.symbol}</Text>
                  <Badge color="indigo">{formatLabel(item.asset_type)}</Badge>
                </View>
                <Text style={styles.assetName}>{item.name}</Text>
                {item.exchange && (
                  <Text style={styles.assetExchange}>{item.exchange}</Text>
                )}
              </View>
              <View style={styles.assetPriceCol}>
                <Text style={styles.assetPrice}>
                  {formatCurrency(item.current_price, item.currency)}
                </Text>
                <Text
                  style={[
                    styles.assetChange,
                    {
                      color: changeColor(item.day_change_percent),
                    },
                  ]}
                >
                  {formatPercent(item.day_change_percent)}
                </Text>
              </View>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

export default function MarketsScreen({ navigation }) {
  return (
    <RequireAuth navigation={navigation}>
      <MarketsContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#05070d" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { color: "#f8fafc", fontSize: 22, fontWeight: "800" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    backgroundColor: "#0f172a",
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: "#f1f5f9", paddingHorizontal: 10, height: 44 },
  filterRow: { paddingHorizontal: 20, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  filterChipActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  filterChipText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  assetRow: { flexDirection: "row", alignItems: "flex-start" },
  assetTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  assetSymbol: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
  assetName: { color: "#94a3b8", fontSize: 12 },
  assetExchange: { color: "#64748b", fontSize: 11, marginTop: 2 },
  assetPriceCol: { alignItems: "flex-end" },
  assetPrice: { color: "#f1f5f9", fontSize: 14, fontWeight: "700" },
  assetChange: { fontSize: 12, fontWeight: "600", marginTop: 2 },
});
