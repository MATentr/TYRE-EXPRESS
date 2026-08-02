import React from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useEffect } from "react";
import { colors } from "@/src/theme";

export default function AiTab() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/ai-detect");
  }, []);
  return (
    <View style={styles.c}>
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}
const styles = StyleSheet.create({ c: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" } });
