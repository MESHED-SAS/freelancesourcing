import type { ReactNode } from "react";
import "./theme/tokens.css";
import "./globals.css";

// Mise en page racine (US-02c). Feuilles chargées dans cet ordre : les jetons, puis les styles
// de base qui les utilisent (contrôle CT7). Le bandeau « mode démonstration » viendra avec les pages.
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
