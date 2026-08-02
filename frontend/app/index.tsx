import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/src/auth-context";

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#111315", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#FFD600" size="large" />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)" />;
}
