import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { colors, spacing, radius, font } from "@/src/theme";

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;

  const isMech = user.role === "mechanic";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatar}>
          <Ionicons name={isMech ? "build" : "person"} size={48} color={colors.onBrand} />
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{isMech ? "MECHANIC" : "DRIVER"}</Text>
        </View>

        {isMech && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={colors.brand} />
            <Text style={styles.ratingText}>{(user.rating_avg ?? 5).toFixed(1)} · {user.rating_count ?? 0} reviews</Text>
          </View>
        )}

        <View style={styles.card}>
          <Row icon="call-outline" label="Phone" value={user.phone || "Not set"} />
          {isMech ? (
            <Row icon="storefront-outline" label="Garage" value={user.garage_name || "-"} />
          ) : (
            <>
              <Row icon="car-outline" label="Vehicle" value={user.vehicle_type || "-"} />
              <Row icon="pricetag-outline" label="Number plate" value={user.vehicle_number || "-"} />
            </>
          )}
        </View>

        {!isMech && (
          <Pressable
            testID="manage-sos-btn"
            onPress={() => router.push("/sos")}
            style={styles.action}
          >
            <Ionicons name="alert-circle-outline" size={22} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>SOS Contacts</Text>
              <Text style={styles.actionSub}>Alert family in emergencies</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceSecondary} />
          </Pressable>
        )}

        <Pressable
          testID="logout-btn"
          onPress={logout}
          style={styles.logout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>

        <Text style={styles.footer}>Tyre Express · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.onSurfaceSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg, alignItems: "center" },
  avatar: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center", marginTop: spacing.md,
  },
  name: { color: colors.onSurface, fontSize: font.size.xxl, fontWeight: "900", marginTop: spacing.md },
  email: { color: colors.onSurfaceSecondary, fontSize: font.size.sm, marginTop: 2 },
  rolePill: {
    backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.md,
    paddingVertical: 4, borderRadius: radius.pill, marginTop: spacing.sm,
  },
  roleText: { color: colors.brand, fontWeight: "800", fontSize: font.size.xs, letterSpacing: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm },
  ratingText: { color: colors.onSurface, fontWeight: "600" },
  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    width: "100%", padding: spacing.md, marginTop: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
  },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { color: colors.onSurfaceSecondary, fontSize: font.size.xs, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  rowValue: { color: colors.onSurface, fontSize: font.size.base, marginTop: 2 },
  action: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    marginTop: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  actionTitle: { color: colors.onSurface, fontWeight: "700", fontSize: font.size.base },
  actionSub: { color: colors.onSurfaceSecondary, fontSize: font.size.xs, marginTop: 2 },
  logout: {
    marginTop: spacing.xl, flexDirection: "row", alignItems: "center", gap: 6,
    borderColor: colors.error, borderWidth: 1, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md, borderRadius: radius.md,
  },
  logoutText: { color: colors.error, fontWeight: "800", letterSpacing: 0.5 },
  footer: { color: colors.onSurfaceSecondary, marginTop: spacing.xxxl, fontSize: font.size.xs },
});
