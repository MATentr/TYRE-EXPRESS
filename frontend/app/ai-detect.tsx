import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, Image, ActivityIndicator, ScrollView, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { colors, spacing, radius, font, ISSUE_TYPES } from "@/src/theme";

export default function AiDetect() {
  const router = useRouter();
  const [image, setImage] = useState<{ uri: string; base64: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const pickImage = async (source: "camera" | "library") => {
    setResult(null);
    let perm;
    if (source === "camera") {
      perm = await ImagePicker.requestCameraPermissionsAsync();
    } else {
      perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
    if (!perm.granted) return;
    const res = source === "camera"
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6 });
    if (res.canceled) return;
    const asset = res.assets[0];
    if (!asset.base64) return;
    setImage({ uri: asset.uri, base64: asset.base64 });
    analyze(asset.base64);
  };

  const analyze = async (b64: string) => {
    setAnalyzing(true);
    try {
      const r = await api.aiAnalyze(b64);
      setResult(r);
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const confirmRequest = async () => {
    if (!result?.issue_type) return;
    setCreating(true);
    try {
      let lat = 12.9716, lng = 77.5946;
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.granted) {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      }
      const req = await api.createRequest({
        issue_type: result.issue_type,
        lat, lng,
        description: result.notes,
        photo_b64: image?.base64,
      });
      if (req.mechanic_phone) {
        setTimeout(() => Linking.openURL(`tel:${req.mechanic_phone.replace(/\s/g, "")}`).catch(() => {}), 400);
      }
      router.replace(`/request/${req.id}`);
    } catch {} finally { setCreating(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)");
          }}
          style={styles.back}
          testID="back-ai"
        >
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>AI Issue Detection</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.imageBox}>
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="camera-outline" size={64} color={colors.onSurfaceSecondary} />
              <Text style={styles.placeholderText}>Take a photo of the problem</Text>
              <Text style={styles.placeholderSub}>Tyre, engine, battery — anything.</Text>
            </View>
          )}
          {analyzing && (
            <View style={styles.analyzingOverlay}>
              <ActivityIndicator color={colors.brand} size="large" />
              <Text style={styles.analyzingText}>Analyzing photo…</Text>
            </View>
          )}
        </View>

        <View style={styles.pickRow}>
          <Pressable testID="pick-camera-btn" onPress={() => pickImage("camera")} style={[styles.pickBtn, styles.pickPrimary]}>
            <Ionicons name="camera" size={20} color={colors.onBrand} />
            <Text style={styles.pickPrimaryText}>Camera</Text>
          </Pressable>
          <Pressable testID="pick-library-btn" onPress={() => pickImage("library")} style={[styles.pickBtn, styles.pickSecondary]}>
            <Ionicons name="images-outline" size={20} color={colors.onSurface} />
            <Text style={styles.pickSecondaryText}>Gallery</Text>
          </Pressable>
        </View>

        {result && !result.error && (
          <View style={styles.resultCard}>
            <View style={styles.resultHead}>
              <Ionicons name="sparkles" size={18} color={colors.brand} />
              <Text style={styles.resultTitle}>AI Detected</Text>
            </View>
            <Text style={styles.detectedType}>
              {ISSUE_TYPES.find((i) => i.id === result.issue_type)?.label || result.issue_type}
            </Text>
            <Text style={styles.confidence}>
              {Math.round((result.confidence || 0) * 100)}% confidence
            </Text>
            {result.notes ? <Text style={styles.notes}>{result.notes}</Text> : null}
            {result.estimated_cost_inr ? (
              <Text style={styles.cost}>Estimated cost: ₹{result.estimated_cost_inr}</Text>
            ) : null}
            <Pressable
              testID="confirm-ai-request-btn"
              onPress={confirmRequest}
              disabled={creating}
              style={[styles.confirmBtn, creating && { opacity: 0.6 }]}
            >
              {creating ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <Text style={styles.confirmText}>CONFIRM & REQUEST HELP</Text>
              )}
            </Pressable>
          </View>
        )}

        {result?.error && (
          <View style={styles.errorCard}>
            <Ionicons name="warning" size={20} color={colors.error} />
            <Text style={styles.errorText}>{result.error}</Text>
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
  body: { padding: spacing.lg, gap: spacing.md },
  imageBox: {
    aspectRatio: 4 / 3, borderRadius: radius.lg, overflow: "hidden",
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
  },
  image: { width: "100%", height: "100%" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  placeholderText: { color: colors.onSurface, fontSize: font.size.lg, fontWeight: "700" },
  placeholderSub: { color: colors.onSurfaceSecondary },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(17,19,21,0.85)",
    alignItems: "center", justifyContent: "center", gap: spacing.md,
  },
  analyzingText: { color: colors.brand, fontSize: font.size.base, fontWeight: "700" },
  pickRow: { flexDirection: "row", gap: spacing.md },
  pickBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: spacing.md, borderRadius: radius.md,
  },
  pickPrimary: { backgroundColor: colors.brandPrimary },
  pickSecondary: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  pickPrimaryText: { color: colors.onBrand, fontWeight: "800" },
  pickSecondaryText: { color: colors.onSurface, fontWeight: "700" },
  resultCard: {
    backgroundColor: colors.surfaceSecondary, padding: spacing.lg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.brand, gap: spacing.sm,
  },
  resultHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  resultTitle: { color: colors.brand, fontWeight: "800", letterSpacing: 0.5 },
  detectedType: { color: colors.onSurface, fontSize: font.size.xxl, fontWeight: "900" },
  confidence: { color: colors.onSurfaceSecondary, fontSize: font.size.sm },
  notes: { color: colors.onSurface, fontSize: font.size.base, lineHeight: 20 },
  cost: { color: colors.brand, fontSize: font.size.base, fontWeight: "700" },
  confirmBtn: { backgroundColor: colors.brandPrimary, paddingVertical: spacing.lg, borderRadius: radius.md, alignItems: "center", marginTop: spacing.sm },
  confirmText: { color: colors.onBrand, fontWeight: "900", letterSpacing: 1 },
  errorCard: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.error },
  errorText: { color: colors.error, flex: 1 },
});
