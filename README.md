# Agent Node API Playground

Une mini API Node.js volontairement imparfaite, conçue pour tester un agent de code sur de vraies petites issues GitHub.

Le projet utilise uniquement les modules natifs de Node.js : aucun `npm install` n'est nécessaire.

## Versions Node.js supportées

- Minimum : Node.js 22, encore maintenu en LTS.
- Recommandé en local et en production : Node.js 24 LTS.
- La CI teste également Node.js 26 Current pour détecter les incompatibilités à venir.

Avec NVM, le fichier `.nvmrc` sélectionne automatiquement Node.js 24 :

```bash
nvm use
```

## Démarrage

```bash
npm start
```

L'API écoute par défaut sur `http://localhost:3000`. La variable d'environnement `PORT` permet de changer le port.

## Endpoints disponibles

| Méthode | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Vérifie que le service répond |
| `GET` | `/todos` | Liste les tâches |
| `GET` | `/todos?completed=true` | Filtre les tâches par statut |
| `GET` | `/todos/:id` | Récupère une tâche par son identifiant |
| `POST` | `/todos` | Crée une tâche avec `{ "title": "..." }` |
| `DELETE` | `/todos/:id` | Supprime une tâche |

Exemple :

```bash
curl http://localhost:3000/todos

curl -X POST http://localhost:3000/todos \
  -H 'content-type: application/json' \
  -d '{"title":"Tester un agent"}'
```

## Vérifications

```bash
npm run check
npm test
```

Les tests marqués `TODO` correspondent à des bugs connus qui doivent être traités via les issues du dépôt.

La CI utilise les versions courantes de `actions/checkout` et `actions/setup-node`, épinglées par SHA, et couvre Node.js 22, 24 et 26. Dependabot vérifie chaque semaine les mises à jour des actions GitHub.

## Travailler avec un agent

Le fichier [`AGENTS.md`](./AGENTS.md) donne à l'agent les commandes, l'architecture, les contraintes et la définition de fini. Pour un exercice :

1. assigne une issue à l'agent ;
2. demande-lui d'implémenter uniquement cette issue ;
3. laisse-le ajouter le test de régression et ouvrir une pull request ;
4. vérifie la CI avant de fusionner.

### Configuration de l'agent

Le fichier [`agent.config.json`](./agent.config.json) limite l'agent aux branches `agent/`, à dix fichiers modifiés et aux commandes `npm run check` puis `npm test`.

Le workflow [`.github/workflows/review-fix.yml`](./.github/workflows/review-fix.yml) permet à un maintainer de demander une correction sur une pull request créée par l'agent :

- `/agent fix` dans un fil de review inline ;
- `/agent fix <instruction>` pour préciser le correctif ;
- `/agent fix-all` dans la conversation générale de la pull request.

Avant de l'utiliser, configurer dans GitHub Actions :

| Type | Nom | Usage |
| --- | --- | --- |
| Variable | `AGENT_REPOSITORY` | Dépôt contenant le control plane agent, au format `organisation/depot` |
| Variable | `AGENT_REF` | Tag protégé ou SHA immuable du code agent |
| Secret | `CODEX_API_KEY` | Authentification du moteur Codex |
| Secret | `AGENT_REPOSITORY_TOKEN` | Lecture du dépôt agent s'il est privé |

Le workflow refuse de démarrer si la source de confiance ou sa référence ne sont pas définies. Les commandes qualité tournent dans un conteneur Node.js 24 sans réseau et avec le dépôt monté en lecture seule.

## Licence

MIT
