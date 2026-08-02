import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { colors, spacing, radius, font } from "@/src/theme";

export default function Sos() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<any>(null);

  const load = async () => {
    try { const list = await api.getSosContacts(); setContacts(list); } catch {}
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name || !phone) return;
    try {
      const list = await api.addSosContact(name, phone);
      setContacts(list); setName(""); setPhone("");
    } catch {}
  };

  const del = async (id: string) => {
    try { const list = await api.delSosContact(id); setContacts(list); } catch {}
  };

  const sendSos = async () => {
    setSending(true);
    try {
      let lat = 12.9716, lng = 77.5946;
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.granted) {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      }
      const r = await api.sosAlert(lat, lng);
      setSent(r);
    } catch {} finally { setSending(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} testID="sos-back"><Ionicons name="close" size={26} color={colors.onSurface} /></Pressable>
        <Text style={styles.title}>Emergency SOS</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.warnCard}>
          <Ionicons name="alert" size={22} color={colors.error} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warnTitle}>In danger?</Text>
            <Text style={styles.warnSub}>Tap SOS to send your live location to all contacts.</Text>
          </View>
        </View>

        <Pressable
          testID="send-sos-btn"
          onPress={sendSos}
          disabled={sending || contacts.length === 0}
          style={[styles.sosBig, (sending || contacts.length === 0) && { opacity: 0.5 }]}
        >
          {sending ? <ActivityIndicator color={colors.onError} size="large" /> : (
            <>
              <Ionicons name="alert" size={32} color={colors.onError} />
              <Text style={styles.sosBigText}>SEND SOS ALERT</Text>
              <Text style={styles.sosBigSub}>Notifies {contacts.length} contact(s)</Text>
            </>
          )}
        </Pressable>

        {sent && (
          <View style={styles.sentCard}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sentTitle}>Alert sent</Text>
              <Text style={styles.sentSub}>To {sent.sent_to.length} contact(s)</Text>
              <Pressable onPress={() => Linking.openURL(sent.map_link)}>
                <Text style={styles.sentLink}>Open location on map ↗</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Text style={styles.section}>Emergency Contacts</Text>

        {contacts.length === 0 ? (
          <Text style={styles.emptyText}>Add contacts below to enable SOS.</Text>
        ) : contacts.map((c) => (
          <View key={c.id} style={styles.contactRow} testID={`sos-contact-${c.id}`}>
            <Ionicons name="person-circle" size={32} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.contactName}>{c.name}</Text>
              <Text style={styles.contactPhone}>{c.phone}</Text>
            </View>
            <Pressable onPress={() => del(c.id)} testID={`delete-sos-${c.id}`}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </Pressable>
          </View>
        ))}

        <View style={styles.addBox}>
          <Text style={styles.addTitle}>Add contact</Text>
          <TextInput
            testID="sos-name-input"
            value={name} onChangeText={setName}
            placeholder="Name" placeholderTextColor={colors.onSurfaceSecondary}
            style={styles.input}
          />
          <TextInput
            testID="sos-phone-input"
            value={phone} onChangeText={setPhone}
            placeholder="Phone (+91…)" placeholderTextColor={colors.onSurfaceSecondary}
            keyboardType="phone-pad" style={styles.input}
          />
          <Pressable testID="sos-add-btn" onPress={add} disabled={!name || !phone} style={[styles.addBtn, (!name || !phone) && { opacity: 0.5 }]}>
            <Text style={styles.addBtnText}>ADD CONTACT</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", justifyContent: "space-between", padding: spacing.md, alignItems: "center" },
  title: { color: colors.onSurface, fontSize: font.size.lg, fontWeight: "800" },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  warnCard: {
    flexDirection: "row", gap: spacing.md, padding: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.error, alignItems: "center",
  },
  warnTitle: { color: colors.onSurface, fontSize: font.size.lg, fontWeight: "800" },
  warnSub: { color: colors.onSurfaceSecondary, fontSize: font.size.sm, marginTop: 2 },
  sosBig: {
    backgroundColor: colors.error, borderRadius: radius.lg,
    alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: 6,
  },
  sosBigText: { color: colors.onError, fontWeight: "900", fontSize: font.size.xxl, letterSpacing: 1 },
  sosBigSub: { color: colors.onError, fontSize: font.size.sm, opacity: 0.9 },
  sentCard: { flexDirection: "row", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderColor: colors.success, borderWidth: 1 },
  sentTitle: { color: colors.success, fontWeight: "800" },
  sentSub: { color: colors.onSurface, marginTop: 2 },
  sentLink: { color: colors.brand, marginTop: 4, fontWeight: "700" },
  section: { color: colors.onSurface, fontSize: font.size.lg, fontWeight: "800", marginTop: spacing.md },
  emptyText: { color: colors.onSurfaceSecondary },
  contactRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  contactName: { color: colors.onSurface, fontWeight: "700" },
  contactPhone: { color: colors.onSurfaceSecondary, fontSize: font.size.sm },
  addBox: {
    padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, marginTop: spacing.md, gap: spacing.md,
  },
  addTitle: { color: colors.onSurface, fontWeight: "800", fontSize: font.size.lg },
  input: { backgroundColor: colors.surfaceTertiary, color: colors.onSurface, padding: spacing.md, borderRadius: radius.md, fontSize: font.size.lg },
  addBtn: { backgroundColor: colors.brand, padding: spacing.md, borderRadius: radius.md, alignItems: "center" },
  addBtnText: { color: colors.onBrand, fontWeight: "900", letterSpacing: 0.5 },
});
