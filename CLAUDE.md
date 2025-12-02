📋 Vue d'ensemble du projet
Ce projet implémente un système de cache clé/valeur distribué inspiré de Redis, avec deux composants principaux :

Cache Service (port 3001) - Service de cache en mémoire avec HashMap pour des performances O(1)
Storage Service (port 3002) - Service de persistance avec stockage sur disque

🏗️ Architecture du projet
CacheLab/
├── cache-service/          # Service de cache en mémoire (HashMap)
│   ├── src/
│   │   ├── index.ts       # Point d'entrée du serveur Express
│   │   ├── cache/
│   │   │   ├── HashMap.ts # Implémentation de la HashMap
│   │   │   └── CacheManager.ts # Gestion du cache (TTL, éviction)
│   │   ├── routes/
│   │   │   └── cacheRoutes.ts # Routes API REST
│   │   ├── middleware/
│   │   │   ├── validation.ts  # Validation des requêtes
│   │   │   ├── errorHandler.ts # Gestion des erreurs
│   │   │   └── logger.ts      # Logging des requêtes
│   │   └── config/
│   │       └── config.ts      # Configuration du service
│   ├── tests/
│   │   ├── HashMap.test.ts
│   │   └── api.test.ts
│   ├── package.json
│   └── tsconfig.json
│
├── storage-service/        # Service de persistance
│   ├── src/
│   │   ├── index.ts       # Point d'entrée du serveur Express
│   │   ├── storage/
│   │   │   ├── FileStorage.ts    # Stockage fichier JSON
│   │   │   └── StorageManager.ts # Gestion de la persistance
│   │   ├── routes/
│   │   │   └── storageRoutes.ts # Routes API REST
│   │   ├── middleware/
│   │   │   ├── validation.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── logger.ts
│   │   └── config/
│   │       └── config.ts
│   ├── data/              # Répertoire de stockage des données
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                 # Code partagé entre les services
│   ├── types/
│   │   └── index.ts       # Types TypeScript communs
│   └── utils/
│       └── helpers.ts     # Fonctions utilitaires
│
├── docs/                   # Documentation
│   ├── architecture.md
│   ├── api-documentation.md
│   └── performance-tests.md
│
└── docker-compose.yml      # Orchestration des services (optionnel)
🚀 Étapes de mise en place
Phase 1 : Configuration de base
1.1 Initialiser le projet principal
bash# À la racine du projet
npm init -y
npm install --save-dev typescript @types/node
1.2 Créer la structure de base
bashmkdir -p cache-service/src/{cache,routes,middleware,config}
mkdir -p storage-service/src/{storage,routes,middleware,config}
mkdir -p shared/{types,utils}
mkdir -p docs
Phase 2 : Cache Service (HashMap en mémoire)
2.1 Initialiser le cache-service
bashcd cache-service
npm init -y
npm install express cors helmet dotenv
npm install --save-dev typescript @types/express @types/node @types/cors ts-node nodemon
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
2.2 Configuration TypeScript (cache-service/tsconfig.json)
json{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
2.3 Scripts package.json (cache-service/package.json)
json{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
2.4 Implémentation de la HashMap
Créer cache-service/src/cache/HashMap.ts avec :

Classe HashMap avec tableau de buckets
Fonction de hashing (djb2 ou murmur3)
Gestion des collisions (chaînage)
Méthodes : set, get, delete, has, clear, size
Facteur de charge et redimensionnement automatique

2.5 Implémentation du CacheManager
Créer cache-service/src/cache/CacheManager.ts avec :

Wrapper autour de HashMap
Gestion TTL (Time To Live)
Politique d'éviction LRU (Least Recently Used)
Statistiques (hits, misses, taux de réussite)

2.6 Routes API
Créer cache-service/src/routes/cacheRoutes.ts :

POST /keys - Créer/mettre à jour une clé
GET /keys/:key - Récupérer une valeur
PUT /keys/:key - Modifier une valeur
DELETE /keys/:key - Supprimer une clé
GET /keys - Lister toutes les clés
GET /stats - Statistiques du cache
DELETE /cache - Vider le cache

2.7 Middleware

validation.ts : Validation des entrées (longueur clé/valeur, format)
errorHandler.ts : Gestion centralisée des erreurs
logger.ts : Logging des requêtes avec timestamps

2.8 Serveur Express
Créer cache-service/src/index.ts avec :

Configuration Express
Middleware de sécurité (helmet, cors, rate limiting)
Montage des routes
Gestion des erreurs
Démarrage du serveur

Phase 3 : Storage Service (Persistance)
3.1 Initialiser le storage-service
bashcd ../storage-service
npm init -y
npm install express cors helmet dotenv
npm install --save-dev typescript @types/express @types/node @types/cors ts-node nodemon
```

#### 3.2 Configuration similaire au cache-service
- Copier `tsconfig.json` et adapter
- Configurer les scripts dans `package.json`

#### 3.3 Implémentation du stockage
Créer `storage-service/src/storage/FileStorage.ts` avec :
- Lecture/écriture JSON sur disque
- Gestion des fichiers par partition (pour la performance)
- Méthodes : save, load, delete, exists, list
- Gestion des erreurs I/O

#### 3.4 StorageManager
Créer `storage-service/src/storage/StorageManager.ts` avec :
- Cache en mémoire pour les lectures fréquentes
- File d'attente pour les écritures asynchrones
- Backup automatique périodique
- Compactage des données

#### 3.5 Routes API
Similaire au cache-service mais adapté au stockage persistant

### Phase 4 : Communication entre services

#### 4.1 Configuration
Créer des fichiers `.env` pour chaque service :

**cache-service/.env**
```
PORT=3001
STORAGE_SERVICE_URL=http://localhost:3002
MAX_CACHE_SIZE=1000
DEFAULT_TTL=3600
```

**storage-service/.env**
```
PORT=3002
DATA_PATH=./data
BACKUP_INTERVAL=300000
4.2 Synchronisation
Dans le cache-service, implémenter :

Fonction pour sauvegarder dans le storage-service
Option de write-through ou write-back
Récupération depuis le storage en cas de cache miss

Phase 5 : Tests et validation
5.1 Tests unitaires

Tester la HashMap isolément
Tester le CacheManager
Tester le FileStorage

5.2 Tests d'intégration

Tester les endpoints API
Tester la communication entre services
Tester les scénarios de charge

5.3 Tests de performance

Mesurer les temps de réponse
Tester avec différentes charges
Benchmarker vs Redis (optionnel)

Phase 6 : Documentation et monitoring
6.1 Documentation API
Créer docs/api-documentation.md avec :

Description de chaque endpoint
Exemples de requêtes/réponses
Codes d'erreur

6.2 Monitoring
Implémenter :

Endpoint /health pour chaque service
Métriques (nombre de requêtes, latence, erreurs)
Logs structurés

📝 Bonnes pratiques à suivre
Sécurité

Validation stricte des entrées
Limitation de la taille des clés/valeurs
Rate limiting
Authentification par API key (optionnel pour MVP)
Headers de sécurité (helmet)

Performance

HashMap avec facteur de charge optimal (0.75)
Éviction LRU pour gérer la mémoire
Écritures asynchrones sur disque
Compression des données (optionnel)

Code Quality

Types TypeScript stricts
Gestion d'erreurs robuste
Logs informatifs
Tests avec couverture > 80%
Documentation inline

🔧 Commandes de développement
bash# Démarrer le cache-service en dev
cd cache-service
npm run dev

# Démarrer le storage-service en dev
cd storage-service
npm run dev

# Lancer les tests
npm test

# Build pour production
npm run build

📊 Métriques de succès MVP

✅ Temps de réponse < 10ms pour le cache
✅ Support de 1000+ clés en mémoire
✅ Persistance fiable sur disque
✅ Taux de disponibilité > 99%
✅ API REST complète et documentée
✅ Tests avec couverture > 80%

🚨 Points d'attention

Gestion mémoire : Implémenter une limite stricte
Collisions HashMap : Bien tester avec différentes fonctions de hash
I/O disque : Rendre asynchrone pour ne pas bloquer
Erreurs réseau : Gérer les timeouts entre services
Corruption données : Valider l'intégrité des fichiers