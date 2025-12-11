# CacheLab Testing Guide

## 🚀 Quick Start

### 1. Start the Server

```bash
npm run dev
# or
npm start
```

The server will run on `http://localhost:3000`

### 2. Run Automated Tests

```bash
./test-cache.sh
```

This will test all endpoints including RAM management and LRU eviction.

---

## 📝 Manual Testing

### Basic Cache Operations

#### Create a Key
```bash
curl -X POST http://localhost:3000/keys \
  -H "Content-Type: application/json" \
  -d '{"key": "user1", "value": {"name": "Alice", "age": 30}}'
```

**Expected Response:**
```json
{"message": "Sauvegardé", "key": "user1"}
```

#### List All Keys
```bash
curl http://localhost:3000/keys
```

**Expected Response:**
```json
{"keys": ["user1"]}
```

#### Get a Specific Key
```bash
curl http://localhost:3000/keys/user1
```

**Expected Response:**
```json
{"key": "user1", "value": {"name": "Alice", "age": 30}}
```

#### Update a Key
```bash
curl -X PUT http://localhost:3000/keys/user1 \
  -H "Content-Type: application/json" \
  -d '{"value": {"name": "Alice Smith", "age": 31}}'
```

**Expected Response:**
```json
{"message": "Mis à jour", "key": "user1", "value": {"name": "Alice Smith", "age": 31}}
```

#### Delete a Key
```bash
curl -X DELETE http://localhost:3000/keys/user1
```

**Expected Response:**
```json
{"message": "Supprimé"}
```

---

## 🐛 Debug Endpoints

#### Get Bucket Size
```bash
curl http://localhost:3000/debug/bucket-size
```

**Expected Response:**
```json
{"bucketSize": 7}
```
*Note: This doubles when load factor exceeds 0.75*

#### Get Load Factor
```bash
curl http://localhost:3000/debug/load-factor
```

**Expected Response:**
```json
{"loadFactor": 0.42857142857142855}
```

#### Get Entry Count
```bash
curl http://localhost:3000/debug/count
```

**Expected Response:**
```json
{"count": 3}
```

#### Get Memory Usage (NEW!)
```bash
curl http://localhost:3000/debug/memory
```

**Expected Response:**
```json
{
  "currentMemoryBytes": 123456,
  "maxMemoryBytes": 5242880,
  "usagePercentage": 2.35
}
```

#### Reset Cache
```bash
curl -X POST http://localhost:3000/debug/reset
```

**Expected Response:**
```json
{"message": "Cache réinitialisé"}
```

---

## 🧠 Testing RAM Management & LRU Eviction

### Test 1: Fill Cache to Trigger Eviction

```bash
# Create 100 large entries (~50KB each)
for i in {1..100}; do
  curl -X POST http://localhost:3000/keys \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"large_$i\", \"value\": \"$(printf 'x%.0s' {1..50000})\"}" \
    -s > /dev/null
  echo "Created entry $i"
done

# Check memory usage (should be close to 5MB limit)
curl http://localhost:3000/debug/memory

# Check count (should be less than 100 due to eviction)
curl http://localhost:3000/debug/count
```

### Test 2: Verify LRU Behavior

```bash
# Reset cache
curl -X POST http://localhost:3000/debug/reset

# Create 3 small entries
curl -X POST http://localhost:3000/keys -H "Content-Type: application/json" -d '{"key": "key1", "value": "value1"}'
sleep 1
curl -X POST http://localhost:3000/keys -H "Content-Type: application/json" -d '{"key": "key2", "value": "value2"}'
sleep 1
curl -X POST http://localhost:3000/keys -H "Content-Type: application/json" -d '{"key": "key3", "value": "value3"}'

# Access key1 to make it recently used
curl http://localhost:3000/keys/key1

# Fill cache with large data to trigger eviction
# key2 should be evicted first (oldest), then key3
for i in {1..100}; do
  curl -X POST http://localhost:3000/keys \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"large_$i\", \"value\": \"$(printf 'x%.0s' {1..50000})\"}" \
    -s > /dev/null
done

# Try to get key2 (should fail - evicted)
curl http://localhost:3000/keys/key2

# Try to get key1 (might still exist if accessed recently)
curl http://localhost:3000/keys/key1
```

---

## 🔍 Testing Rehashing

```bash
# Reset cache
curl -X POST http://localhost:3000/debug/reset

# Check initial bucket size (should be 7)
curl http://localhost:3000/debug/bucket-size

# Add 6 items (load factor = 6/7 ≈ 0.857 > 0.75, triggers rehash)
for i in {1..6}; do
  curl -X POST http://localhost:3000/keys \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"key$i\", \"value\": \"value$i\"}"
done

# Check bucket size again (should be 14 after rehash)
curl http://localhost:3000/debug/bucket-size

# Check load factor (should be ~0.428)
curl http://localhost:3000/debug/load-factor
```

---

## ❌ Error Cases

#### Try to get non-existent key
```bash
curl http://localhost:3000/keys/nonexistent
```

**Expected Response (404):**
```json
{"error": "Clé introuvable"}
```

#### Try to update non-existent key
```bash
curl -X PUT http://localhost:3000/keys/nonexistent \
  -H "Content-Type: application/json" \
  -d '{"value": "test"}'
```

**Expected Response (404):**
```json
{"error": "Clé introuvable pour modification"}
```

#### Try to delete non-existent key
```bash
curl -X DELETE http://localhost:3000/keys/nonexistent
```

**Expected Response (404):**
```json
{"error": "Clé introuvable"}
```

#### Invalid request (missing key)
```bash
curl -X POST http://localhost:3000/keys \
  -H "Content-Type: application/json" \
  -d '{"value": "test"}'
```

**Expected Response (400):**
```json
{"error": "key et value sont requis"}
```

---

## 📊 Expected Behavior

### RAM Management
- **Max Memory:** 5MB (5,242,880 bytes)
- **Eviction Policy:** LRU (Least Recently Used)
- When memory limit is reached, oldest entries are automatically removed
- Accessing a key updates its "last accessed" timestamp

### Rehashing
- **Load Factor Threshold:** 0.75
- When threshold is exceeded, bucket array doubles in size
- All entries are redistributed for better performance

### Hash Function
- Uses SHA-256 for strong collision resistance
- Takes first 8 hex characters for bucket indexing

---

## 🛠️ Troubleshooting

### Server won't start
```bash
# Check if port 3000 is already in use
lsof -i :3000

# Kill the process if needed
kill -9 <PID>
```

### TypeScript compilation errors
```bash
npm run build
```

### Check server logs
The server logs all requests and errors to the console where it's running.

