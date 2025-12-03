# Getting Started Guide

This guide will help you get CacheLab up and running in minutes.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Terminal/Command line access

## Installation

### 1. Install Dependencies

From the project root:

```bash
# Install all dependencies
npm install
npm run install:all
```

This will install dependencies for:
- Root project (concurrently for running both services)
- Cache service
- Storage service

## Running the Services

### Option 1: Run Both Services Together (Recommended)

```bash
npm run dev
```

This will start both services concurrently:
- Cache Service on http://localhost:3001
- Storage Service on http://localhost:3002

### Option 2: Run Services Separately

**Terminal 1 - Cache Service:**
```bash
cd cache-service
npm run dev
```

**Terminal 2 - Storage Service:**
```bash
cd storage-service
npm run dev
```

## Verify Installation

Check that both services are running:

```bash
# Check cache service
curl http://localhost:3001/api/health

# Check storage service
curl http://localhost:3002/api/health
```

You should see responses indicating both services are healthy.

## Basic Usage Examples

### 1. Set a Simple Key-Value Pair

```bash
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "key": "greeting",
    "value": "Hello, World!"
  }'
```

### 2. Get a Value

```bash
curl http://localhost:3001/api/keys/greeting
```

### 3. Set with TTL (Expires in 60 seconds)

```bash
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "key": "session",
    "value": "abc123",
    "ttl": 60
  }'
```

### 4. Set with Persistence

```bash
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "key": "user:123",
    "value": {"name": "John Doe", "email": "john@example.com"},
    "persist": true
  }'
```

This saves to both cache AND storage service.

### 5. Get with Storage Fallback

```bash
# Clear cache first
curl -X DELETE http://localhost:3001/api/cache

# Get with fallback - will load from storage if not in cache
curl "http://localhost:3001/api/keys/user:123?fallback=true"
```

### 6. View Cache Statistics

```bash
curl http://localhost:3001/api/stats
```

### 7. List All Keys

```bash
curl http://localhost:3001/api/keys
```

## Testing the Complete Workflow

Here's a complete example demonstrating the cache + storage workflow:

```bash
# 1. Set a value with persistence
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "key": "product:456",
    "value": {"name": "Laptop", "price": 999.99, "stock": 50},
    "ttl": 3600,
    "persist": true
  }'

# 2. Get from cache (fast)
curl http://localhost:3001/api/keys/product:456

# 3. View statistics
curl http://localhost:3001/api/stats

# 4. Clear cache
curl -X DELETE http://localhost:3001/api/cache

# 5. Try to get (will fail - not in cache)
curl http://localhost:3001/api/keys/product:456
# Returns 404

# 6. Get with storage fallback (will load from storage)
curl "http://localhost:3001/api/keys/product:456?fallback=true"
# Returns the value and loads it back into cache

# 7. Subsequent gets are from cache (fast)
curl http://localhost:3001/api/keys/product:456
```

## Using with JavaScript/Node.js

```javascript
const axios = require('axios');

const CACHE_API = 'http://localhost:3001/api';
const STORAGE_API = 'http://localhost:3002/api';

// Set a value in cache
async function setCache(key, value, ttl = 3600) {
  const response = await axios.post(`${CACHE_API}/keys`, {
    key,
    value,
    ttl,
    persist: true
  });
  return response.data;
}

// Get a value from cache
async function getCache(key, fallback = true) {
  try {
    const response = await axios.get(`${CACHE_API}/keys/${key}`, {
      params: { fallback: fallback ? 'true' : 'false' }
    });
    return response.data.data.value;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

// Usage
(async () => {
  // Set
  await setCache('user:999', { name: 'Alice', role: 'admin' });

  // Get
  const user = await getCache('user:999');
  console.log(user); // { name: 'Alice', role: 'admin' }
})();
```

## Using with Python

```python
import requests
import json

CACHE_API = 'http://localhost:3001/api'
STORAGE_API = 'http://localhost:3002/api'

def set_cache(key, value, ttl=3600, persist=True):
    response = requests.post(f'{CACHE_API}/keys',
        json={
            'key': key,
            'value': value,
            'ttl': ttl,
            'persist': persist
        }
    )
    return response.json()

def get_cache(key, fallback=True):
    params = {'fallback': 'true'} if fallback else {}
    response = requests.get(f'{CACHE_API}/keys/{key}', params=params)
    if response.status_code == 404:
        return None
    return response.json()['data']['value']

# Usage
set_cache('config:app', {'theme': 'dark', 'language': 'en'})
config = get_cache('config:app')
print(config)  # {'theme': 'dark', 'language': 'en'}
```

## Running Tests

```bash
# Test cache service
cd cache-service
npm test

# Test with coverage
npm test -- --coverage

# Watch mode for development
npm run test:watch
```

## Building for Production

```bash
# Build both services
npm run build:all

# Or build individually
cd cache-service && npm run build
cd storage-service && npm run build
```

## Running in Production

```bash
# Set NODE_ENV
export NODE_ENV=production

# Start cache service
cd cache-service && npm start

# Start storage service (in another terminal)
cd storage-service && npm start
```

## Configuration

### Cache Service

Edit `cache-service/.env`:

```env
PORT=3001
STORAGE_SERVICE_URL=http://localhost:3002
MAX_CACHE_SIZE=1000          # Maximum number of entries
DEFAULT_TTL=3600             # Default TTL in seconds
RATE_LIMIT_MAX_REQUESTS=100  # Requests per minute per IP
```

### Storage Service

Edit `storage-service/.env`:

```env
PORT=3002
DATA_PATH=./data             # Where to store files
BACKUP_INTERVAL=300000       # Backup every 5 minutes
MAX_FILE_SIZE=10485760       # 10MB max file size
```

## Troubleshooting

### Port Already in Use

If you get `EADDRINUSE` error:

```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

Or change the port in `.env` files.

### Storage Service Can't Create Files

Make sure the `storage-service/data` directory exists and has write permissions:

```bash
mkdir -p storage-service/data
chmod 755 storage-service/data
```

### Services Can't Communicate

Make sure both services are running and `STORAGE_SERVICE_URL` in cache service `.env` is correct.

Test connectivity:
```bash
curl http://localhost:3002/api/health
```

## Next Steps

- Read the [API Documentation](api-documentation.md) for complete API reference
- Learn about the [Architecture](architecture.md) to understand how it works
- Explore the source code in `cache-service/src` and `storage-service/src`
- Modify configuration for your use case
- Write your own tests

## Common Use Cases

### 1. Session Storage

```bash
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "key": "session:abc123",
    "value": {"userId": 123, "authenticated": true},
    "ttl": 1800
  }'
```

### 2. API Response Caching

```bash
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "key": "api:users:list",
    "value": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}],
    "ttl": 300
  }'
```

### 3. Rate Limiting Data

```bash
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "key": "ratelimit:192.168.1.1",
    "value": {"count": 45, "resetAt": 1701522000},
    "ttl": 60
  }'
```

### 4. Feature Flags

```bash
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "key": "feature:new-ui",
    "value": {"enabled": true, "rollout": 0.5},
    "persist": true
  }'
```

## Support

If you encounter any issues:
1. Check the service logs for errors
2. Verify all dependencies are installed
3. Ensure ports are not in use
4. Check file permissions for storage service
5. Review the documentation

For bugs or feature requests, please open an issue on GitHub.

Happy caching! 🚀
