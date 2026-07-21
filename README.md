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

## Licence

MIT
