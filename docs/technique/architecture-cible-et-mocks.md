---
objet: Note d'architecture n°1. Socle cible pressenti, et stratégie de simulation (mocks) avec bascule préparée
date: 2026-09-24
statut: décidé. Les composants cibles sont « pressentis » : ils restent à confirmer composant par composant. Chaque confirmation est enregistrée dans l'inventaire (technique/inventaire-socle.md)
---

# Note d'architecture n°1 : socle cible et stratégie de simulation

## 1. Décision

1. **Les choix techniques proposés sont retenus comme cible pressentie :**
   - Supabase pour la base de données, les comptes et les droits d'accès ;
   - Next.js pour l'application web ;
   - un hébergeur français (Scaleway, OVHcloud ou Clever Cloud) ;
   - un service d'emails européen.
2. **Dans un premier temps, tout ce qui peut être simulé l'est.** On développe et on teste sans dépendre d'aucun service externe.
3. **La bascule vers chaque composant cible est préparée dès le départ.** Remplacer un composant simulé par le vrai composant ne doit demander aucune modification du code métier.
4. **Un inventaire du socle** (infrastructure, données, application, services externes, outillage) est tenu **dès le premier commit** : voir `technique/inventaire-socle.md`.

## 2. Le principe : des « prises » standard entre le métier et les services

Le code métier (les règles : échéances en jours ouvrés, dette de réponse, consentement, notation…) ne parle **jamais directement** à un service externe. Il passe par un **contrat** (une interface) qui décrit ce dont il a besoin, par exemple « envoyer un email » ou « vérifier un SIREN ».

Derrière chaque contrat, on branche **un adaptateur** :

- **un adaptateur simulé** (le mock) pour démarrer ;
- **un adaptateur réel** au moment de la bascule.

L'analogie : une prise électrique normalisée. L'appareil (le métier) ne sait pas si le courant vient d'un groupe électrogène de chantier (le mock) ou du réseau (la cible). Changer de source ne demande pas de recâbler l'appareil.

Ce modèle s'appelle **« ports et adaptateurs »**, ou architecture hexagonale.

**Les bénéfices :**

- le développement démarre sans compte ni abonnement à aucun service ;
- les tests sont rapides et reproductibles ;
- on peut changer de fournisseur, par exemple d'hébergeur ou de service d'emails, sans réécrire l'application ;
- **l'inventaire du socle** se rattache naturellement à la liste des contrats.

**Le point de vigilance :** un mock ne reproduit jamais parfaitement le vrai service. Chaque bascule doit donc passer par des **tests de contrat** : les mêmes tests sont exécutés sur le mock et sur le composant réel, et ils doivent donner les mêmes résultats.

### 2.1 Organisation du code

Le code est rangé en cinq couches, chacune dans son dossier :

| Dossier | Couche | Contenu | Peut dépendre de |
|---|---|---|---|
| `src/domain/` | Domaine | Règles métier (échéances en jours ouvrés, consentement, notation…) et contrats P1 à P11 | Rien d'autre que lui-même ; aucun paquet externe |
| `src/use-cases/` | Cas d'usage | Orchestration des règles et des contrats pour une action de l'utilisateur, par exemple « postuler à une mission » : vérifier le consentement, enregistrer, journaliser | `src/domain/` et lui-même ; aucun paquet externe |
| `src/adapters/` | Adaptateurs | Implémentations simulées, puis réelles, des contrats ; le choix entre elles se fait dans `src/composition/` | `src/domain/`, lui-même et la bibliothèque du service concerné |
| `src/app/` | Interface web | **Réservé** : ce dossier n'est créé que si Next.js est retenu | `src/use-cases/`, `src/composition/` et lui-même ; paquets externes autorisés |
| `src/composition/` | Racine de composition | Assemble les adaptateurs selon la configuration et les fournit aux cas d'usage | `src/domain/`, `src/use-cases/`, `src/adapters/` et lui-même ; aucun paquet externe |

Les règles de dépendance entre couches sont détaillées dans le tableau « Règles de dépendance par couche » ci-dessous. Les cas d'usage manipulent les contrats, jamais un adaptateur précis ; l'interface n'appelle jamais directement le domaine ni un adaptateur, ce qui maintient les contrôles d'accès côté serveur, dans les cas d'usage.

L'assemblage des adaptateurs selon la configuration (la « racine de composition » : choisir le mock ou le réel pour chaque contrat et les fournir aux cas d'usage) se fait en **un point d'entrée unique**, placé dans `src/composition/` (décision de l'US-01). Les fonctions de `src/composition/` reçoivent leur configuration en paramètre et ne lisent pas l'environnement ; la lecture des variables d'environnement sera faite par `loadConfig(process.env)` (US-02c, pas encore écrit).

**Règles de dépendance par couche**, contrôlées par `tests/architecture/layer-dependencies.test.ts` :

| Couche | Peut importer | Paquets externes |
|---|---|---|
| `src/domain/` | `src/domain/` | non |
| `src/use-cases/` | `src/domain/`, `src/use-cases/` | non |
| `src/adapters/` | `src/domain/`, `src/adapters/` | oui |
| `src/app/` | `src/use-cases/`, `src/app/`, `src/composition/` | oui |
| `src/composition/` | `src/domain/`, `src/use-cases/`, `src/adapters/`, `src/composition/` | non |

Tout fichier de `src/` appartient à l'une de ces cinq couches. `require(` est refusé dans tout `src/`, ainsi que tout `import()` dont l'argument n'est pas une chaîne littérale.

Limites du contrôle :

- lecture par motifs sur le texte, commentaires masqués, et non par arbre syntaxique : le test protège contre l'oubli, pas contre un contournement volontaire ;
- seuls les fichiers `src/**/*.ts` sont lus : le motif de `tests/architecture/source-files.ts` doit être élargi (`.tsx`) avant de créer `src/app/` ;
- les cycles d'imports ne sont pas contrôlés ;
- `import type` compte comme un import : une dépendance de type est soumise aux mêmes règles ;
- les spécificateurs commençant par `#` ou `/` sont traités comme des paquets externes.

**Horloge :** `Date.now(` et `new Date` (avec ou sans parenthèses) sont interdits dans tout `src/`, sauf `src/adapters/clock/system-clock.ts` (adaptateur système de P1). Les identifiants `Date`, `performance`, `process` et `Temporal` sont interdits dans `src/domain/` et `src/use-cases/` (commentaires et chaînes exclus). Contrôle : `tests/architecture/clock-usage.test.ts`.

**Types du noyau :** `src/domain/` et `src/use-cases/` sont aussi compilés sans types DOM ni Node (`tsconfig.core.json`, lancé par `npm test`) ; limite : `types: []` coupe seulement le chargement automatique des `@types`, c'est le test des couches qui empêche les imports qui les rouvriraient.

Pourquoi `use-cases` et non `application` : dans Next.js, le dossier `app/` désigne le routeur de l'interface web. Le nom `use-cases` évite de confondre les deux.

### 2.2 Environnement d'exécution et composants simulés

**Cette section est la source unique ; CLAUDE.md, `.env.example` et `inventaire-socle.md` y renvoient.**

- L'environnement d'exécution vaut `development`, `staging` ou `production` (type `AppEnvironment`, `src/composition/environment.ts`).
- **Les composants simulés ne sont autorisés qu'en `development` et `staging`.** À ce jour : l'adaptateur d'authentification « personas » (P2), l'horloge « simulated » (P1) et le journal d'audit « in-memory » (P10).
- La garde est une **liste blanche** (`isMockAllowed`) : comparaison exacte, casse comprise, sans normalisation. Toute autre valeur, y compris une valeur incorrecte qui contournerait le typage, est refusée.
- **L'horloge « system » est autorisée dans tous les environnements.**
- `createClock`, `createAuthProvider` et `createAuditLog` reçoivent l'environnement en paramètre (champ `environment`, obligatoire, sans valeur par défaut) et lèvent une erreur « Configuration refusée » si un composant simulé est demandé hors `development` et `staging`. Pour « personas » et « in-memory », la garde passe après le contrôle de valeur absente ; pour « simulated », avant le contrôle de `simulatedStart`.
- **Production par défaut :** la lecture de `APP_ENV` sera faite par `loadConfig(process.env)` (US-02c, pas encore écrit). Variable absente : `production` ; valeur inconnue : erreur. D'ici là, aucune variable d'environnement n'est lue.

Tests : `tests/composition/environment.test.ts`, `tests/composition/create-auth-provider.test.ts` et `tests/composition/create-clock.test.ts`.

## 3. Les contrats et leurs simulations

| # | Contrat (besoin métier) | Simulation au démarrage | Cible pressentie | Condition de bascule | Fonctions du MVP concernées |
|---|---|---|---|---|---|
| P1 | **Horloge** : quelle est la date et l'heure ? Quels sont les jours ouvrés ? | **Horloge simulée** que l'on peut avancer à volonté (« avancer de 15 jours ouvrés »), avec un calendrier des jours fériés français ; autorisée en development et staging uniquement (§2.2). L'horloge système est déjà disponible et choisie par défaut | Horloge système et calendrier des jours fériés (liste officielle ou bibliothèque) | Dès la mise en production | E3.4, E4.4, E4.5, règles R1 à R3 |
| P2 | **Authentification** : qui est connecté, et avec quel rôle ? | Écran de connexion fictif : choisir parmi six personas (Sophie, Karim, Julie et Marc, freelances ; un recruteur d'Alpha Conseil ; un administrateur). **Mock livré** (US-02a) : `PersonaAuthProvider` (`src/adapters/auth/`), adresses fictives en domaines réservés, jetons devinables. `createAuthProvider` (`src/composition/`) reçoit sa configuration en paramètre et n'a **aucune valeur par défaut** : le mock exige le choix explicite « personas ». Il est refusé hors development et staging (§2.2). La lecture de `ADAPTER_AUTH` dans l'environnement n'est pas encore branchée, et l'écran de connexion viendra avec l'US-02c. Adaptateur réel à venir | Supabase Auth avec LinkedIn, Google et Microsoft | Applications de connexion créées chez LinkedIn, Google et Microsoft | E1.1 |
| P3 | **Stockage des données** : missions, profils, candidatures, notes, consentements | Stockage en mémoire, avec un jeu de données de démonstration | PostgreSQL (Supabase), avec des **règles d'accès dans la base** (Row Level Security) | Choix de la région d'hébergement européenne | Toutes |
| P4 | **Contrôle des accès (consentement)** : ce recruteur peut-il voir ce profil ? | **Règles écrites et testées dans le code métier** | Les mêmes règles **dupliquées dans la base** (Row Level Security), en double protection | En même temps que P3 | E2.1, E2.2, E2.5, E2.7 |
| P5 | **Envoi d'emails** : relances, notifications, mises en relation | **Boîte de réception de test** consultable dans l'application ; aucun email réel n'est envoyé | Service d'emails européen (à choisir) | Choix du fournisseur et du nom de domaine | E10.2, E6.1 |
| P6 | **Vérification d'entreprise** : ce SIREN existe-t-il, qui en est le dirigeant ? | Jeu de SIREN fictifs (valide, fermé, dirigeant différent) | API publique Sirene et « Recherche d'entreprises » | Dès le pilote | E1.4, E1.10 |
| P7 | **Tâches planifiées** : vérifier chaque jour les délais (confirmation à 10 jours ouvrés, réponse sous 10 jours ouvrés…) | Déclenchement manuel ou par l'horloge simulée | Tâche planifiée de l'hébergeur ou de Supabase | Choix de l'hébergeur | E3.4, E4.4, E4.5 |
| P8 | **Détection des coordonnées** dans les textes libres | Règles de détection (téléphone, email, URL) | Mêmes règles, éventuellement complétées par une IA | Si le pilote montre des oublis | E2.7 |
| P9 | **Stockage de fichiers** : CV original transmis après la mise en relation | Dossier local | Stockage de fichiers dans l'UE (Supabase Storage ou celui de l'hébergeur) | Choix de l'hébergeur | E2.7, E6.1 |
| P10 | **Journal des actions sensibles** : consultations de profil, révélation de coordonnées, modération | Table en mémoire, consultable. **Mock livré** (US-02b), port minimal : `AuditLog` (`src/domain/audit/`) n'offre qu'ajouter et lister, en ajout seul, avec un seul type d'événement (refus par rôle, écrit par `authorizeRole`). `InMemoryAuditLog` (`src/adapters/audit/`) garde des entrées gelées, propres à chaque instance, perdues à l'arrêt du processus. `createAuditLog` (`src/composition/`) n'a **aucune valeur par défaut** : le mock exige le choix explicite « in-memory ». Il est refusé hors development et staging (§2.2). La lecture de `ADAPTER_AUDIT_LOG` dans l'environnement n'est pas encore branchée (US-02c). Les autres actions (consultation de profil, révélation de coordonnées, modération) et la durée de conservation viendront avec l'US-07 | Table en base, non modifiable, avec durée de conservation | En même temps que P3 | E2.5, E11.3 |
| P11 | **Analyse de CV par IA** (Should) | Réponse fixe : un profil prérempli type | Modèle d'IA (fournisseur à choisir, hébergement des données à vérifier) | Après le pilote, décision spécifique | E1.6 |

**La plus importante de ces simulations est P1, l'horloge.** Elle permet de tester en quelques secondes des scénarios qui durent des semaines, comme les exemples « Alpha Conseil » (publication le 1er octobre, pause le 5 novembre, clôture le 13 novembre). Sans elle, les règles strictes seraient presque impossibles à vérifier.

## 4. Règles pour Claude Code (à reprendre dans CLAUDE.md)

1. **Aucun appel direct à un service externe depuis le code métier.** Toujours passer par un contrat P1 à P11.
2. Tout nouveau contrat, ou tout nouvel adaptateur, doit être **ajouté à l'inventaire** et à ce tableau.
3. Chaque contrat a une **suite de tests de contrat**, exécutée sur le mock aujourd'hui et sur le composant réel au moment de la bascule.
4. Le choix de l'adaptateur (mock ou réel) se fait **par configuration**, jamais en modifiant le code.
5. **Aucune donnée réelle dans les mocks** : personas et SIREN fictifs uniquement.
6. **Respecter les règles de dépendance entre couches** (section 2.1). Leur respect est vérifié par `tests/architecture/layer-dependencies.test.ts` (limites indiquées en section 2.1).
7. **Aucun composant simulé en production** : respecter la règle de la section 2.2 (liste blanche `development`, `staging` ; production par défaut).

## 5. Ce qui reste à décider (composant par composant)

| Composant | Décision attendue | Quand |
|---|---|---|
| Hébergeur de l'application | Scaleway, OVHcloud ou Clever Cloud | Avant le pilote |
| Région Supabase, ou PostgreSQL hébergé en propre | Région européenne ; Supabase géré par l'éditeur ou installé chez l'hébergeur français | Avant le pilote |
| Service d'emails | Fournisseur européen | Avant le pilote |
| Fournisseur d'IA pour l'analyse de CV | Selon la localisation des données et le coût | Après le pilote |
