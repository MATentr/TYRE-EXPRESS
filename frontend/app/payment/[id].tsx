import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { colors, spacing, radius, font } from "@/src/theme";

const METHODS = [
  { id: "card", label: "Card (Stripe)", icon: "card-outline" as const, sub: "Visa, Mastercard" },
  { id: "upi", label: "UPI", icon: "phone-portrait-outline" as const, sub: "GPay, PhonePe, Paytm" },
  { id: "cash", label: "Cash", icon: "cash-outline" as const, sub: "Pay mechanic on-site" },
];

export default function Payment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [req, setReq] = useState<any>(null);
  const [method, setMethod] = useState("card");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    api.getRequest(id).then(setReq).finally(() => setLoading(false));
  }, [id]);

  const pay = async () => {
    if (!req) return;
    setProcessing(true);
    try {
      const amount_cents = (req.estimated_cost || 500) * 100;
      const r = await api.paymentIntent(req.id, amount_cents, method);
      // For card/upi, mock success
      if (method !== "cash") {
        await api.mockConfirm(req.id);
      }
      setResult({ ...r, method });
    } catch (e: any) {
      setResult({ error: e.message });
    } finally { setProcessing(false); }
  };

  if (loading) return (
    <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 40 }} /></SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} testID="pay-back"><Ionicons name="close" size={26} color={colors.onSurface} /></Pressable>
        <Text style={styles.title}>Payment</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>TOTAL</Text>
          <Text style={styles.amount}>₹{req?.estimated_cost || 500}</Text>
          <Text style={styles.desc}>{req?.issue_type} · {req?.garage_name || "Mechanic"}</Text>
        </View>

        {result?.paid || (result && !result.error && result.method !== "cash") ? (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            <Text style={styles.successTitle}>Payment Successful</Text>
            <Text style={styles.successSub}>Bill has been generated. Thank you!</Text>
            <Pressable
              testID="payment-done-btn"
              onPress={() => router.replace(`/request/${req.id}`)}
              style={styles.payBtn}
            >
              <Text style={styles.payBtnText}>DONE</Text>
            </Pressable>
          </View>
        ) : result?.method === "cash" ? (
          <View style={styles.successCard}>
            <Ionicons name="cash" size={64} color={colors.brand} />
            <Text style={styles.successTitle}>Cash Payment</Text>
            <Text style={styles.successSub}>Please pay ₹{req?.estimated_cost} to the mechanic on-site.</Text>
            <Pressable
              testID="payment-done-btn"
              onPress={() => router.replace(`/request/${req.id}`)}
              style={styles.payBtn}
            >
              <Text style={styles.payBtnText}>DONE</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.section}>Choose payment method</Text>
            {METHODS.map((m) => (
              <Pressable
                key={m.id}
                testID={`method-${m.id}`}
                onPress={() => setMethod(m.id)}
                style={[styles.methodRow, method === m.id && styles.methodActive]}
              >
                <Ionicons name={m.icon} size={24} color={method === m.id ? colors.brand : colors.onSurface} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodLabel}>{m.label}</Text>
                  <Text style={styles.methodSub}>{m.sub}</Text>
                </View>
                <Ionicons
                  name={method === m.id ? "radio-button-on" : "radio-button-off"}
                  size={22} color={method === m.id ? colors.brand : colors.onSurfaceSecondary}
                />
              </Pressable>
            ))}

            <Pressable
              testID="confirm-pay-btn"
              onPress={pay}
              disabled={processing}
              style={[styles.payBtn, processing && { opacity: 0.6 }]}
            >
              {processing ? <ActivityIndicator color={colors.onBrand} /> : (
                <Text style={styles.payBtnText}>PAY ₹{req?.estimated_cost || 500}</Text>
              )}
            </Pressable>

            {result?.error && <Text style={{ color: colors.error, marginTop: spacing.md }}>{result.error}</Text>}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", justifyContent: "space-between", padding: spacing.md, alignItems: "center" },
  title: { color: colors.onSurface, fontSize: font.size.lg, fontWeight: "800" },
  body: { padding: spacing.lg, gap: spacing.md, flex: 1 },
  amountCard: {
    padding: spacing.xl, backgroundColor: colors.brandTertiary, borderRadius: radius.lg,
    alignItems: "center", borderWidth: 1, borderColor: colors.brand,
  },
  amountLabel: { color: colors.brand, fontSize: font.size.sm, fontWeight: "800", letterSpacing: 1 },
  amount: { color: colors.onSurface, fontSize: font.size.hero, fontWeight: "900", marginVertical: 4 },
  desc: { color: colors.onSurfaceSecondary, fontSize: font.size.sm },
  section: { color: colors.onSurface, fontSize: font.size.lg, fontWeight: "800", marginTop: spacing.md },
  methodRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    borderWidth: 2, borderColor: colors.border,
  },
  methodActive: { borderColor: colors.brand },
  methodLabel: { color: colors.onSurface, fontWeight: "700", fontSize: font.size.base },
  methodSub: { color: colors.onSurfaceSecondary, fontSize: font.size.xs, marginTop: 2 },
  payBtn: {
    backgroundColor: colors.brandPrimary, borderRadius: radius.md,
    paddingVertical: spacing.lg, alignItems: "center", marginTop: spacing.md,
  },
  payBtnText: { color: colors.onBrand, fontWeight: "900", fontSize: font.size.lg, letterSpacing: 1 },
  successCard: { alignItems: "center", gap: spacing.sm, marginTop: spacing.xl },
  successTitle: { color: colors.success, fontWeight: "900", fontSize: font.size.xxl },
  successSub: { color: colors.onSurfaceSecondary, textAlign: "center" },
});
