# Architecture Documentation

## System Overview

CacheLab is a distributed cache system consisting of two independent microservices:

1. **Cache Service** (Port 3001) - In-memory cache with HashMap implementation
2. **Storage Service** (Port 3002) - Persistent disk-based storage

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
       v                 v                 v
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Cache Service│  │ Cache Service│  │Storage Service│
│  (Instance 1)│  │  (Instance 2)│  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       │                 │                 v
       │                 │           ┌──────────┐
       │                 │           │   Disk   │
       │                 │           │ Storage  │
       └─────────────────┴───────────┴──────────┘
              Optional Persistence
```

---

## Cache Service Architecture

### Core Components

#### 1. HashMap Implementation

**File**: [cache-service/src/cache/HashMap.ts](../cache-service/src/cache/HashMap.ts)

Custom HashMap implementation with:
- **Hash Function**: DJB2 algorithm for consistent key distribution
- **Collision Resolution**: Chaining using linked lists
- **Dynamic Resizing**: Automatic capacity doubling when load factor exceeds 0.75
- **Time Complexity**: O(1) average for get/set/delete operations

**Key Features:**
```typescript
class HashMap<T> {
  - buckets: Array<LinkedList>
  - size: number
  - capacity: number
  - loadFactor: 0.75

  Methods:
  + set(key, value): O(1) average
  + get(key): O(1) average
  + delete(key): O(1) average
  + has(key): O(1) average
  + resize(): O(n)
}
```

**Resizing Strategy:**
- Initial capacity: 16 buckets
- Resize trigger: size / capacity >= 0.75
- New capacity: current capacity × 2
- All entries are rehashed during resize

---

#### 2. CacheManager

**File**: [cache-service/src/cache/CacheManager.ts](../cache-service/src/cache/CacheManager.ts)

Wrapper around HashMap providing:
- **TTL Management**: Time-to-live for cache entries
- **LRU Eviction**: Least Recently Used eviction policy
- **Statistics Tracking**: Hits, misses, evictions, hit rate
- **Automatic Cleanup**: Periodic removal of expired entries

**Key Features:**
```typescript
class CacheManager {
  - cache: HashMap<CacheEntry>
  - lruMap: Map<string, LRUNode>
  - lruHead: LRUNode
  - lruTail: LRUNode
  - maxSize: number
  - defaultTTL: number

  Statistics:
  - hits: number
  - misses: number
  - evictions: number
  - hitRate: percentage
}
```

**LRU Implementation:**
- Doubly linked list for O(1) access to least/most recently used
- HashMap for O(1) node lookup
- Automatic eviction when cache reaches maxSize
- Access updates: Both get and set operations update LRU order

**TTL Implementation:**
- Expiration timestamp calculated on set: `now + (TTL * 1000)`
- Checked on every get operation
- Automatic cleanup every 60 seconds
- Expired entries are deleted immediately on access

---

#### 3. API Layer

**File**: [cache-service/src/routes/cacheRoutes.ts](../cache-service/src/routes/cacheRoutes.ts)

REST API exposing cache operations:
- CRUD operations for cache entries
- Statistics and health monitoring
- Integration with storage service (optional persistence)

**Request Flow:**
```
Request → Middleware → Route Handler → CacheManager → HashMap → Response
          ↓
    - Validation
    - Rate Limiting
    - Logging
    - Error Handling
```

---

#### 4. Storage Integration

**File**: [cache-service/src/services/storageService.ts](../cache-service/src/services/storageService.ts)

Optional integration with storage service:
- **Write-through**: Save to storage on cache set (if `persist: true`)
- **Cache-aside**: Load from storage on cache miss (if `fallback: true`)
- **Async operations**: Non-blocking storage calls
- **Fault tolerance**: Cache continues working if storage is unavailable

---

## Storage Service Architecture

### Core Components

#### 1. FileStorage

**File**: [storage-service/src/storage/FileStorage.ts](../storage-service/src/storage/FileStorage.ts)

Low-level file I/O operations:
- **Partitioning**: Data split across 16 partitions for better performance
- **Key Sanitization**: Base64 encoding for filesystem safety
- **JSON Format**: Human-readable storage format
- **Atomic Operations**: Each file represents one key-value pair

**Directory Structure:**
```
data/
├── partition_0/
│   ├── dXNlcjoxMjM_.json
│   └── c2Vzc2lvbjphYmM_.json
├── partition_1/
│   └── cHJvZHVjdDo0NTY_.json
...
└── partition_15/
    └── ...
```

**Partitioning Strategy:**
```typescript
partitionNumber = djb2Hash(key) % 16
filePath = data/partition_{N}/{base64(key)}.json
```

---

#### 2. StorageManager

**File**: [storage-service/src/storage/StorageManager.ts](../storage-service/src/storage/StorageManager.ts)

High-level storage management:
- **Write Queue**: Async write operations with queue processing
- **Read Cache**: LRU cache for frequently accessed data
- **Auto Backup**: Periodic backups at configurable intervals
- **Data Compaction**: Remove old versions and optimize storage

**Key Features:**
```typescript
class StorageManager {
  - fileStorage: FileStorage
  - writeQueue: WriteOperation[]
  - readCache: Map<string, StorageEntry>
  - maxCacheSize: 100
  - backupInterval: 300000ms (5 minutes)

  Operations:
  + save(key, value): Async (queued)
  + load(key): Sync (cached)
  + createBackup(): Creates JSON backup
  + compact(): Removes old versions
}
```

**Write Queue:**
- Prevents I/O blocking
- Processes writes sequentially
- FIFO order guarantee
- Automatic queue processing

**Read Cache:**
- LRU eviction when full (max 100 entries)
- Populated on load operations
- Updated on save operations
- Reduces disk I/O for hot data

---

## Data Flow

### Write Operation (with persistence)

```
1. Client → POST /api/keys {key, value, persist: true}
2. Cache Service validates request
3. CacheManager.set(key, value) → HashMap
4. If persist: true → StorageService.save(key, value)
5. StorageService → HTTP POST to Storage Service
6. Storage Service → StorageManager.save()
7. StorageManager adds to write queue
8. Queue processor → FileStorage.save()
9. FileStorage writes JSON to disk
10. Response sent to client
```

### Read Operation (with fallback)

```
1. Client → GET /api/keys/{key}?fallback=true
2. CacheManager.get(key)
3. If found in cache → return value (HIT)
4. If not found and fallback=true:
   a. StorageService.load(key)
   b. Storage Service → StorageManager.load()
   c. Check read cache
   d. If not cached → FileStorage.load()
   e. Return value
   f. CacheManager.set(key, value) → populate cache
5. If not found anywhere → 404 (MISS)
```

---

## Performance Characteristics

### Cache Service

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| Set | O(1) average | O(n) worst case during resize |
| Get | O(1) average | Includes LRU update |
| Delete | O(1) average | - |
| Eviction | O(1) | LRU tail removal |
| TTL Check | O(1) | Simple timestamp comparison |

**Memory Usage:**
- HashMap: ~48 bytes per entry (overhead)
- LRU list: ~32 bytes per node
- Total: ~80 bytes + value size per entry

### Storage Service

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| Save | O(1) | Async, queued |
| Load (cached) | O(1) | Read from memory |
| Load (uncached) | O(disk I/O) | ~1-5ms per file |
| List | O(n × partitions) | Scans all files |
| Backup | O(n) | Creates single JSON |
| Compact | O(n) | Rewrites all files |

**Disk Usage:**
- JSON overhead: ~50-100 bytes per entry
- Metadata: ~150 bytes (timestamps, version)
- Total: ~200 bytes + value size per entry

---

## Scaling Considerations

### Horizontal Scaling

**Cache Service:**
- ✅ Stateless (except cache data)
- ✅ Can run multiple instances behind load balancer
- ⚠️ No cache synchronization between instances
- ⚠️ Each instance has independent cache

**Storage Service:**
- ⚠️ Stateful (file system)
- ⚠️ Requires shared storage (NFS, S3) for multiple instances
- ✅ Read operations can be distributed
- ⚠️ Write operations need coordination

### Vertical Scaling

**Cache Service:**
- Memory: Linear with number of entries
- CPU: Minimal (hash computations)
- Bottleneck: Memory capacity

**Storage Service:**
- Disk: Linear with number of entries
- I/O: Disk throughput
- Bottleneck: Disk I/O bandwidth

---

## Configuration

### Environment Variables

**Cache Service:**
```env
PORT=3001
STORAGE_SERVICE_URL=http://localhost:3002
MAX_CACHE_SIZE=1000
DEFAULT_TTL=3600
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

**Storage Service:**
```env
PORT=3002
DATA_PATH=./data
BACKUP_INTERVAL=300000
MAX_FILE_SIZE=10485760
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

---

## Security Features

1. **Input Validation**
   - Key length limits (256 chars)
   - Value size limits (1MB cache, 10MB storage)
   - Type checking

2. **Rate Limiting**
   - Per-IP request limiting
   - Configurable thresholds
   - Automatic cleanup

3. **Error Handling**
   - Centralized error handler
   - Sanitized error messages
   - Request logging

4. **Headers**
   - Helmet.js security headers
   - CORS configuration
   - Content-Type validation

---

## Monitoring and Observability

### Metrics Available

**Cache Service:**
- Hit rate percentage
- Total hits/misses
- Current cache size
- Eviction count
- Uptime

**Storage Service:**
- Total keys stored
- Total disk usage
- Write queue length
- Read cache size
- Backup status

### Health Checks

Both services expose `/api/health` endpoints for:
- Liveness checks
- Readiness checks
- Basic metrics
- Uptime tracking

---

## Future Enhancements

### Potential Improvements

1. **Cache Synchronization**
   - Redis Pub/Sub for multi-instance sync
   - Cache invalidation events

2. **Advanced Eviction**
   - LFU (Least Frequently Used)
   - FIFO (First In First Out)
   - Custom eviction policies

3. **Persistence Options**
   - Write-behind caching
   - Periodic snapshots
   - WAL (Write-Ahead Logging)

4. **Storage Backends**
   - Database integration (PostgreSQL, MongoDB)
   - Object storage (S3, MinIO)
   - Distributed storage (Cassandra)

5. **Performance**
   - Compression for large values
   - Batch operations
   - Streaming for large datasets

6. **Monitoring**
   - Prometheus metrics
   - Grafana dashboards
   - Distributed tracing
