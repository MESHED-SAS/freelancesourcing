# Documentation du projet Meshed

Ce dossier contient les documents de cadrage et les documents techniques du projet. Il est lu par les contributeurs et par Claude Code (voir `CLAUDE.md` à la racine du dépôt).

Les chemins cités dans ces documents sans préfixe `docs/` (par exemple `cadrage/grille-notation.md`) s'entendent relatifs à ce dossier.

## Cadrage (`cadrage/`)

| Document | Contenu |
|---|---|
| `principes-directeurs.md` | Les cinq principes du projet, la transparence à trois niveaux, le modèle économique par les dons, le nom, le périmètre de lancement |
| `regles-missions-candidatures.md` | Cycle de vie des missions, délais de réponse, plafonds, « dette de réponse », exemples commentés (fil rouge « Alpha Conseil ») |
| `grille-notation.md` | Qui note qui, indicateurs automatiques et critères notés, règles de calcul et d'affichage |
| `echelles-r7-r8.md` | Échelles décrites par comportements de la notation croisée après entretien (R7, R8, F11, F12) |
| `mvp-moscow.md` | Périmètre du MVP, tri MoSCoW, découpage en versions, décisions |

## Technique (`technique/`)

| Document | Contenu |
|---|---|
| `architecture-cible-et-mocks.md` | Architecture « ports et adaptateurs » : contrats P1 à P11, simulations et conditions de bascule |
| `backlog-v0.md` | Récits utilisateurs de la V0 (socle) et leurs critères d'acceptation |
| `inventaire-socle.md` | Inventaire des composants (infrastructure, données, application, services, outillage) |

## Source de référence

À partir de la publication de ce dossier, **les versions du dépôt font foi**. Toute modification de ces documents passe par une pull request, comme le code. En particulier, `technique/inventaire-socle.md` est mis à jour dans le même commit que toute modification d'une dépendance.

Certains documents de travail (veille sur les plateformes existantes, budget détaillé) ne sont pas publiés.
