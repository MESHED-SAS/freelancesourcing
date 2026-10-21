import type { ReactNode } from "react";

// Mise en page racine (US-02c). Volontairement vide à ce stade : le bandeau « mode
// démonstration » et les jetons de design viendront avec les pages.
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
