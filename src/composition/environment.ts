// Racine de composition : environnement d'exécution (« development », « staging » ou « production »)
// et garde des composants simulés.
// La garde est une liste blanche : seuls « development » et « staging » permettent un composant simulé.
// Toute autre valeur, y compris une valeur incorrecte qui contournerait le typage, est refusée.
// Ce module ne lit ni process ni l'environnement : l'environnement est reçu en paramètre.
// La règle « variable absente = production » et la validation du texte brut de APP_ENV appartiennent
// à loadConfig (US-02c, pas encore écrit).

export type AppEnvironment = "development" | "staging" | "production";

const MOCK_ALLOWED_ENVIRONMENTS: readonly string[] = ["development", "staging"];

// Comparaison exacte, casse comprise, sans normalisation.
export function isMockAllowed(environment: AppEnvironment): boolean {
  return MOCK_ALLOWED_ENVIRONMENTS.includes(environment);
}
