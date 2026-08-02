import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { colors, spacing, radius, font } from "@/src/theme";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <LinearGradient
              colors={["#FFFFFF", "#F2F2F7"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.logo}
            >
              <Ionicons name="car-sport" size={44} color={colors.onBrand} />
            </LinearGradient>
            <Text style={styles.brand}>TYRE EXPRESS</Text>
            <Text style={styles.tag}>Roadside rescue on demand.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="login-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.onSurfaceSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              testID="login-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.onSurfaceSecondary}
              secureTextEntry
              style={styles.input}
            />

            {err ? <Text style={styles.err}>{err}</Text> : null}

            <Pressable
              testID="login-submit-button"
              onPress={submit}
              disabled={loading || !email || !password}
              style={({ pressed }) => [
                styles.cta,
                (loading || !email || !password) && { opacity: 0.5 },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <Text style={styles.ctaText}>SIGN IN</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.muted}>New here? </Text>
              <Link href="/(auth)/register" asChild>
                <Pressable testID="go-register-link">
                  <Text style={styles.link}>Create account</Text>
                </Pressable>
              </Link>
            </View>

            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Demo mechanic:</Text>
              <Text style={styles.demoText}>ravi@tyreexpress.com / mechanic123</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg, flexGrow: 1, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: spacing.xxl },
  logo: {
    width: 88, height: 88, borderRadius: 20,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.lg,
  },
  brand: { color: colors.brand, fontSize: font.size.xxxl, fontWeight: "900", letterSpacing: 2 },
  tag: { color: colors.onSurfaceSecondary, fontSize: font.size.base, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.xl, borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.onSurface, fontSize: font.size.xxl, fontWeight: "800", marginBottom: spacing.xl },
  label: { color: colors.onSurfaceSecondary, fontSize: font.size.sm, fontWeight: "600", marginBottom: spacing.xs, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surfaceTertiary, borderRadius: radius.md,
    padding: spacing.md, color: colors.onSurface, fontSize: font.size.lg,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  err: { color: colors.error, marginBottom: spacing.md, fontSize: font.size.sm },
  cta: {
    backgroundColor: colors.brandPrimary, borderRadius: radius.md,
    paddingVertical: spacing.lg, alignItems: "center", marginTop: spacing.sm,
  },
  ctaText: { color: colors.onBrand, fontSize: font.size.lg, fontWeight: "900", letterSpacing: 1 },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
  muted: { color: colors.onSurfaceSecondary, fontSize: font.size.base },
  link: { color: colors.brand, fontSize: font.size.base, fontWeight: "700" },
  demoBox: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.brandTertiary, borderRadius: radius.sm },
  demoTitle: { color: colors.brand, fontSize: font.size.xs, fontWeight: "700", textTransform: "uppercase" },
  demoText: { color: colors.onSurface, fontSize: font.size.sm, marginTop: 2 },
});
