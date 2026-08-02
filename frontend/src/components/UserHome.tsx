import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import OSMMap from "@/src/components/OSMMap";
import { api } from "@/src/api";
import { colors, spacing, radius, font, ISSUE_TYPES } from "@/src/theme";

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bangalore

export default function UserHome() {
  const { user } = useAuth();
  const router = useRouter();
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string>("puncture");
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermDenied(true);
        setLoc(DEFAULT_CENTER);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLoc(point);
      try { await api.updateLocation(point.lat, point.lng); } catch {}
    } catch {
      setLoc(DEFAULT_CENTER);
    }
  }, []);

  const fetchMechanics = useCallback(async (point: { lat: number; lng: number }) => {
    try {
      const list = await api.nearbyMechanics(point.lat, point.lng, 50);
      setMechanics(list);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { fetchLocation(); }, [fetchLocation]));

  useEffect(() => { if (loc) fetchMechanics(loc); }, [loc, fetchMechanics]);

  const requestHelp = async () => {
    if (!loc) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    setSubmitting(true);
    try {
      const req = await api.createRequest({
        issue_type: selectedIssue,
        lat: loc.lat,
        lng: loc.lng,
      });
      // Auto-call the assigned mechanic
      if (req.mechanic_phone) {
        setTimeout(() => {
          const tel = `tel:${req.mechanic_phone.replace(/\s/g, "")}`;
          Linking.canOpenURL(tel).then((ok) => ok && Linking.openURL(tel)).catch(() => {});
        }, 400);
      }
      router.push(`/request/${req.id}`);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn(e);
    } finally {
      setSubmitting(false);
    }
  };

  const mapCenter = loc || DEFAULT_CENTER;
  const markers = [
    { lat: mapCenter.lat, lng: mapCenter.lng, label: "You", color: "#FFFFFF", emoji: "📍" },
    ...mechanics.map((m: any) => ({
      lat: m.lat, lng: m.lng, label: `${m.garage_name || m.name} · ${m.distance_km}km`,
      color: "#30D158", emoji: "🔧",
    })),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hi}>Hey, {user?.name?.split(" ")[0] || "Driver"}</Text>
          <Text style={styles.subhi}>Stranded? Help is 2 taps away.</Text>
        </View>
        <Pressable
          testID="sos-button"
          onPress={() => router.push("/sos")}
          style={styles.sosBtn}
        >
          <Ionicons name="alert" size={22} color={colors.onError} />
          <Text style={styles.sosText}>SOS</Text>
        </Pressable>
      </View>

      {/* Map */}
      <View style={styles.mapWrap}>
        {loc ? (
          <OSMMap center={mapCenter} zoom={13} markers={markers} />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} size="large" />
            <Text style={styles.loadingText}>Locating you…</Text>
          </View>
        )}
        {permDenied && (
          <View style={styles.permBanner}>
            <Ionicons name="warning" size={16} color={colors.warning} />
            <Text style={styles.permText}>Location permission denied. Using default location.</Text>
          </View>
        )}
      </View>

      {/* Bottom Sheet-like panel */}
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>What's the issue?</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {ISSUE_TYPES.map((it) => {
            const active = selectedIssue === it.id;
            return (
              <Pressable
                key={it.id}
                testID={`issue-chip-${it.id}`}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch {}
                  setSelectedIssue(it.id);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Ionicons
                  name={it.icon}
                  size={16}
                  color={active ? colors.onBrand : colors.onSurface}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{it.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          testID="request-help-button"
          onPress={requestHelp}
          disabled={!loc || submitting}
          style={({ pressed }) => [
            styles.cta,
            (!loc || submitting) && { opacity: 0.6 },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <>
              <Ionicons name="flash" size={22} color={colors.onBrand} />
              <Text style={styles.ctaText}>REQUEST HELP NOW</Text>
            </>
          )}
        </Pressable>

        <Pressable
          testID="ai-detect-shortcut"
          onPress={() => router.push("/ai-detect")}
          style={styles.aiRow}
        >
          <Ionicons name="sparkles" size={18} color={colors.brand} />
          <Text style={styles.aiText}>Not sure? Snap a photo — AI detects the issue.</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.brand} />
        </Pressable>

        <View style={styles.stat}>
          <Ionicons name="location" size={14} color={colors.onSurfaceSecondary} />
          <Text style={styles.statText}>
            {mechanics.length} mechanics nearby within 50 km
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  hi: { color: colors.onSurface, fontSize: font.size.xl, fontWeight: "800" },
  subhi: { color: colors.onSurfaceSecondary, fontSize: font.size.sm, marginTop: 2 },
  sosBtn: {
    backgroundColor: colors.error, flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill,
  },
  sosText: { color: colors.onError, fontWeight: "900", fontSize: font.size.sm, letterSpacing: 1 },
  mapWrap: { flex: 1, marginHorizontal: spacing.md, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceSecondary },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: colors.onSurfaceSecondary, marginTop: spacing.md },
  permBanner: {
    position: "absolute", top: spacing.md, left: spacing.md, right: spacing.md,
    flexDirection: "row", gap: 6, backgroundColor: colors.surfaceSecondary,
    padding: spacing.sm, borderRadius: radius.md, alignItems: "center",
    borderWidth: 1, borderColor: colors.warning,
  },
  permText: { color: colors.onSurface, fontSize: font.size.xs, flex: 1 },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg, paddingBottom: spacing.md,
    borderTopWidth: 1, borderColor: colors.border,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong,
    alignSelf: "center", marginBottom: spacing.md,
  },
  sheetTitle: { color: colors.onSurface, fontSize: font.size.lg, fontWeight: "800", marginBottom: spacing.md },
  chipRow: { gap: spacing.sm, paddingRight: spacing.md, paddingBottom: spacing.md },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.surfaceTertiary, paddingHorizontal: spacing.md,
    height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontWeight: "700", fontSize: font.size.sm },
  chipTextActive: { color: colors.onBrand },
  cta: {
    backgroundColor: colors.brandPrimary, borderRadius: radius.md,
    paddingVertical: spacing.lg, alignItems: "center", flexDirection: "row",
    justifyContent: "center", gap: spacing.sm, minHeight: 56,
  },
  ctaText: { color: colors.onBrand, fontSize: font.size.xl, fontWeight: "900", letterSpacing: 1.5 },
  aiRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    padding: spacing.md, marginTop: spacing.md,
    backgroundColor: colors.brandTertiary, borderRadius: radius.md,
  },
  aiText: { color: colors.onSurface, flex: 1, fontSize: font.size.sm },
  stat: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm, justifyContent: "center" },
  statText: { color: colors.onSurfaceSecondary, fontSize: font.size.xs },
});
