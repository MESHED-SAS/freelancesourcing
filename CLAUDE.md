# CLAUDE.md : règles du projet pour Claude Code

> Ce fichier est lu par Claude Code au début de chaque session. Il prime sur toute habitude par défaut.
> Documentation technique : dossier `docs/` (architecture, inventaire). Documents de cadrage et backlog : dossier privé `../meshed-docs/` (non publié, cloné à côté de ce dépôt). S'il est absent, le signaler et poser la question : ne rien inventer.

## 1. Le projet en bref

Plateforme **gratuite et transparente** de mise en relation entre **chefs de projet SI freelances (MOA et MOE)** et **recruteurs, ESN et cabinets**.

**Principes non négociables.** En cas de doute, ils priment sur toute autre considération.

1. **Consentement.** Aucune donnée personnelle d'un freelance n'est visible par un recruteur sans une action explicite du freelance. Le profil est invisible tant que le freelance n'a pas postulé. Nom complet, téléphone, email et CV original ne sont révélés qu'après la **double acceptation** d'une mise en relation.
2. **Missions vraies.** Les missions ont un cycle de vie strict : confirmation tous les 10 jours ouvrés, pause à 15 jours ouvrés, clôture à 20 jours ouvrés, 40 jours ouvrés au maximum, issue obligatoire à la clôture.
   **Toutes les échéances sont en jours ouvrés** (lundi à vendredi, hors jours fériés nationaux), calculées uniquement via le contrat P1 `Clock`. L'interface affiche la date exacte de l'échéance.
3. **Transparence.** Les règles, les formules et les indicateurs sont publics. Aucune logique cachée. **Pas d'IA décisionnelle dans le MVP** : le score de compatibilité est calculé par des règles fixes et explicables.
4. **Notation actionnable.** Critères observables, échelle de 1 à 4 décrite par des comportements, double aveugle.
5. **Code sous licence AGPL-3.0.** Toute dépendance doit être compatible avec l'AGPL.

## 2. Architecture : ports et adaptateurs (obligatoire)

- Le **code métier** (dossier `domain/`) ne dépend d'**aucun** framework ni service externe.
- **Tout accès à l'extérieur passe par un contrat (port)** défini dans le domaine, avec au moins deux adaptateurs : un **simulé** (mock) et, plus tard, un **réel**.
- Le choix de l'adaptateur se fait **par configuration** (variables d'environnement), jamais en modifiant le code.

| Contrat | Rôle | Adaptateur actuel |
|---|---|---|
| P1 `Clock` | Date et heure, jours ouvrés (jours fériés français) | Horloge simulée qu'on peut avancer |
| P2 `AuthProvider` | Identité et rôle de l'utilisateur connecté | Personas fictifs |
| P3 `Repositories` | Persistance | En mémoire |
| P4 `AccessPolicy` | Qui peut voir quoi (consentement) | Règles dans le domaine |
| P5 `EmailSender` | Envoi d'emails | Boîte de réception de test |
| P6 `CompanyRegistry` | Vérification SIREN et dirigeant | SIREN fictifs |
| P7 `Scheduler` | Tâches planifiées | Déclenchement manuel ou par l'horloge simulée |
| P8 `ContactDetector` | Détection des coordonnées dans les textes libres | Expressions régulières |
| P9 `FileStorage` | Fichiers (CV original) | Dossier local |
| P10 `AuditLog` | Journal des actions sensibles | En mémoire |
| P11 `CvParser` | Analyse de CV par IA (Should) | Réponse fixe |

**Interdit :** appeler `Date.now()` ou `new Date()` en dehors de l'adaptateur de P1 ; importer un SDK externe dans `domain/`.

**Cible pressentie** (non encore branchée) : Supabase et PostgreSQL (avec Row Level Security), Next.js, hébergeur français, service d'emails européen. Voir `docs/technique/architecture-cible-et-mocks.md`.

## 3. Données

- **Uniquement des données fictives**, dans le code, les tests et les jeux de démonstration. Aucune donnée réelle d'utilisateur ne doit jamais être collée dans une session ni placée dans un fichier.
- Personas de référence : **Sophie** (freelance MOE, 10 ans d'expérience), **Karim** (freelance, 5 ans), **Julie** (freelance MOA), **Marc** (freelance MOE) ; **Alpha Conseil** (cabinet, recruteur fictif) ; un administrateur.
- Les SIREN de test sont fictifs et documentés dans les données de démonstration.

## 4. Tests (définition de « terminé »)

Un récit utilisateur est **terminé** seulement si :

1. **chaque critère d'acceptation** a au moins un test automatisé ;
2. les **règles de gestion** sont testées avec l'**horloge simulée**. Les exemples « Alpha Conseil » de `../meshed-docs/cadrage/regles-missions-candidatures.md` sont des cas de test obligatoires dès que la fonction concernée existe ;
3. **les règles de consentement ont des tests négatifs** : on vérifie qu'un recruteur **ne peut pas** voir ce qu'il ne doit pas voir ;
4. l'ensemble des tests passe ;
5. l'inventaire (`docs/technique/inventaire-socle.md`) est à jour si une dépendance a changé.

## 5. Dépendances et inventaire

- **Avant d'ajouter une dépendance :** justifier le besoin, vérifier la licence (compatible AGPL), préférer une bibliothèque répandue et maintenue, et **demander validation**.
- **Tout ajout, toute suppression ou toute montée de version** met à jour `docs/technique/inventaire-socle.md` **dans le même commit**.
- Figer les versions (fichier de verrouillage des dépendances versionné).

## 6. Sécurité

- Aucun secret dans le code ni dans le dépôt : variables d'environnement, avec un fichier `.env.example` sans valeur réelle.
- Toute action sensible (consultation de profil, révélation de coordonnées, modération) est enregistrée via `AuditLog`.
- Les contrôles d'accès se font **côté serveur**, jamais seulement dans l'interface.

## 7. Façon de travailler

- **Un récit utilisateur à la fois**, en petits incréments. Proposer un plan court avant de coder, puis attendre la validation.
- **Une branche et une pull request par incrément.** Claude Code ne travaille jamais directement sur `main` (voir la section 8).
- **Claude Code ne fusionne jamais une pull request.** Le porteur de projet relit le diff, puis fusionne lui-même. Le mode de fusion (merge, squash ou rebase) est son choix.
- Si une règle de gestion est ambiguë ou manque : **poser la question**, ne pas inventer. Signaler toute contradiction avec les documents de référence (`docs/` et `../meshed-docs/`).
- Langue : **documentation et interface en français**. Code (noms de variables et de fonctions) en anglais, avec le glossaire de la section 9.
- Messages de commit clairs, en français, qui citent le récit concerné (par exemple `US-05 : ...`). Conserver l'attribution automatique de Claude Code dans les commits : elle fait partie de la transparence du projet.

## 8. Git, GitHub et miroir

Le dépôt de référence est `MESHED-SAS/freelancesourcing` sur GitHub. Il est recopié automatiquement vers GitLab.com, sauvegardé chaque jour sous forme de bundles, et archivé sur Software Heritage. Ces protections ne doivent jamais être affaiblies.

**Branches et pull requests**

- `main` est protégée : pas de push direct, pas de suppression, pas de réécriture d'historique. Tout changement passe par une pull request.
- Une branche par incrément, au nom court et explicite (par exemple `us-01-horloge-jours-ouvres`).
- Le titre de la pull request cite le récit (`US-01 : ...`). La description indique : ce qui change, les critères d'acceptation couverts, les tests ajoutés, si l'inventaire a été mis à jour, et les points que le relecteur doit examiner en priorité.
- Petites pull requests : un changement qui ne se relit pas en quelques minutes est trop gros et doit être découpé.

**Interdits formels** (sauf demande explicite et écrite du porteur de projet)

- `git push --force`, `git push --mirror`, `git push --delete` sur `main` ou sur une étiquette, et toute réécriture de l'historique déjà publié.
- Modifier ou supprimer `.github/workflows/mirror-gitlab.yml`, les règles de protection de `main` ou les secrets du dépôt.
- Lire, afficher, écrire ou committer un jeton, une clé SSH ou toute valeur de secret.

**GitHub Actions** (intégration continue et workflows)

- Figer chaque action sur l'**empreinte complète de sa version officielle**, relevée sur la page *Releases* de l'action ou par `git ls-remote --tags`, jamais sur une liste de commits ni de pull requests. L'empreinte est suivie d'un commentaire indiquant la version.
- Déclarer des permissions minimales (`permissions: contents: read` par défaut) et une version explicite du système d'exécution (`ubuntu-24.04`).
- Utiliser des **étapes standard** (tests, SBOM, contrôle des dépendances), pour qu'elles restent transposables sur une autre forge.

**Tout ce qui entre dans l'historique est public et définitif.** Le dépôt est public, copié sur GitLab et archivé sur Software Heritage, et `main` ne peut pas être réécrite. Un secret ou une donnée réelle committés ne peuvent donc pas être effacés : il faut les révoquer. D'où la règle de la section 3 (données fictives uniquement) et de la section 6 (aucun secret dans le dépôt).

**Fins de ligne :** les fichiers sont en LF.

## 9. Glossaire (métier en français, code en anglais)

| Métier | Code |
|---|---|
| Freelance | `Freelancer` |
| Recruteur / organisation (cabinet, ESN) | `Recruiter` / `Organization` |
| Mission | `Mission` |
| Candidature | `Application` |
| Mise en relation | `Introduction` |
| Consentement | `Consent` |
| Dette de réponse | `ResponseDebt` |
| Issue de mission | `MissionOutcome` |
| Évaluation / critère | `Rating` / `Criterion` |
| Jours ouvrés | `BusinessDays` |
