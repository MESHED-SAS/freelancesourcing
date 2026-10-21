---
objet: Inventaire du socle technique (souches infrastructure et applicatives)
date_creation: 2026-09-24
derniere_mise_a_jour: 2026-10-21
statut: v0. Socle TypeScript validé (Node.js, TypeScript, npm, Vitest), intégration continue validée (tests et SBOM), Next.js et React installés (US-02c) ; autres composants pressentis ou simulés
regle: tout ajout, toute suppression ou toute montée de version d'un composant met à jour cet inventaire, dans le même commit (règle inscrite dans CLAUDE.md)
---

# Inventaire du socle technique

## 0. À quoi sert cet inventaire

C'est l'équivalent d'une **CMDB** (base de configuration) à l'échelle du projet. Pour chaque composant, il dit ce qu'on utilise, dans quelle version, sous quelle licence, qui l'édite, où vont les données, et jusqu'à quand il est maintenu. Il sert à :

- **la sécurité** : savoir en quelques minutes si une faille publiée touche le projet ;
- **le RGPD** : alimenter la liste des sous-traitants et des pays d'hébergement du registre des traitements ;
- **la licence AGPL** : vérifier que chaque composant est compatible ;
- **la transparence** : il peut être publié tel quel, ce qui est cohérent avec les principes du projet ;
- **la bascule des mocks** : suivre l'état de chaque composant (simulé, pressenti, validé, en production).

**Deux niveaux de détail :**

1. **Ce document** : les souches principales, par couche, tenues à la main.
2. **La liste exhaustive des bibliothèques**, générée automatiquement à chaque livraison. C'est ce qu'on appelle une **SBOM** (Software Bill of Materials, la « nomenclature » du logiciel), au format standard CycloneDX. Elle est produite par l'outillage d'intégration continue, et non saisie à la main.

## 1. Légende des statuts

| Statut | Signification |
|---|---|
| 🧪 Simulé | Un mock est utilisé ; le composant réel n'est pas encore branché |
| 🎯 Pressenti | Choix cible retenu, pas encore confirmé |
| ✅ Validé | Choix confirmé, version figée |
| 🚀 En production | Utilisé en production |
| ⛔ Retiré | Abandonné ; conservé pour l'historique |

## 2. Inventaire par couche

**Colonnes à renseigner pour chaque composant :** version, fin de support, responsable, date de dernière revue. Elles le seront au premier commit et à chaque revue.

### 2.1 Infrastructure (hébergement, réseau)

| Composant | Rôle | Statut | Licence / type | Éditeur (pays) | Localisation des données | Contrat simulé |
|---|---|---|---|---|---|---|
| Hébergeur de l'application : Scaleway, OVHcloud ou Clever Cloud | Exécuter l'application web et les tâches planifiées | 🎯 Pressenti (fournisseur à choisir) | Service commercial | France | France / UE | Exécution locale sur le poste de développement |
| Nom de domaine et DNS | Adresse du site, authentification des emails (SPF, DKIM) | À acheter | Service | À choisir | — | — |
| Certificats TLS (HTTPS) | Chiffrement des échanges | 🎯 Pressenti (fournis par l'hébergeur) | — | — | — | — |
| Sauvegardes | Copie quotidienne des données | 🎯 Pressenti | — | — | UE | — |

Note (06/10/2026) : IONOS (société allemande, centres de données UE, UK et US) a été examiné. L'hébergement web mutualisé n'offre pas de choix de localisation et ne convient pas à Node/Next/PostgreSQL ; seuls leurs VPS/Cloud le permettent. Non retenu à ce stade, non comparé en détail.

### 2.2 Données

| Composant | Rôle | Statut | Licence / type | Éditeur (pays) | Localisation des données | Contrat simulé |
|---|---|---|---|---|---|---|
| PostgreSQL | Base de données relationnelle | 🎯 Pressenti | PostgreSQL License (libre) | Communauté PostgreSQL | UE | P3 : stockage en mémoire |
| Supabase (base, droits d'accès en base, stockage de fichiers) | Socle de données et de sécurité | 🎯 Pressenti (service géré ou auto-hébergé, à décider) | Apache 2.0 | Supabase (États-Unis) ; auto-hébergement possible | Région UE, ou chez l'hébergeur français | P3, P4, P9 |
| Journal des actions sensibles | Traçabilité (consentement, AI Act) | 🎯 Pressenti (table PostgreSQL) | — | — | UE | P10 : en mémoire |

⚠️ **Point à suivre :** Supabase est une société américaine. Si l'on utilise son service géré, même avec une région européenne, il faudra analyser le **transfert de données hors UE** au sens du RGPD. L'auto-hébergement chez un hébergeur français évite ce point, en échange de plus d'exploitation. À trancher avec le référent technique.

### 2.3 Application

| Composant | Rôle | Statut | Licence | Éditeur (pays) | Remarque |
|---|---|---|---|---|---|
| Node.js | Moteur d'exécution JavaScript côté serveur | ✅ Validé le 06/10/2026 : **24.21.0** (ligne 24 LTS ; `.nvmrc` : `24.21.0`, `engines.node` : `>=24 <25`) | MIT | OpenJS Foundation | Fin de support : 30/04/2028 (fin de la LTS de Node.js 24). Prochaine revue : 06/11/2026 |
| TypeScript | Langage (JavaScript typé) | ✅ Validé le 06/10/2026 : **7.0.2** (version exacte figée) | Apache 2.0 | Microsoft (open source) | Le typage rend les contrats P1 à P11 explicites. Mode strict (`tsconfig.json`). Version 7 : compilateur natif réécrit en Go, qui n'expose plus l'API programmatique classique (entrée principale du paquet : `lib/version.cjs` ; API sous `typescript/unstable/*`). Compatibilité avec Next.js 16.4.2 observée le 21/10/2026 sur le poste du porteur de projet (Windows, pas encore en CI) : `next build` réussit (« Running TypeScript … Finished TypeScript in 1077ms », code de sortie 0) en appelant le `tsc` du projet grâce à `experimental.useTypeScriptCli` (valeur par défaut de Next 16.4.2, écrite explicitement dans `next.config.ts`) ; `ignoreBuildErrors` n'est pas utilisé. Au premier build, Next a réécrit `tsconfig.json` sans modifier les options existantes. Gardés : `esModuleInterop` et `resolveJsonModule` (obligatoires pour Next), `plugins` (`next`), `exclude` (`node_modules`) et, dans `include`, `.next/types/**/*.ts` et `.next/dev/types/**/*.ts`. Refusés et écrits explicitement : `allowJs: false` (un `.js` de `src/` échapperait aux tests d'architecture, qui ne lisent que `.ts` et `.tsx`) et `incremental: false` ; Next ne les a pas réécrits lors de deux builds successifs. En local, `npm test` vérifie aussi les types générés par Next si un build existe ; en CI, ils sont vérifiés à l'étape build ; un dossier `.next` périmé peut donner une erreur locale : le supprimer. Repli possible si une version de Next cassait cette compatibilité : 6.0.3. Fin de support : politique de support non vérifiée à ce jour. Prochaine revue : 06/11/2026 |
| Next.js | Framework web (pages et serveur) | ✅ Validé le 21/10/2026 pour le développement local : **16.4.2** (version exacte figée, publiée le 15/10/2026 ; US-02c, PR 1). Retenu le 20/10/2026 ; avis juridique obligatoire avant tout déploiement | MIT | Vercel (États-Unis), open source | Utilisable sans l'hébergement Vercel. Exige Node.js >= 20.9.0. Dépendances directes (MIT sauf mention) : `@next/env` 16.4.2, `postcss` 8.5.23, `styled-jsx` 5.1.6, `client-only` 0.0.1, `@swc/helpers` 0.5.23 (Apache-2.0), `tslib` 2.8.1 (0BSD), `baseline-browser-mapping` 2.11.30 (Apache-2.0), `caniuse-lite` 1.0.30001817 (**licence de données CC-BY-4.0, compatibilité avec l'AGPL non établie, à soumettre à l'avis juridique avant déploiement**). Dépendances facultatives : compilateur SWC et `sharp`, lignes suivantes. **Télémétrie** : Next envoie par défaut des statistiques anonymes à Vercel ; désactivée sur le poste du porteur de projet (`npx next telemetry disable`, réglage hors dépôt) et en CI (`NEXT_TELEMETRY_DISABLED=1`). `next dev` et `next start` écoutent seulement sur `127.0.0.1` (scripts de `package.json`) : la connexion de démonstration n'est pas exposée au réseau local. Configuration : `next.config.ts` (`experimental.useTypeScriptCli`, voir TypeScript). **Deux comportements de Next désactivés** : `agentRules: false` (sinon `next dev` crée et recrée à chaque démarrage un fichier `AGENTS.md` de consignes pour les agents de code ; les règles des agents sont celles de `CLAUDE.md`) et `experimental.agentUpgrade: false` (valeur par défaut `"security"` : `next build` et `next dev` interrogent le registre npm sur les failles connues, y compris en CI, et peuvent arrêter la commande pour pousser une mise à jour ; la veille de sécurité passe par `npm audit`, workflow `.github/workflows/audit.yml`). Prochaine revue : 06/11/2026 |
| Compilateur SWC de Next.js (`@next/swc-<plateforme>`) | Binaire natif qui compile le TypeScript et le JSX pour Next | ✅ Validé le 21/10/2026 (dépendance facultative de Next) : **16.4.2** | MIT | Vercel | Un binaire par plateforme dans le fichier de verrouillage ; un seul est installé : `@next/swc-win32-x64-msvc` sur le poste du porteur de projet, `@next/swc-linux-x64-gnu` attendu en CI |
| `sharp` et libvips (`@img/sharp-<plateforme>`, `@img/sharp-libvips-<plateforme>`) | Traitement d'images de Next (optimisation des images) ; non utilisé par le projet à ce jour | ✅ Validé le 21/10/2026 (dépendance facultative de Next, installée d'office) : `sharp` **0.35.5**, `@img/sharp-*` 0.35.5, `@img/sharp-libvips-*` **1.3.4**, avec `@img/colour` 1.1.0 (MIT), `semver` 7.8.5 (ISC) et `@emnapi/runtime` 1.11.3 (MIT, pour la variante WebAssembly seulement) | `sharp` et `@img/sharp-<plateforme>` : Apache-2.0. **`@img/sharp-libvips-<plateforme>` : LGPL-3.0-or-later**, seule licence non permissive du socle. Sous Windows, libvips est embarquée dans `@img/sharp-win32-x64`, déclaré « Apache-2.0 AND LGPL-3.0-or-later » | Lovell Fuller (sharp) ; projet libvips | LGPL-3.0-or-later, réputée compatible avec l'AGPL-3.0, non vérifiée sur les textes à ce jour ; à confirmer par avis juridique avant déploiement, notamment sur les obligations en cas de redistribution du binaire. Installé sur le poste du porteur de projet : `sharp`, `@img/sharp-win32-x64` (libvips incluse), `@img/colour`, `semver` ; en CI sous Linux, attendu : `@img/sharp-linux-x64` et `@img/sharp-libvips-linux-x64`. Aucun script d'installation (`hasInstallScript` absent) |
| React et React DOM | Bibliothèque d'interface utilisée par Next | ✅ Validé le 21/10/2026 : `react` et `react-dom` **19.3.1** (versions exactes figées, publiées le 14/10/2026), avec `scheduler` 0.28.0 (MIT) | MIT | Meta (États-Unis), open source | Next 16.4.2 accepte React `^18.2.0 \|\| ^19.0.0` ; `react-dom` 19.3.1 exige `react ^19.3.1`. Prochaine revue : 06/11/2026 |
| Types TypeScript (`@types/react` 19.3.0, `@types/react-dom` 19.3.0, `@types/node` 24.19.2) | Déclarations de types, développement seulement | ✅ Validé le 21/10/2026 (versions exactes figées ; `@types/react` et `@types/react-dom` publiés le 09/09/2026, `@types/node` le 09/10/2026), avec `csstype` 3.2.3 et `undici-types` 7.24.6 (MIT) | MIT | DefinitelyTyped (communauté) | `@types/node` suit la ligne 24 de Node.js. Effet de bord connu : les types globaux de Node (`process`…) et du navigateur (bibliothèques `dom` du `tsconfig.json`) sont visibles par `tsc` dans `src/domain/` ; le rempart reste les tests d'architecture |
| Code du projet | Application | **Dépôt créé le 06/10/2026** (`MESHED-SAS/freelancesourcing`, LICENSE, README et dossier `docs/` en place ; dossiers `src/domain/`, `src/use-cases/` et `src/adapters/` créés le 06/10/2026, US-00 incrément 1) | **AGPL-3.0** | Projet | Décision prise |
| Horloge simulée (`SimulatedClock`, `src/adapters/clock/simulated-clock.ts`) | Adaptateur simulé du contrat P1 : instant de départ réglable, avance de N jours calendaires en conservant l'heure locale de Paris | 🧪 Simulé : créé le 12/10/2026 (US-01, incrément 1) | AGPL-3.0 (code du projet) | Projet | Utilisée par les tests. Choisie par `createClock` (`src/composition/create-clock.ts`) avec `adapterClock` « simulated » et un instant de départ (US-01, incrément 3), en development et staging uniquement (refusée en production : architecture-cible-et-mocks.md, §2.2) ; la lecture de `ADAPTER_CLOCK` sera faite par `loadConfig` (US-02c, pas encore écrit) |
| Horloge système (`SystemClock`, `src/adapters/clock/system-clock.ts`) | Adaptateur réel du contrat P1 : lit l'heure du système (`Date.now()`) | Créée le 12/10/2026 (US-01, incrément 1) ; choisie par défaut par `createClock` (US-01, incrément 3), permise dans tous les environnements ; la lecture de l'environnement sera faite par `loadConfig` (US-02c, pas encore écrit) | AGPL-3.0 (code du projet) | Projet | Seul endroit de `src/` qui lit l'heure du système. Mêmes tests de contrat que l'horloge simulée. Bascule suivie en section 3 |
| Fournisseur d'authentification simulé (`PersonaAuthProvider`, `src/adapters/auth/persona-auth-provider.ts` ; données : `src/adapters/auth/personas.ts`) | Adaptateur simulé du contrat P2 : identifie l'un des six personas fictifs à partir de son jeton de session (égalité exacte ; jeton inconnu : `null`) | 🧪 Simulé : créé le 13/10/2026 (US-02a, PR 3/3) | AGPL-3.0 (code du projet) | Projet | Adresses fictives en domaines réservés ; jetons devinables, donc jamais choisi par défaut : `createAuthProvider` (`src/composition/create-auth-provider.ts`) exige le choix explicite « personas ». Refusé hors development et staging (architecture-cible-et-mocks.md, §2.2). La lecture de `ADAPTER_AUTH` sera faite par `loadConfig` (US-02c, pas encore écrit). Tests de contrat communs (`tests/adapters/auth-provider-contract.ts`), à rejouer sur l'adaptateur réel. Bascule suivie en section 3 |
| Journal d'audit simulé (`InMemoryAuditLog`, `src/adapters/audit/in-memory-audit-log.ts`) | Adaptateur simulé du contrat P10 (port minimal : ajouter et lister) : journal en ajout seul, entrées copiées et gelées à l'ajout, liste renvoyée gelée et distincte du stockage interne, ordre d'insertion conservé, aucun stockage partagé entre instances | 🧪 Simulé : créé le 20/10/2026 (US-02b, PR 1/2) | AGPL-3.0 (code du projet) | Projet | Perdu à l'arrêt du processus, donc jamais choisi par défaut : `createAuditLog` (`src/composition/create-audit-log.ts`) exige le choix explicite « in-memory ». Refusé hors development et staging (architecture-cible-et-mocks.md, §2.2). La lecture de `ADAPTER_AUDIT_LOG` sera faite par `loadConfig` (US-02c, pas encore écrit). Tests de contrat communs (`tests/adapters/audit-log-contract.ts`), à rejouer sur l'adaptateur réel. Bascule prévue en même temps que P3 (architecture-cible-et-mocks.md, P10) ; non reprise en section 3 à ce jour |
| Liste des domaines jetables (`DISPOSABLE_DOMAINS`, `src/composition/disposable-domains.ts`) | Donnée fournie au cas d'usage `authenticateSession` pour refuser les adresses jetables (US-02, critère 4) | Créée le 13/10/2026 (US-02a, PR 3/3) ; liste de démonstration | AGPL-3.0 (code du projet) | Projet | Deux domaines réels (`yopmail.com`, `mailinator.com`), seules exceptions aux domaines réservés. Fournie au cas d'usage en paramètre : la liste se change sans toucher aux règles métier. |
| Garde des composants simulés (`isMockAllowed`, type `AppEnvironment`, `src/composition/environment.ts`) | Refuse les composants simulés hors development et staging (liste blanche) | Créée le 19/10/2026 (garde production par défaut, commit 1/3 ; utilisée depuis le commit 2/3 du 19/10/2026) | AGPL-3.0 (code du projet) | Projet | Utilisée par `createClock`, `createAuthProvider` et `createAuditLog`. Règle : architecture-cible-et-mocks.md, §2.2. Aucune dépendance ajoutée |
| Fuseau Europe/Paris (API `Intl` du moteur JavaScript) | Conversion d'un instant en jour et heure locale de Paris (`src/domain/time/paris-time-zone.ts`) | Utilisé depuis le 12/10/2026 (US-01, incrément 1) | Intégré à Node.js (norme ECMA-402) ; aucune dépendance npm. Licence des données ICU non vérifiée à ce jour | Données ICU embarquées dans Node.js | Relevé le 12/10/2026 sur Node.js 24.21.0 (poste local, sous Windows ; pas en CI) : ICU 78.3, base de fuseaux tz 2026c (`process.versions.icu` et `process.versions.tz`). Les résultats aux changements d'heure dépendent de la version de Node.js : `.nvmrc` fige `24.21.0`, `engines.node` limite à la ligne 24 (`>=24 <25`) |

### 2.4 Services externes

| Service | Rôle | Statut | Contrat simulé | Données transmises | Pays |
|---|---|---|---|---|---|
| LinkedIn (connexion) | Connexion des freelances | 🧪 Simulé | P2 : personas fictifs | Nom, email, photo | États-Unis ⚠️ |
| Google (connexion) | Connexion des freelances et recruteurs | 🧪 Simulé | P2 | Nom, email | États-Unis ⚠️ |
| Microsoft (connexion) | Connexion des recruteurs | 🧪 Simulé | P2 | Nom, email | États-Unis ⚠️ |
| API Sirene / Recherche d'entreprises | Vérification des entreprises et des dirigeants | 🧪 Simulé | P6 : SIREN fictifs | Numéro SIREN uniquement | France (service public) |
| Service d'emails transactionnels | Relances, notifications, mises en relation | 🧪 Simulé (fournisseur à choisir, européen) | P5 : boîte de test | Emails, contenus des notifications | UE (exigé) |
| Calendrier des jours fériés | Calcul des jours ouvrés | 🧪 Simulé | P1 : liste intégrée | Aucune | — |
| Fournisseur d'IA (analyse de CV, Should) | Préremplissage du profil | 🧪 Simulé | P11 : réponse fixe | Contenu du CV ⚠️ | À choisir |

⚠️ **Les connexions LinkedIn, Google et Microsoft impliquent des acteurs américains.** Seules des données d'identification minimales transitent, mais le point doit figurer dans le registre des traitements.

### 2.5 Outillage de développement et de livraison

| Outil | Rôle | Statut | Licence / type | Remarque |
|---|---|---|---|---|
| Git et **GitHub** (dépôt public principal) | Gestion du code source, revue par pull request, publication AGPL, intégration Claude Code (GitHub Actions) | ✅ Validé le 24/09/2026 ; dépôt principal `MESHED-SAS/freelancesourcing` créé le 06/10/2026 | Git : GPL-2.0 ; GitHub : service (Microsoft, États-Unis) | Choisi pour la visibilité auprès des bénévoles et l'intégration officielle avec Claude Code. La branche `main` est protégée : toute modification passe par une pull request. Mode de fusion (merge, squash ou rebase) à décider pour les PR de Claude Code |
| Intégration continue (par exemple GitHub Actions) | Tests automatiques, génération de la SBOM, analyse de sécurité des dépendances | ✅ Validé le 08/10/2026 (tests et SBOM) : GitHub Actions, workflow `.github/workflows/ci.yml` (sur `pull_request` et sur `push` vers `main`, runner `ubuntu-24.04` : `npm ci --ignore-scripts`, génération et publication de la SBOM, puis `npm test`, puis, depuis le 21/10/2026, `npm run build` de Next.js avec `NEXT_TELEMETRY_DISABLED=1`). La SBOM est produite avant les tests, donc même si les tests échouent. Contrôle des dépendances : à traiter dans une pull request séparée ultérieure | Service | Chaque livraison doit produire sa SBOM. **Utiliser des étapes standard** (tests, SBOM, contrôle des dépendances), faciles à réécrire sur Forgejo ou Woodpecker (Codeberg) en cas de déménagement. Fixer une version explicite du runner (`ubuntu-24.04`) pour l'intégration continue ; `ubuntu-latest` passe à Ubuntu 26 à partir du 19/10/2026. Les workflows du miroir GitLab (depuis le 06/10/2026) et de l'intégration continue (depuis le 08/10/2026) sont figés sur `ubuntu-24.04` et ne sont donc pas concernés par ce changement |
| Action `actions/checkout` (workflows du miroir et de l'intégration continue) | Récupérer le dépôt dans GitHub Actions | ✅ Validé le 26/09/2026 : **v7.0.1, figée sur l'empreinte** `3d3c42e5aac5ba805825da76410c181273ba90b1` (Node.js 24). Historique : v4.4.0 (`11d5960a…`), retirée le 26/09/2026 car elle ciblait Node.js 20, obsolète. Utilisée à l'identique dans le workflow du miroir GitLab des deux dépôts et, depuis le 08/10/2026, dans le workflow d'intégration continue (avec `persist-credentials: false`) | MIT (GitHub) | Relever l'empreinte depuis la page *Releases* ou par `git ls-remote --tags`. Prochaine revue : à la sortie d'une v7.x corrective ou d'une nouvelle version majeure |
| Action `actions/setup-node` (workflow d'intégration continue) | Installer dans GitHub Actions la version de Node.js indiquée dans `.nvmrc` | ✅ Validé le 08/10/2026 : **v7.0.0, figée sur l'empreinte** `820762786026740c76f36085b0efc47a31fe5020`. Utilisée sans cache (`package-manager-cache: false`, pas de paramètre `cache`) | MIT (GitHub) | Empreinte relevée par le porteur de projet sur la page *Releases* et par `git ls-remote --tags`. La v7.1.0 (`949feb2413d6458794dcd2491c4babbbce0c15c1`) est sortie le 08/10/2026 ; elle reste à évaluer à la prochaine revue. Prochaine revue : 06/11/2026 |
| Action `actions/upload-artifact` (workflow d'intégration continue) | Publier la SBOM comme artefact de chaque exécution | ✅ Validé le 08/10/2026 : **v7.0.1, figée sur l'empreinte** `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` (moteur `node24` vérifié). Paramètres : nom `sbom-cyclonedx`, `if-no-files-found: error`, `retention-days: 90` | MIT (GitHub) | Empreinte relevée par le porteur de projet sur la page *Releases* et par `git ls-remote --tags`. La v7.0.2 (`cf430e030ddbb5b0abf93d22962f4752f3646cd9`) est sortie le 07/10/2026 ; elle reste à évaluer à la prochaine revue. Prochaine revue : 06/11/2026 |
| SBOM (nomenclature du logiciel) | Liste exhaustive des composants utilisés, avec versions et licences | ✅ Validé le 08/10/2026 : format **CycloneDX JSON**, générée par `npm sbom --sbom-format cyclonedx --sbom-type application` (npm 11.19.0 ; source : journal de l'exécution n° 1 de la CI, étape Node.js, « npm: 11.19.0 »), publiée en artefact `sbom-cyclonedx` à chaque exécution de l'intégration continue (conservation 90 jours) | Format ouvert (OWASP CycloneDX) | Fichier produit hors du dépôt, rien n'est committé. Essai local du 08/10/2026, sous Windows (pas en CI) : `specVersion` 1.5, 37 composants, licence renseignée pour chacun (MIT, Apache-2.0, MPL-2.0, ISC, BSD-3-Clause). En CI, sous Linux (exécution n° 4 de la CI sur `main`, 08/10/2026) : `npm ci` a installé 37 paquets (journal de l'étape d'installation) ; le nombre de composants du fichier de la SBOM n'a pas été recompté sur l'artefact. Servira d'entrée au contrôle des dépendances |
| npm | Gestionnaire de paquets ; fichier de verrouillage `package-lock.json` versionné | ✅ Validé le 06/10/2026 : **11.19.0** (fourni avec Node.js 24.21.0) | Artistic-2.0 | Installation uniquement depuis le registre npm officiel, versions exactes (`--save-exact`). Le fichier `.npmrc` à la racine fixe `ignore-scripts=true` : aucun script d'installation de dépendance ne s'exécute par défaut ; le drapeau `--ignore-scripts` de l'intégration continue est volontairement conservé en défense en profondeur et ne doit pas être retiré comme doublon. Seule dépendance avec script d'installation à ce jour : `fsevents` (facultatif, macOS uniquement, via Vitest et Vite ; vérifié de nouveau le 21/10/2026 après l'installation de Next.js) ; si une dépendance exige un jour son script, lancer un `npm rebuild <paquet>` explicite, nommé et validé par le porteur de projet, sans désactiver `ignore-scripts` globalement. Fin de support : livré avec Node.js ; pas de calendrier de support propre publié à ce jour. Prochaine revue : 06/11/2026 |
| Vitest | Tests unitaires ; `npm test` lance la vérification des types (`tsc --noEmit`) puis Vitest | ✅ Validé le 06/10/2026 : **5.0.3** (version exacte figée). Dépendance associée : Vite 8.3.3 (MIT), installée comme dépendance *peer* | MIT | Les exemples « Alpha Conseil » servent de cas de test. Fin de support : correctifs tant que 5.0 est la version mineure courante ; politique officielle : la version mineure courante reçoit les correctifs réguliers, la dernière mineure de la version majeure précédente les correctifs importants et de sécurité (source : https://vitest.dev/releases). Prochaine revue : 06/11/2026 |
| Tests de parcours dans un navigateur (Playwright) | Vérifier les parcours | 🎯 Pressenti (reporté à la première US avec interface) | Apache 2.0 | — |
| Analyse des dépendances vulnérables | Alerte en cas de faille connue | 🎯 Pressenti | — | Relié à la SBOM |
| lightningcss 1.33.0 et son binaire natif (`lightningcss-<plateforme>`, par exemple `lightningcss-linux-x64-gnu`) | Dépendances de Vite, installées avec Vitest | ✅ Validé le 06/10/2026 (dépendance transitive) | MPL-2.0 | Outil de développement, non distribué avec l'application. Compatible avec l'AGPL-3.0 (MPL-2.0 §3.3) |
| Claude Code | Développement assisté | 🎯 Pressenti | Service (Anthropic, États-Unis) | Aucune donnée réelle d'utilisateur ne doit lui être transmise ; il ne travaille que sur le code et des données fictives. Usage déclaré publiquement dans le README (section « Transparence sur la fabrication du code »). Travaille sur des branches ; chaque changement passe par une pull request relue par le porteur de projet |


Les composants d'exploitation (miroir, sauvegarde, archivage, protection de branche et gestion des jetons) sont suivis dans un document d'exploitation non publié.

## 3. Suivi des bascules (mock vers composant réel)

| Contrat | Composant réel | Tests de contrat passés sur le réel | Date de bascule | Décision (référence) |
|---|---|---|---|---|
| P1 Horloge | — | — | — | — |
| P2 Authentification | — | — | — | — |
| P3 Stockage | — | — | — | — |
| P4 Contrôle des accès | — | — | — | — |
| P5 Emails | — | — | — | — |
| P6 Vérification d'entreprise | — | — | — | — |
| P7 Tâches planifiées | — | — | — | — |
| P8 Détection des coordonnées | — | — | — | — |
| P9 Stockage de fichiers | — | — | — | — |
| P10 Journal | — | — | — | — |
| P11 Analyse de CV par IA | — | — | — | — |

## 4. Rituel de mise à jour

- **À chaque commit qui modifie une dépendance :** mise à jour de cet inventaire dans le même commit. La règle est inscrite dans CLAUDE.md, et la revue la vérifie.
- **À chaque livraison :** SBOM générée automatiquement et archivée.
- **Chaque mois** (15 minutes) : revue des dates de fin de support et des alertes de sécurité ; mise à jour de la colonne « date de dernière revue ».
- **À chaque bascule :** ligne complétée dans la section 3, avec la référence de la décision.
