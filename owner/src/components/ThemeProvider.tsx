// src/components/ThemeProvider.tsx
import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

// Note: The original 'sonner.tsx' used `useTheme` which implies it expects `next-themes`.
// We re-export/wrap it here to be consistent with how Shadcn/ui components are often structured.
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}