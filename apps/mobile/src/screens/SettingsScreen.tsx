import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../ui/components";
import { useAuthStore } from "../store/auth";

const SettingsScreen: React.FC = () => {
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.subsection}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Text style={styles.infoText}>
              Name: {user?.displayName || "Not set"}
            </Text>
            <Text style={styles.infoText}>Email: {user?.email}</Text>
          </View>

          <View style={styles.subsection}>
            <Text style={styles.sectionTitle}>Account</Text>
            <Button
              title="Sign Out"
              onPress={handleSignOut}
              variant="outline"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  section: {
    gap: 24,
  },
  subsection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  infoText: {
    fontSize: 16,
    color: "#666",
  },
});

export default SettingsScreen;
