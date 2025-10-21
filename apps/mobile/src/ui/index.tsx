import React from "react";

interface UIProviderProps {
  children: React.ReactNode;
}

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  return <>{children}</>;
};

export default UIProvider;
