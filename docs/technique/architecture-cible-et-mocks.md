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

Le code est rangé en quatre couches, chacune dans son dossier :

| Dossier | Couche | Contenu | Peut dépendre de |
|---|---|---|---|
| `src/domain/` | Domaine | Règles métier (échéances en jours ouvrés, consentement, notation…) et contrats P1 à P11 | Rien d'autre que lui-même |
| `src/use-cases/` | Cas d'usage | Orchestration des règles et des contrats pour une action de l'utilisateur, par exemple « postuler à une mission » : vérifier le consentement, enregistrer, journaliser | `src/domain/` uniquement |
| `src/adapters/` | Adaptateurs | Implémentations simulées, puis réelles, des contrats ; le choix se fait par variables d'environnement | `src/domain/` et la bibliothèque du service concerné |
| `src/app/` | Interface web | **Réservé** : ce dossier n'est créé que si Next.js est retenu | `src/use-cases/` uniquement |

**Deux règles de dépendance :**

1. **Les cas d'usage dépendent uniquement du domaine.** Ils manipulent les contrats, jamais un adaptateur précis.
2. **L'interface n'appelle que les cas d'usage.** Elle n'appelle jamais directement le domaine ni un adaptateur ; les contrôles d'accès restent ainsi côté serveur, dans les cas d'usage.

L'assemblage des adaptateurs selon la configuration (la « racine de composition » : lire les variables d'environnement, choisir le mock ou le réel pour chaque contrat, et les fournir aux cas d'usage) se fait en **un point d'entrée unique**. Son emplacement sera décidé à l'US-01.

Pourquoi `use-cases` et non `application` : dans Next.js, le dossier `app/` désigne le routeur de l'interface web. Le nom `use-cases` évite de confondre les deux.

## 3. Les contrats et leurs simulations

| # | Contrat (besoin métier) | Simulation au démarrage | Cible pressentie | Condition de bascule | Fonctions du MVP concernées |
|---|---|---|---|---|---|
| P1 | **Horloge** : quelle est la date et l'heure ? Quels sont les jours ouvrés ? | **Horloge simulée** que l'on peut avancer à volonté (« avancer de 15 jours ouvrés »), avec un calendrier des jours fériés français | Horloge système et calendrier des jours fériés (liste officielle ou bibliothèque) | Dès la mise en production | E3.4, E4.4, E4.5, règles R1 à R3 |
| P2 | **Authentification** : qui est connecté, et avec quel rôle ? | Écran de connexion fictif : choisir parmi des personas (« Sophie, freelance MOE », « Alpha Conseil, recruteur ») | Supabase Auth avec LinkedIn, Google et Microsoft | Applications de connexion créées chez LinkedIn, Google et Microsoft | E1.1 |
| P3 | **Stockage des données** : missions, profils, candidatures, notes, consentements | Stockage en mémoire, avec un jeu de données de démonstration | PostgreSQL (Supabase), avec des **règles d'accès dans la base** (Row Level Security) | Choix de la région d'hébergement européenne | Toutes |
| P4 | **Contrôle des accès (consentement)** : ce recruteur peut-il voir ce profil ? | **Règles écrites et testées dans le code métier** | Les mêmes règles **dupliquées dans la base** (Row Level Security), en double protection | En même temps que P3 | E2.1, E2.2, E2.5, E2.7 |
| P5 | **Envoi d'emails** : relances, notifications, mises en relation | **Boîte de réception de test** consultable dans l'application ; aucun email réel n'est envoyé | Service d'emails européen (à choisir) | Choix du fournisseur et du nom de domaine | E10.2, E6.1 |
| P6 | **Vérification d'entreprise** : ce SIREN existe-t-il, qui en est le dirigeant ? | Jeu de SIREN fictifs (valide, fermé, dirigeant différent) | API publique Sirene et « Recherche d'entreprises » | Dès le pilote | E1.4, E1.10 |
| P7 | **Tâches planifiées** : vérifier chaque jour les délais (confirmation à 10 jours ouvrés, réponse sous 10 jours ouvrés…) | Déclenchement manuel ou par l'horloge simulée | Tâche planifiée de l'hébergeur ou de Supabase | Choix de l'hébergeur | E3.4, E4.4, E4.5 |
| P8 | **Détection des coordonnées** dans les textes libres | Règles de détection (téléphone, email, URL) | Mêmes règles, éventuellement complétées par une IA | Si le pilote montre des oublis | E2.7 |
| P9 | **Stockage de fichiers** : CV original transmis après la mise en relation | Dossier local | Stockage de fichiers dans l'UE (Supabase Storage ou celui de l'hébergeur) | Choix de l'hébergeur | E2.7, E6.1 |
| P10 | **Journal des actions sensibles** : consultations de profil, révélation de coordonnées, modération | Table en mémoire, consultable | Table en base, non modifiable, avec durée de conservation | En même temps que P3 | E2.5, E11.3 |
| P11 | **Analyse de CV par IA** (Should) | Réponse fixe : un profil prérempli type | Modèle d'IA (fournisseur à choisir, hébergement des données à vérifier) | Après le pilote, décision spécifique | E1.6 |

**La plus importante de ces simulations est P1, l'horloge.** Elle permet de tester en quelques secondes des scénarios qui durent des semaines, comme les exemples « Alpha Conseil » (publication le 1er octobre, pause le 5 novembre, clôture le 13 novembre). Sans elle, les règles strictes seraient presque impossibles à vérifier.

## 4. Règles pour Claude Code (à reprendre dans CLAUDE.md)

1. **Aucun appel direct à un service externe depuis le code métier.** Toujours passer par un contrat P1 à P11.
2. Tout nouveau contrat, ou tout nouvel adaptateur, doit être **ajouté à l'inventaire** et à ce tableau.
3. Chaque contrat a une **suite de tests de contrat**, exécutée sur le mock aujourd'hui et sur le composant réel au moment de la bascule.
4. Le choix de l'adaptateur (mock ou réel) se fait **par configuration**, jamais en modifiant le code.
5. **Aucune donnée réelle dans les mocks** : personas et SIREN fictifs uniquement.
6. **Respecter les règles de dépendance entre couches** (section 2.1). Leur respect sera vérifié par un test d'architecture, prévu avec l'US-01 ; ce test n'existe pas encore.

## 5. Ce qui reste à décider (composant par composant)

| Composant | Décision attendue | Quand |
|---|---|---|
| Hébergeur de l'application | Scaleway, OVHcloud ou Clever Cloud | Avant le pilote |
| Région Supabase, ou PostgreSQL hébergé en propre | Région européenne ; Supabase géré par l'éditeur ou installé chez l'hébergeur français | Avant le pilote |
| Service d'emails | Fournisseur européen | Avant le pilote |
| Fournisseur d'IA pour l'analyse de CV | Selon la localisation des données et le coût | Après le pilote |
