# API Documentation

## Cache Service API (Port 3001)

Base URL: `http://localhost:3001/api`

### Endpoints

#### 1. Create/Update Cache Entry

**POST** `/keys`

Create or update a cache entry with optional TTL and persistence.

**Request Body:**
```json
{
  "key": "string",
  "value": "any",
  "ttl": "number (optional, in seconds)",
  "persist": "boolean (optional, saves to storage service)"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Key set successfully",
  "data": {
    "key": "user:123",
    "persisted": true
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "key": "user:123",
    "value": {"name": "John", "age": 30},
    "ttl": 3600,
    "persist": true
  }'
```

---

#### 2. Get Cache Entry

**GET** `/keys/:key`

Retrieve a value from cache. Optionally fallback to storage service if not in cache.

**Query Parameters:**
- `fallback` (optional): Set to `"true"` to load from storage if not in cache

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "key": "user:123",
    "value": {"name": "John", "age": 30}
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Key not found or expired"
}
```

**Example:**
```bash
# Get from cache only
curl http://localhost:3001/api/keys/user:123

# Get with storage fallback
curl http://localhost:3001/api/keys/user:123?fallback=true
```

---

#### 3. Update Cache Entry

**PUT** `/keys/:key`

Update an existing cache entry's value or TTL.

**Request Body:**
```json
{
  "value": "any (optional)",
  "ttl": "number (optional, in seconds)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Key updated successfully",
  "data": {
    "key": "user:123"
  }
}
```

**Example:**
```bash
curl -X PUT http://localhost:3001/api/keys/user:123 \
  -H "Content-Type: application/json" \
  -d '{"value": {"name": "John Doe", "age": 31}}'
```

---

#### 4. Delete Cache Entry

**DELETE** `/keys/:key`

Delete a cache entry.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Key deleted successfully",
  "data": {
    "key": "user:123"
  }
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3001/api/keys/user:123
```

---

#### 5. List All Keys

**GET** `/keys`

Get a list of all keys currently in cache.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "keys": ["user:123", "session:abc", "product:456"],
    "count": 3
  }
}
```

**Example:**
```bash
curl http://localhost:3001/api/keys
```

---

#### 6. Get Cache Statistics

**GET** `/stats`

Get cache performance statistics.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "hits": 1523,
    "misses": 234,
    "hitRate": 86.68,
    "size": 847,
    "maxSize": 1000,
    "evictions": 12
  }
}
```

**Example:**
```bash
curl http://localhost:3001/api/stats
```

---

#### 7. Clear Cache

**DELETE** `/cache`

Clear all entries from the cache.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3001/api/cache
```

---

#### 8. Health Check

**GET** `/health`

Check service health and status.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3652.45,
    "timestamp": "2025-12-02T10:30:00.000Z",
    "cache": {
      "size": 847,
      "maxSize": 1000
    }
  }
}
```

**Example:**
```bash
curl http://localhost:3001/api/health
```

---

## Storage Service API (Port 3002)

Base URL: `http://localhost:3002/api`

### Endpoints

#### 1. Save Data

**POST** `/data`

Save a key-value pair to persistent storage.

**Request Body:**
```json
{
  "key": "string",
  "value": "any"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Data saved successfully",
  "data": {
    "key": "user:123",
    "version": 1,
    "createdAt": 1701518400000,
    "updatedAt": 1701518400000
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3002/api/data \
  -H "Content-Type: application/json" \
  -d '{
    "key": "user:123",
    "value": {"name": "John", "age": 30}
  }'
```

---

#### 2. Load Data

**GET** `/data/:key`

Load a value from persistent storage.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "key": "user:123",
    "value": {"name": "John", "age": 30},
    "metadata": {
      "createdAt": 1701518400000,
      "updatedAt": 1701518400000,
      "version": 1
    }
  }
}
```

**Example:**
```bash
curl http://localhost:3002/api/data/user:123
```

---

#### 3. Update Data

**PUT** `/data/:key`

Update an existing value in storage.

**Request Body:**
```json
{
  "value": "any"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Data updated successfully",
  "data": {
    "key": "user:123",
    "version": 2,
    "updatedAt": 1701522000000
  }
}
```

---

#### 4. Delete Data

**DELETE** `/data/:key`

Delete a key-value pair from storage.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Data deleted successfully",
  "data": {
    "key": "user:123"
  }
}
```

---

#### 5. List All Keys

**GET** `/data`

Get a list of all keys in storage.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "keys": ["user:123", "user:456", "product:789"],
    "count": 3
  }
}
```

---

#### 6. Get Storage Statistics

**GET** `/stats`

Get storage statistics.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalKeys": 1523,
    "totalSize": 524288,
    "partitions": 16,
    "dataPath": "./data",
    "readCacheSize": 45,
    "maxReadCacheSize": 100,
    "writeQueueLength": 0
  }
}
```

---

#### 7. Clear Storage

**DELETE** `/storage`

Clear all data from storage.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Storage cleared successfully"
}
```

---

#### 8. Create Backup

**POST** `/backup`

Create a backup of all data.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Backup created successfully",
  "data": {
    "backupPath": "./data/backup_2025-12-02T10-30-00-000Z.json"
  }
}
```

---

#### 9. Compact Data

**POST** `/compact`

Compact storage by removing old versions.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Data compacted successfully"
}
```

---

#### 10. Health Check

**GET** `/health`

Check service health and status.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 7245.89,
    "timestamp": "2025-12-02T10:30:00.000Z",
    "storage": {
      "totalKeys": 1523,
      "totalSize": 524288
    }
  }
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    {
      "field": "key",
      "message": "Key is required"
    }
  ]
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Key not found"
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "error": "Too many requests, please try again later"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Rate Limiting

Both services implement rate limiting:
- **Default**: 100 requests per minute per IP
- Configurable via environment variables

---

## Data Validation

### Key Constraints
- Type: String
- Max length: 256 characters
- Required: Yes

### Value Constraints
- Type: Any JSON-serializable value
- Max size: 1MB (cache), 10MB (storage)
- Required: Yes

### TTL Constraints
- Type: Number
- Unit: Seconds
- Min: 0 (no expiration)
- Optional: Yes
