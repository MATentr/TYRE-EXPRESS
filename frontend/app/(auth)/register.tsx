import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";

import { useAuth } from "@/src/auth-context";
import { colors, spacing, radius, font } from "@/src/theme";

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"user" | "mechanic">("user");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [garageName, setGarageName] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const useMyLocation = async () => {
    setLocErr("");
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocErr("Location permission denied. Enable in settings or type your address manually.");
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(point);
      try {
        const res = await Location.reverseGeocodeAsync(point);
        if (res && res[0]) {
          const a = res[0];
          const parts = [a.name, a.street, a.district, a.city, a.region, a.postalCode].filter(Boolean);
          const readable = parts.join(", ");
          if (readable && !address) setAddress(readable);
        }
      } catch {}
    } catch (e: any) {
      setLocErr(e?.message || "Could not get location.");
    } finally {
      setLocating(false);
    }
  };

  const submit = async () => {
    setErr("");
    setLoading(true);
    try {
      const body: any = {
        name, email: email.trim().toLowerCase(), password, role, phone,
      };
      if (role === "user") {
        body.vehicle_type = vehicleType;
        body.vehicle_number = vehicleNumber;
      } else {
        body.garage_name = garageName;
        body.address = address;
        if (coords) {
          body.lat = coords.lat; body.lng = coords.lng;
        } else {
          body.lat = 12.9716; body.lng = 77.5946;
        }
      }
      await register(body);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message || "Registration failed");
    } finally { setLoading(false); }
  };

  const canSubmit =
    !!name && !!email && !!password &&
    (role === "user" ? true : !!garageName && !!address);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back} testID="back-btn">
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>

          <Text style={styles.title}>Create account</Text>
          <Text style={styles.sub}>Join Tyre Express in 30 seconds.</Text>

          <View style={styles.roleRow}>
            <Pressable
              testID="role-user-btn"
              onPress={() => setRole("user")}
              style={[styles.roleBtn, role === "user" && styles.roleBtnActive]}
            >
              <Ionicons name="person" size={20} color={role === "user" ? colors.onBrand : colors.onSurface} />
              <Text style={[styles.roleText, role === "user" && styles.roleTextActive]}>Driver</Text>
            </Pressable>
            <Pressable
              testID="role-mechanic-btn"
              onPress={() => setRole("mechanic")}
              style={[styles.roleBtn, role === "mechanic" && styles.roleBtnActive]}
            >
              <Ionicons name="build" size={20} color={role === "mechanic" ? colors.onBrand : colors.onSurface} />
              <Text style={[styles.roleText, role === "mechanic" && styles.roleTextActive]}>Mechanic</Text>
            </Pressable>
          </View>

          <TextInput testID="reg-name" value={name} onChangeText={setName} placeholder="Full name"
            placeholderTextColor={colors.onSurfaceSecondary} style={styles.input} />
          <TextInput testID="reg-email" value={email} onChangeText={setEmail} placeholder="Email"
            placeholderTextColor={colors.onSurfaceSecondary} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
          <TextInput testID="reg-password" value={password} onChangeText={setPassword} placeholder="Password"
            placeholderTextColor={colors.onSurfaceSecondary} secureTextEntry style={styles.input} />
          <TextInput testID="reg-phone" value={phone} onChangeText={setPhone} placeholder="Phone (with country code)"
            placeholderTextColor={colors.onSurfaceSecondary} keyboardType="phone-pad" style={styles.input} />

          {role === "user" ? (
            <>
              <TextInput testID="reg-vehicle-type" value={vehicleType} onChangeText={setVehicleType}
                placeholder="Vehicle type (e.g. Sedan, Bike)"
                placeholderTextColor={colors.onSurfaceSecondary} style={styles.input} />
              <TextInput testID="reg-vehicle-number" value={vehicleNumber} onChangeText={setVehicleNumber}
                placeholder="Vehicle number (KA01AB1234)"
                placeholderTextColor={colors.onSurfaceSecondary} autoCapitalize="characters" style={styles.input} />
            </>
          ) : (
            <>
              <TextInput testID="reg-garage" value={garageName} onChangeText={setGarageName}
                placeholder="Garage / Business name"
                placeholderTextColor={colors.onSurfaceSecondary} style={styles.input} />

              <View style={styles.locSection}>
                <View style={styles.locHead}>
                  <Ionicons name="location" size={18} color={colors.onSurface} />
                  <Text style={styles.locTitle}>Garage Location</Text>
                </View>
                <Text style={styles.locSub}>
                  Drivers will find you by address. Set it accurately.
                </Text>

                <Pressable
                  testID="use-my-location-btn"
                  onPress={useMyLocation}
                  disabled={locating}
                  style={[styles.locBtn, locating && { opacity: 0.6 }]}
                >
                  {locating ? (
                    <ActivityIndicator color={colors.onSurface} />
                  ) : (
                    <>
                      <Ionicons name="navigate" size={18} color={colors.onSurface} />
                      <Text style={styles.locBtnText}>
                        {coords ? "Update to current location" : "Use my current location"}
                      </Text>
                    </>
                  )}
                </Pressable>

                {coords && (
                  <View style={styles.coordsPill} testID="coords-pill">
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={styles.coordsText}>
                      Pinned: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                    </Text>
                  </View>
                )}

                {locErr ? <Text style={styles.locErr}>{locErr}</Text> : null}

                <TextInput
                  testID="reg-address"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Street address, area, city, PIN"
                  placeholderTextColor={colors.onSurfaceSecondary}
                  multiline
                  style={[styles.input, styles.addressInput]}
                />
              </View>
            </>
          )}

          {err ? <Text style={styles.err}>{err}</Text> : null}

          <Pressable
            testID="register-submit-button"
            onPress={submit}
            disabled={loading || !canSubmit}
            style={({ pressed }) => [
              styles.cta,
              (loading || !canSubmit) && { opacity: 0.5 },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            {loading ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.ctaText}>CREATE ACCOUNT</Text>}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.muted}>Have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable testID="go-login-link"><Text style={styles.link}>Sign in</Text></Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  back: { padding: spacing.xs, marginBottom: spacing.md, alignSelf: "flex-start" },
  title: { color: colors.onSurface, fontSize: font.size.xxxl, fontWeight: "900", letterSpacing: 0.5 },
  sub: { color: colors.onSurfaceSecondary, fontSize: font.size.base, marginTop: spacing.xs, marginBottom: spacing.xl },
  roleRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  roleBtn: {
    flex: 1, flexDirection: "row", gap: spacing.sm, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSecondary, paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 2, borderColor: colors.border,
  },
  roleBtnActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  roleText: { color: colors.onSurface, fontWeight: "700", fontSize: font.size.base },
  roleTextActive: { color: colors.onBrand },
  input: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md,
    color: colors.onSurface, fontSize: font.size.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  addressInput: { minHeight: 72, textAlignVertical: "top", paddingTop: spacing.md },
  locSection: {
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  locHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  locTitle: { color: colors.onSurface, fontWeight: "800", fontSize: font.size.base, letterSpacing: 0.5 },
  locSub: { color: colors.onSurfaceSecondary, fontSize: font.size.sm },
  locBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.surfaceTertiary, borderRadius: radius.md,
    paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.borderStrong,
  },
  locBtnText: { color: colors.onSurface, fontWeight: "700" },
  coordsPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 6, alignSelf: "flex-start",
    borderWidth: 1, borderColor: colors.success,
  },
  coordsText: { color: colors.onSurface, fontSize: font.size.xs, fontWeight: "600" },
  locErr: { color: colors.error, fontSize: font.size.sm },
  err: { color: colors.error, marginBottom: spacing.md },
  cta: { backgroundColor: colors.brandPrimary, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center", marginTop: spacing.sm },
  ctaText: { color: colors.onBrand, fontSize: font.size.lg, fontWeight: "900", letterSpacing: 1 },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xl },
  muted: { color: colors.onSurfaceSecondary },
  link: { color: colors.brand, fontWeight: "700" },
});
