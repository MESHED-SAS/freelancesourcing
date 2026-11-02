// Point de passage unique des pages et des actions vers les services (US-02c, décisions 13 et 28).
// Seul fichier de src/ qui lit l'environnement du processus (AR5), et seul importateur de
// services.ts (AR4). Mince, non testé par Vitest : la logique est dans services.ts.
// connection() rend dynamique tout rendu qui l'appelle : une page qui utilise les services ne peut
// donc pas être figée au build avec l'environnement de la machine de construction (piège observé
// en PR 1). À appeler dans le rendu ou dans une action, jamais au niveau du module.

import { connection } from "next/server.js";
import { getServices, type Services } from "./services.js";

export type { Services } from "./services.js";

export async function getRuntimeServices(): Promise<Services> {
  await connection();
  return getServices(process.env);
}
