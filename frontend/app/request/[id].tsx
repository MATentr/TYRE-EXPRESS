import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import OSMMap from "@/src/components/OSMMap";
import { api } from "@/src/api";
import { colors, spacing, radius, font } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

export default function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [req, setReq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api.getRequest(id);
      setReq(r);
    } catch {} finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !req) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const isMech = user?.role === "mechanic";
  const other = isMech
    ? { name: req.user_name, phone: req.user_phone, role: "Driver" }
    : { name: req.mechanic_name || "No mechanic assigned", phone: req.mechanic_phone, role: req.garage_name || "Mechanic" };

  const markers = [
    { lat: req.lat, lng: req.lng, label: "Pickup", emoji: "🚗", color: "#FFD600" },
    ...(req.mechanic_lat
      ? [{ lat: req.mechanic_lat, lng: req.mechanic_lng, label: req.garage_name || "Mechanic", emoji: "🔧", color: "#00E676" }]
      : []),
  ];

  const call = () => {
    if (other.phone) Linking.openURL(`tel:${other.phone.replace(/\s/g, "")}`);
  };

  const submitReview = async () => {
    if (rating === 0) return;
    try {
      await api.reviewRequest(req.id, rating);
      load();
    } catch {}
  };

  const showRating = !isMech && req.status === "completed" && !req.rating;
  const showPay = !isMech && req.status === "completed" && req.payment_status !== "paid";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="back-request">
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Live Tracking</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.mapWrap}>
        <OSMMap
          center={{ lat: req.lat, lng: req.lng }}
          zoom={13}
          markers={markers}
          routeTo={req.mechanic_lat ? { lat: req.mechanic_lat, lng: req.mechanic_lng } : null}
        />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>STATUS</Text>
          <Text style={styles.statusValue}>{req.status.replace("_", " ").toUpperCase()}</Text>
        </View>

        {/* ETA row */}
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>ETA</Text>
            <Text style={styles.metricValue}>{req.eta_min ?? "—"}<Text style={styles.metricUnit}> min</Text></Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Distance</Text>
            <Text style={styles.metricValue}>{req.distance_km ?? "—"}<Text style={styles.metricUnit}> km</Text></Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Est. Cost</Text>
            <Text style={styles.metricValue}>₹{req.estimated_cost}</Text>
          </View>
        </View>

        {/* Person card */}
        <View style={styles.personCard}>
          <View style={styles.personAvatar}>
            <Ionicons name={isMech ? "person" : "build"} size={28} color={colors.onBrand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.personName}>{other.name}</Text>
            <Text style={styles.personRole}>{other.role}</Text>
          </View>
          {other.phone ? (
            <Pressable onPress={call} style={styles.callBtn} testID="call-btn">
              <Ionicons name="call" size={20} color={colors.onBrand} />
            </Pressable>
          ) : null}
        </View>

        {req.photo_b64 ? (
          <View style={styles.photoNote}>
            <Ionicons name="image" size={16} color={colors.brand} />
            <Text style={styles.photoText}>Photo attached to request</Text>
          </View>
        ) : null}

        <Text style={styles.desc}>Issue: <Text style={styles.bold}>{req.issue_type}</Text></Text>
        {req.description ? <Text style={styles.desc}>Notes: {req.description}</Text> : null}

        {showPay && (
          <Pressable
            testID="pay-now-btn"
            onPress={() => router.push(`/payment/${req.id}`)}
            style={styles.payBtn}
          >
            <Ionicons name="card" size={20} color={colors.onBrand} />
            <Text style={styles.payText}>PAY ₹{req.estimated_cost}</Text>
          </Pressable>
        )}

        {showRating && (
          <View style={styles.reviewCard}>
            <Text style={styles.reviewTitle}>Rate this service</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)} testID={`star-${n}`}>
                  <Ionicons
                    name={n <= rating ? "star" : "star-outline"}
                    size={32}
                    color={colors.brand}
                  />
                </Pressable>
              ))}
            </View>
            <Pressable
              testID="submit-review-btn"
              onPress={submitReview}
              disabled={rating === 0}
              style={[styles.reviewBtn, rating === 0 && { opacity: 0.5 }]}
            >
              <Text style={styles.reviewBtnText}>Submit</Text>
            </Pressable>
          </View>
        )}

        {isMech && ["pending", "accepted", "en_route", "arrived"].includes(req.status) && (
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            {req.status === "pending" && (
              <Pressable
                testID="mech-accept-btn"
                onPress={() => api.updateRequest(req.id, "accepted").then(load)}
                style={styles.payBtn}
              >
                <Text style={styles.payText}>ACCEPT REQUEST</Text>
              </Pressable>
            )}
            {req.status === "accepted" && (
              <Pressable
                onPress={() => api.updateRequest(req.id, "en_route").then(load)}
                style={styles.payBtn}
              >
                <Text style={styles.payText}>MARK EN ROUTE</Text>
              </Pressable>
            )}
            {(req.status === "en_route" || req.status === "arrived") && (
              <Pressable
                testID="mech-complete-btn"
                onPress={() => api.updateRequest(req.id, "completed").then(load)}
                style={styles.payBtn}
              >
                <Text style={styles.payText}>MARK COMPLETED</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  back: { padding: spacing.xs },
  title: { color: colors.onSurface, fontSize: font.size.lg, fontWeight: "800" },
  mapWrap: { height: 240, marginHorizontal: spacing.md, borderRadius: radius.lg, overflow: "hidden" },
  body: { padding: spacing.lg, gap: spacing.md },
  statusCard: {
    backgroundColor: colors.brandTertiary, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.brand,
  },
  statusLabel: { color: colors.brand, fontSize: font.size.xs, fontWeight: "800", letterSpacing: 1 },
  statusValue: { color: colors.onSurface, fontSize: font.size.xl, fontWeight: "900", marginTop: 2 },
  metricRow: { flexDirection: "row", gap: spacing.sm },
  metric: {
    flex: 1, backgroundColor: colors.surfaceSecondary, padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  metricLabel: { color: colors.onSurfaceSecondary, fontSize: font.size.xs, fontWeight: "700", textTransform: "uppercase" },
  metricValue: { color: colors.onSurface, fontSize: font.size.xxl, fontWeight: "900", marginTop: 2 },
  metricUnit: { fontSize: font.size.sm, color: colors.onSurfaceSecondary },
  personCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  personAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  personName: { color: colors.onSurface, fontSize: font.size.lg, fontWeight: "800" },
  personRole: { color: colors.onSurfaceSecondary, fontSize: font.size.sm },
  callBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  photoNote: { flexDirection: "row", gap: 6, alignItems: "center", padding: spacing.sm, backgroundColor: colors.brandTertiary, borderRadius: radius.sm },
  photoText: { color: colors.brand, fontSize: font.size.sm, fontWeight: "600" },
  desc: { color: colors.onSurface, fontSize: font.size.base },
  bold: { fontWeight: "800", color: colors.brand },
  payBtn: {
    backgroundColor: colors.brandPrimary, borderRadius: radius.md, padding: spacing.lg,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: spacing.sm, minHeight: 56,
  },
  payText: { color: colors.onBrand, fontWeight: "900", fontSize: font.size.lg, letterSpacing: 1 },
  reviewCard: {
    backgroundColor: colors.surfaceSecondary, padding: spacing.lg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: spacing.md,
  },
  reviewTitle: { color: colors.onSurface, fontSize: font.size.lg, fontWeight: "800" },
  stars: { flexDirection: "row", gap: spacing.sm },
  reviewBtn: { backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
  reviewBtnText: { color: colors.onBrand, fontWeight: "900", letterSpacing: 0.5 },
});
