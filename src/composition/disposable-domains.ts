// Racine de composition, US-02 critère 4 : liste des domaines d'adresses email jetables, fournie
// au cas d'usage authenticateSession (AuthenticateSessionDependencies.disposableDomains).
// C'est une donnée, pas une règle : le domaine ne contient aucune liste (voir
// src/domain/identity/disposable-email.ts). Liste de démonstration, volontairement courte : ces
// deux domaines réels sont les seules exceptions aux domaines réservés (.example, .test).
// Entrées en minuscules, sans doublon. Tableau gelé.

export const DISPOSABLE_DOMAINS: readonly string[] = Object.freeze(["yopmail.com", "mailinator.com"]);
