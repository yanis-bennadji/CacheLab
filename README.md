# CacheLab

A distributed cache system with in-memory HashMap implementation and persistent storage, inspired by Redis.

## Features

### Cache Service
- ✅ Custom HashMap implementation with O(1) operations
- ✅ LRU (Least Recently Used) eviction policy
- ✅ TTL (Time To Live) support
- ✅ Performance statistics and monitoring
- ✅ Optional persistence to storage service
- ✅ Rate limiting and security headers

### Storage Service
- ✅ Persistent disk-based storage
- ✅ Partitioned file system for better performance
- ✅ Async write queue for non-blocking operations
- ✅ LRU read cache for frequently accessed data
- ✅ Automatic backups and data compaction
- ✅ Version tracking for data integrity

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install root dependencies
npm install

# Install dependencies for both services
npm run install:all
```

### Running the Services

#### Option 1: Run both services concurrently

```bash
npm run dev
```

#### Option 2: Run services separately

```bash
# Terminal 1 - Cache Service
npm run dev:cache

# Terminal 2 - Storage Service
npm run dev:storage
```

The services will start on:
- Cache Service: http://localhost:3001
- Storage Service: http://localhost:3002

### Basic Usage

```bash
# Set a value in cache
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{"key": "username", "value": "john_doe", "ttl": 3600}'

# Get a value from cache
curl http://localhost:3001/api/keys/username

# Set a value with persistence
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{"key": "user:123", "value": {"name": "John", "age": 30}, "persist": true}'

# Get cache statistics
curl http://localhost:3001/api/stats

# Health check
curl http://localhost:3001/api/health
```

## Project Structure

```
CacheLab/
├── cache-service/          # In-memory cache service
│   ├── src/
│   │   ├── cache/
│   │   │   ├── HashMap.ts          # Custom HashMap implementation
│   │   │   └── CacheManager.ts     # Cache manager with TTL & LRU
│   │   ├── routes/
│   │   │   └── cacheRoutes.ts      # API routes
│   │   ├── middleware/
│   │   │   ├── validation.ts       # Request validation
│   │   │   ├── errorHandler.ts     # Error handling
│   │   │   └── logger.ts           # Logging & rate limiting
│   │   ├── services/
│   │   │   └── storageService.ts   # Storage service client
│   │   ├── config/
│   │   │   └── config.ts           # Configuration
│   │   └── index.ts                # Express server
│   └── tests/                      # Unit & integration tests
│
├── storage-service/        # Persistent storage service
│   ├── src/
│   │   ├── storage/
│   │   │   ├── FileStorage.ts      # File-based storage
│   │   │   └── StorageManager.ts   # Storage manager
│   │   ├── routes/
│   │   │   └── storageRoutes.ts    # API routes
│   │   ├── middleware/             # Same as cache-service
│   │   ├── config/
│   │   └── index.ts
│   ├── data/                       # Data storage directory
│   └── tests/
│
├── shared/                 # Shared code
│   ├── types/
│   │   └── index.ts               # TypeScript types
│   └── utils/
│       └── helpers.ts             # Utility functions
│
└── docs/                   # Documentation
    ├── api-documentation.md
    ├── architecture.md
    └── performance-tests.md
```

## API Documentation

See [API Documentation](docs/api-documentation.md) for complete API reference.

### Cache Service Endpoints

- `POST /api/keys` - Create/update cache entry
- `GET /api/keys/:key` - Get cache entry
- `PUT /api/keys/:key` - Update cache entry
- `DELETE /api/keys/:key` - Delete cache entry
- `GET /api/keys` - List all keys
- `GET /api/stats` - Get statistics
- `DELETE /api/cache` - Clear cache
- `GET /api/health` - Health check

### Storage Service Endpoints

- `POST /api/data` - Save data
- `GET /api/data/:key` - Load data
- `PUT /api/data/:key` - Update data
- `DELETE /api/data/:key` - Delete data
- `GET /api/data` - List all keys
- `GET /api/stats` - Get statistics
- `DELETE /api/storage` - Clear storage
- `POST /api/backup` - Create backup
- `POST /api/compact` - Compact data
- `GET /api/health` - Health check

## Testing

```bash
# Run all tests
npm run test:all

# Run tests for cache service
cd cache-service && npm test

# Run tests with coverage
cd cache-service && npm run test

# Watch mode
cd cache-service && npm run test:watch
```

## Configuration

### Cache Service (.env)

```env
PORT=3001
STORAGE_SERVICE_URL=http://localhost:3002
MAX_CACHE_SIZE=1000
DEFAULT_TTL=3600
NODE_ENV=development
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

### Storage Service (.env)

```env
PORT=3002
DATA_PATH=./data
BACKUP_INTERVAL=300000
MAX_FILE_SIZE=10485760
NODE_ENV=development
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

## Architecture

See [Architecture Documentation](docs/architecture.md) for detailed system design.

### Key Components

**HashMap**
- DJB2 hash function
- Chaining for collision resolution
- Dynamic resizing (load factor 0.75)
- O(1) average time complexity

**CacheManager**
- TTL-based expiration
- LRU eviction policy
- Statistics tracking
- Automatic cleanup

**FileStorage**
- Partitioned storage (16 partitions)
- Base64 key encoding
- JSON format
- Atomic operations

**StorageManager**
- Async write queue
- LRU read cache
- Periodic backups
- Data compaction

## Performance

### Cache Service
- **Get**: < 1ms (in-memory)
- **Set**: < 1ms (in-memory)
- **Capacity**: Configurable (default: 1000 entries)
- **Throughput**: ~10,000 ops/sec

### Storage Service
- **Save**: ~1-5ms (async queue)
- **Load (cached)**: < 1ms
- **Load (disk)**: ~1-5ms
- **Throughput**: ~1,000 ops/sec (I/O bound)

## Development

### Building

```bash
# Build all services
npm run build:all

# Build cache service
cd cache-service && npm run build

# Build storage service
cd storage-service && npm run build
```

### Running in Production

```bash
# Cache service
cd cache-service && npm start

# Storage service
cd storage-service && npm start
```

## Security

- Input validation (key length, value size)
- Rate limiting (100 req/min per IP)
- Helmet.js security headers
- CORS configuration
- Error sanitization

## Monitoring

Both services expose `/api/health` and `/api/stats` endpoints for monitoring:

**Health Check Response:**
```json
{
  "status": "healthy",
  "uptime": 3652.45,
  "timestamp": "2025-12-02T10:30:00.000Z",
  "cache": {
    "size": 847,
    "maxSize": 1000
  }
}
```

**Statistics Response:**
```json
{
  "hits": 1523,
  "misses": 234,
  "hitRate": 86.68,
  "size": 847,
  "maxSize": 1000,
  "evictions": 12
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

## Roadmap

- [ ] Redis protocol compatibility
- [ ] Cluster mode support
- [ ] Replication
- [ ] Pub/Sub messaging
- [ ] Prometheus metrics
- [ ] Docker support
- [ ] Kubernetes deployment
- [ ] Compression support
- [ ] Advanced eviction policies (LFU, FIFO)
- [ ] Database backend integration

## Credits

Built as an educational project to understand:
- HashMap implementation
- Cache eviction policies
- Distributed systems
- TypeScript/Node.js development
- REST API design

## Support

For questions or issues, please open an issue on GitHub.
