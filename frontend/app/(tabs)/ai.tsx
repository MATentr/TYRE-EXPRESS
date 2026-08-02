import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "@/src/theme";

/**
 * Inert placeholder — the AI Detect tab intercepts tabPress in _layout.tsx and
 * pushes /ai-detect directly, so this component never actually renders in
 * normal usage. Kept as an empty screen to satisfy the Tabs router.
 */
export default function AiTabPlaceholder() {
  return <View style={styles.c} />;
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.surface },
});
