import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";

import { useAuth } from "@/src/auth-context";
import { api } from "@/src/api";
import { colors, spacing, radius, font } from "@/src/theme";

const STATUS_COLOR: Record<string, string> = {
  pending: colors.brand,
  accepted: colors.success,
  en_route: colors.success,
  arrived: colors.success,
  completed: colors.onSurfaceSecondary,
  rejected: colors.error,
  cancelled: colors.error,
  no_mechanic: colors.error,
};

export default function Requests() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = user?.role === "mechanic"
        ? await api.assignedRequests()
        : await api.myRequests();
      setItems(list);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [user?.role]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const isMech = user?.role === "mechanic";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{isMech ? "My Jobs" : "My Requests"}</Text>
        <Text style={styles.sub}>{items.length} total</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
        >
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.onSurfaceSecondary} />
              <Text style={styles.emptyText}>No requests yet</Text>
              <Text style={styles.emptySub}>
                {isMech ? "Stay online to receive requests." : "Tap 'Request Help' from home when you need assistance."}
              </Text>
            </View>
          ) : items.map((r) => (
            <Pressable
              key={r.id}
              testID={`request-item-${r.id}`}
              onPress={() => router.push(`/request/${r.id}`)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.cardHead}>
                <Text style={styles.issueLabel}>{r.issue_type.toUpperCase()}</Text>
                <View style={[styles.statusPill, { borderColor: STATUS_COLOR[r.status] || colors.border }]}>
                  <View style={[styles.dot, { backgroundColor: STATUS_COLOR[r.status] || colors.border }]} />
                  <Text style={styles.statusText}>{r.status.replace("_", " ")}</Text>
                </View>
              </View>
              <Text style={styles.name}>{isMech ? r.user_name : (r.garage_name || r.mechanic_name || "Finding mechanic…")}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={12} color={colors.onSurfaceSecondary} />
                <Text style={styles.meta}>{r.created_at ? format(new Date(r.created_at), "MMM d, h:mm a") : ""}</Text>
                {r.estimated_cost ? (
                  <>
                    <Ionicons name="cash-outline" size={12} color={colors.onSurfaceSecondary} style={{ marginLeft: spacing.sm }} />
                    <Text style={styles.meta}>₹{r.estimated_cost}</Text>
                  </>
                ) : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { color: colors.onSurface, fontSize: font.size.xxl, fontWeight: "900" },
  sub: { color: colors.onSurfaceSecondary, fontSize: font.size.sm },
  scroll: { padding: spacing.lg, paddingTop: 0 },
  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  issueLabel: { color: colors.brand, fontWeight: "900", fontSize: font.size.sm, letterSpacing: 1 },
  statusPill: {
    flexDirection: "row", gap: 6, alignItems: "center",
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: colors.onSurface, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  name: { color: colors.onSurface, fontSize: font.size.lg, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  meta: { color: colors.onSurfaceSecondary, fontSize: font.size.xs },
  empty: { alignItems: "center", paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { color: colors.onSurface, fontSize: font.size.lg, fontWeight: "700" },
  emptySub: { color: colors.onSurfaceSecondary, fontSize: font.size.sm, textAlign: "center", paddingHorizontal: spacing.xl },
});
