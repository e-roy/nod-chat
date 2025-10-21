import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";

interface ToastProps {
  title?: string;
  description?: string;
  action?: "success" | "error" | "warning" | "info";
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  title,
  description,
  action = "info",
  isVisible,
  onClose,
}) => {
  if (!isVisible) return null;

  const getToastStyle = () => {
    switch (action) {
      case "success":
        return { backgroundColor: "#10B981" };
      case "error":
        return { backgroundColor: "#EF4444" };
      case "warning":
        return { backgroundColor: "#F59E0B" };
      default:
        return { backgroundColor: "#3B82F6" };
    }
  };

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, getToastStyle()]}>
          <View style={styles.content}>
            {title && <Text style={styles.title}>{title}</Text>}
            {description && (
              <Text style={styles.description}>{description}</Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 200,
    maxWidth: "90%",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  closeButton: {
    marginLeft: 12,
    padding: 4,
  },
  closeText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});

export default Toast;
