import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { api } from "@/src/api";
import { colors, spacing, radius, font } from "@/src/theme";

const ISSUE_LABELS: Record<string, string> = {
  puncture: "Puncture", engine: "Engine", battery: "Battery", fuel: "Fuel", other: "Other",
};

export default function MechanicHome() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(user?.online ?? true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.assignedRequests();
      setJobs(list);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleOnline = async () => {
    const next = !online;
    setOnline(next);
    try { await api.toggleOnline(next); await refresh(); } catch { setOnline(!next); }
  };

  const accept = async (rid: string) => {
    try { await api.updateRequest(rid, "accepted"); load(); } catch {}
  };
  const decline = async (rid: string) => {
    try { await api.updateRequest(rid, "rejected"); load(); } catch {}
  };
  const complete = async (rid: string) => {
    try { await api.updateRequest(rid, "completed"); load(); } catch {}
  };

  const stats = {
    active: jobs.filter((j) => ["pending", "accepted", "en_route", "arrived"].includes(j.status)).length,
    completed: jobs.filter((j) => j.status === "completed").length,
    earnings: jobs.filter((j) => j.status === "completed").reduce((s, j) => s + (j.estimated_cost || 0), 0),
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hi}>{user?.garage_name || user?.name}</Text>
          <Text style={styles.sub}>Mechanic dashboard</Text>
        </View>
        <Pressable
          testID="online-toggle"
          onPress={toggleOnline}
          style={[styles.onlineBtn, online ? styles.onlineOn : styles.onlineOff]}
        >
          <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.onSurfaceSecondary }]} />
          <Text style={styles.onlineText}>{online ? "ONLINE" : "OFFLINE"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>ACTIVE</Text>
            <Text style={styles.statValue}>{stats.active}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>COMPLETED</Text>
            <Text style={styles.statValue}>{stats.completed}</Text>
          </View>
          <View style={[styles.statCard, styles.statBrand]}>
            <Text style={styles.statLabelBrand}>EARNINGS</Text>
            <Text style={styles.statValueBrand}>₹{stats.earnings}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Incoming Requests</Text>

        {loading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xl }} />
        ) : jobs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="construct-outline" size={48} color={colors.onSurfaceSecondary} />
            <Text style={styles.emptyText}>No active requests right now.</Text>
            <Text style={styles.emptySub}>You're {online ? "online" : "offline"} — stay ready.</Text>
          </View>
        ) : (
          jobs.map((j) => (
            <View key={j.id} style={styles.card} testID={`job-card-${j.id}`}>
              <View style={styles.cardHeader}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{ISSUE_LABELS[j.issue_type] || j.issue_type}</Text>
                </View>
                <View style={[styles.status, statusStyle(j.status)]}>
                  <Text style={styles.statusText}>{j.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.userName}>{j.user_name}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="location" size={14} color={colors.onSurfaceSecondary} />
                <Text style={styles.meta}>{j.distance_km ? `${j.distance_km} km · ${j.eta_min} min ETA` : "Location shared"}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="cash-outline" size={14} color={colors.onSurfaceSecondary} />
                <Text style={styles.meta}>Estimated ₹{j.estimated_cost}</Text>
              </View>

              <View style={styles.actionRow}>
                {j.status === "pending" ? (
                  <>
                    <Pressable
                      testID={`decline-${j.id}`}
                      onPress={() => decline(j.id)}
                      style={[styles.actionBtn, styles.actionSecondary]}
                    >
                      <Text style={styles.actionSecondaryText}>Decline</Text>
                    </Pressable>
                    <Pressable
                      testID={`accept-${j.id}`}
                      onPress={() => accept(j.id)}
                      style={[styles.actionBtn, styles.actionPrimary]}
                    >
                      <Text style={styles.actionPrimaryText}>ACCEPT</Text>
                    </Pressable>
                  </>
                ) : j.status === "completed" || j.status === "rejected" ? (
                  <Pressable
                    onPress={() => router.push(`/request/${j.id}`)}
                    style={[styles.actionBtn, styles.actionSecondary]}
                  >
                    <Text style={styles.actionSecondaryText}>View details</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={() => {
                        if (j.user_phone) Linking.openURL(`tel:${j.user_phone.replace(/\s/g, "")}`);
                      }}
                      style={[styles.actionBtn, styles.actionSecondary]}
                    >
                      <Ionicons name="call" size={16} color={colors.onSurface} />
                      <Text style={styles.actionSecondaryText}>Call</Text>
                    </Pressable>
                    <Pressable
                      testID={`complete-${j.id}`}
                      onPress={() => complete(j.id)}
                      style={[styles.actionBtn, styles.actionPrimary]}
                    >
                      <Text style={styles.actionPrimaryText}>MARK COMPLETE</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function statusStyle(s: string) {
  if (s === "completed") return { backgroundColor: "#003a17", borderColor: colors.success };
  if (s === "rejected") return { backgroundColor: "#3a0e0c", borderColor: colors.error };
  if (s === "pending") return { backgroundColor: "#3a3300", borderColor: colors.brand };
  return { backgroundColor: colors.surfaceTertiary, borderColor: colors.border };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  hi: { color: colors.onSurface, fontSize: font.size.xl, fontWeight: "900" },
  sub: { color: colors.onSurfaceSecondary, fontSize: font.size.sm },
  onlineBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.pill, borderWidth: 1,
  },
  onlineOn: { backgroundColor: colors.surfaceSecondary, borderColor: colors.success },
  onlineOff: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
  dot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { color: colors.onSurface, fontWeight: "800", fontSize: font.size.sm, letterSpacing: 0.5 },
  scroll: { padding: spacing.lg },
  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  statCard: {
    flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  statBrand: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  statLabel: { color: colors.onSurfaceSecondary, fontSize: font.size.xs, fontWeight: "700", letterSpacing: 0.5 },
  statLabelBrand: { color: colors.onBrand, fontSize: font.size.xs, fontWeight: "800", letterSpacing: 0.5 },
  statValue: { color: colors.onSurface, fontSize: font.size.xxxl, fontWeight: "900", marginTop: 4 },
  statValueBrand: { color: colors.onBrand, fontSize: font.size.xxl, fontWeight: "900", marginTop: 4 },
  sectionTitle: { color: colors.onSurface, fontSize: font.size.lg, fontWeight: "800", marginBottom: spacing.md },
  empty: { alignItems: "center", paddingVertical: spacing.xxxl },
  emptyText: { color: colors.onSurface, fontSize: font.size.base, marginTop: spacing.md },
  emptySub: { color: colors.onSurfaceSecondary, fontSize: font.size.sm, marginTop: 4 },
  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  badge: {
    backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.sm,
    paddingVertical: 4, borderRadius: radius.sm,
  },
  badgeText: { color: colors.brand, fontWeight: "800", fontSize: font.size.xs, letterSpacing: 0.5 },
  status: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1 },
  statusText: { color: colors.onSurface, fontWeight: "800", fontSize: 10, letterSpacing: 0.5 },
  userName: { color: colors.onSurface, fontSize: font.size.lg, fontWeight: "800" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  meta: { color: colors.onSurfaceSecondary, fontSize: font.size.sm },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  actionBtn: {
    flex: 1, paddingVertical: spacing.md, alignItems: "center", justifyContent: "center",
    borderRadius: radius.md, flexDirection: "row", gap: 6,
  },
  actionPrimary: { backgroundColor: colors.brandPrimary },
  actionSecondary: { backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border },
  actionPrimaryText: { color: colors.onBrand, fontWeight: "900", letterSpacing: 0.5 },
  actionSecondaryText: { color: colors.onSurface, fontWeight: "700" },
});
