import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/auth-context";
import { colors } from "@/src/theme";

export default function TabsLayout() {
  const { user } = useAuth();
  const isMechanic = user?.role === "mechanic";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.onSurfaceSecondary,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 68,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isMechanic ? "Dashboard" : "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={isMechanic ? "grid" : "map"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: isMechanic ? "Jobs" : "Requests",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: "AI Detect",
          href: isMechanic ? null : "/(tabs)/ai",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
