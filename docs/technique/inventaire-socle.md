---
objet: Inventaire du socle technique (souches infrastructure et applicatives)
date_creation: 2026-09-24
derniere_mise_a_jour: 2026-10-06
statut: v0. Socle TypeScript validé (Node.js, TypeScript, npm, Vitest) ; autres composants pressentis ou simulés
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
2. **La liste exhaustive des bibliothèques**, générée automatiquement à chaque livraison. C'est ce qu'on appelle une **SBOM** (Software Bill of Materials, la « nomenclature » du logiciel), au format standard CycloneDX. Elle sera produite par l'outillage d'intégration continue, et non saisie à la main.

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
| TypeScript | Langage (JavaScript typé) | ✅ Validé le 06/10/2026 : **7.0.2** (version exacte figée) | Apache 2.0 | Microsoft (open source) | Le typage rend les contrats P1 à P11 explicites. Mode strict (`tsconfig.json`). Version 7 : compilateur natif réécrit en Go ; compatibilité avec Next.js à vérifier à l'incrément 4 (repli possible : 6.0.3). Fin de support : politique de support non vérifiée à ce jour. Prochaine revue : 06/11/2026 |
| Next.js | Framework web (pages et serveur) | 🎯 Pressenti | MIT | Vercel (États-Unis), open source | Utilisable sans l'hébergement Vercel |
| Code du projet | Application | **Dépôt créé le 06/10/2026** (`MESHED-SAS/freelancesourcing`, LICENSE, README et dossier `docs/` en place ; dossiers `src/domain/`, `src/use-cases/` et `src/adapters/` créés le 06/10/2026, US-00 incrément 1) | **AGPL-3.0** | Projet | Décision prise |

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
| Intégration continue (par exemple GitHub Actions) | Tests automatiques, génération de la SBOM, analyse de sécurité des dépendances | 🎯 Pressenti | Service | Chaque livraison doit produire sa SBOM. **Utiliser des étapes standard** (tests, SBOM, contrôle des dépendances), faciles à réécrire sur Forgejo ou Woodpecker (Codeberg) en cas de déménagement. Fixer une version explicite du runner (`ubuntu-24.04`) pour l'intégration continue ; `ubuntu-latest` passe à Ubuntu 26 à partir du 19/10/2026. Le workflow du miroir GitLab est figé sur `ubuntu-24.04` depuis le 06/10/2026 et n'est donc pas concerné par ce changement |
| Action `actions/checkout` (workflows de miroir GitHub Actions) | Récupérer le dépôt dans GitHub Actions | ✅ Validé le 26/09/2026 : **v7.0.1, figée sur l'empreinte** `3d3c42e5aac5ba805825da76410c181273ba90b1` (Node.js 24). Historique : v4.4.0 (`11d5960a…`), retirée le 26/09/2026 car elle ciblait Node.js 20, obsolète. Utilisée à l'identique dans le workflow du miroir GitLab des deux dépôts | MIT (GitHub) | Relever l'empreinte depuis la page *Releases* ou par `git ls-remote --tags`. Prochaine revue : à la sortie d'une v7.x corrective ou d'une nouvelle version majeure |
| npm | Gestionnaire de paquets ; fichier de verrouillage `package-lock.json` versionné | ✅ Validé le 06/10/2026 : **11.19.0** (fourni avec Node.js 24.21.0) | Artistic-2.0 | Installation uniquement depuis le registre npm officiel, versions exactes (`--save-exact`). Fin de support : livré avec Node.js ; pas de calendrier de support propre publié à ce jour. Prochaine revue : 06/11/2026 |
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
