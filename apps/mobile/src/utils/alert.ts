export const showAlert = (title: string, message: string) => {
  // Check if we're running on web
  if (typeof window !== "undefined" && window.alert) {
    // Use browser's native alert for web
    window.alert(`${title}\n\n${message}`);
  } else {
    // For React Native, we'll use a simple console log for now
    // In a real app, you'd want to use a proper alert library or modal
    console.log(`Alert: ${title} - ${message}`);

    // If you want to use React Native Alert, you'd need to import it conditionally
    // but that requires more complex setup for web compatibility
  }
};
