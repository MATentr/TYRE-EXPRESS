import React from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useCallback } from "react";
import { colors } from "@/src/theme";

export default function AiTab() {
  const router = useRouter();
  useFocusEffect(
    useCallback(() => {
      router.push("/ai-detect");
    }, [])
  );
  return (
    <View style={styles.c}>
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}
const styles = StyleSheet.create({ c: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" } });
