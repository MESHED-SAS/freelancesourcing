import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Le greffon vitest:css-disable remplace le contenu de tout .css par une chaîne vide, même
    // lu avec ?raw, sauf s'il correspond à css.include. Seules les lectures brutes (?raw) sont
    // donc rétablies. Le témoin positif de
    // tests/app/theme-tokens.test.ts (et tous les tests qui lisent le CSS) dépend de ce réglage.
    css: { include: [/\.css\?raw$/] },
  },
});
