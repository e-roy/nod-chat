import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input } from "../ui/components";
import { useAuthStore } from "../store/auth";
import { showAlert } from "../utils/alert";

const ProfileSetupScreen: React.FC = () => {
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const { user, updateProfile } = useAuthStore();

  const handleCompleteProfile = async () => {
    if (!displayName.trim()) {
      showAlert("Error", "Please enter your display name");
      return;
    }

    try {
      setLoading(true);
      await updateProfile({ displayName: displayName.trim() });
      // Navigation will be handled by the auth state change
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Let's set up your profile to get started
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputSection}>
            <Text style={styles.label}>Display Name</Text>
            <Input
              placeholder="Enter your display name"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Complete Profile"
              onPress={handleCompleteProfile}
              loading={loading}
              disabled={loading}
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
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  form: {
    flex: 1,
    gap: 24,
  },
  inputSection: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  buttonContainer: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 16,
  },
});

export default ProfileSetupScreen;
