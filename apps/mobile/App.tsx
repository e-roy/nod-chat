import React from "react";
import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { UIProvider } from "./src/ui";
import AppNavigator from "./src/navigation";

export default function App() {
  return (
    <UIProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </UIProvider>
  );
}
