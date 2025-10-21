import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input, Toast } from "../ui/components";
import { useAuthStore } from "../store/auth";
import { showAlert } from "../utils/alert";

const AuthScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const { signUp, signIn, error, clearError } = useAuthStore();

  const handleAuth = async () => {
    if (!email || !password) {
      showAlert("Error", "Please fill in all fields");
      return;
    }

    if (isSignUp && !displayName) {
      showAlert("Error", "Please enter your display name");
      return;
    }

    try {
      setLoading(true);
      clearError();

      if (isSignUp) {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      showAlert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? "Sign up to start chatting with friends"
              : "Sign in to continue chatting"}
          </Text>
        </View>

        <View style={styles.form}>
          {isSignUp && (
            <Input
              placeholder="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          )}

          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Button
            title={isSignUp ? "Sign Up" : "Sign In"}
            onPress={handleAuth}
            loading={loading}
            disabled={loading}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
          </Text>
          <Button
            title={isSignUp ? "Sign In" : "Sign Up"}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setEmail("");
              setPassword("");
              setDisplayName("");
              clearError();
            }}
            variant="link"
          />
        </View>

        {error && (
          <Toast
            title="Error"
            description={error}
            action="error"
            isVisible={!!error}
            onClose={clearError}
          />
        )}
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
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
  },
  form: {
    gap: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 16,
    color: "#666",
  },
});

export default AuthScreen;
