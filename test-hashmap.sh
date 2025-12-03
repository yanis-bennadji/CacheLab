#!/bin/bash

# Test script to demonstrate HashMap behavior
API="http://localhost:3001/api"

echo "======================================"
echo "  HashMap Behavior Test Script"
echo "======================================"
echo ""

# Clear cache first
echo "1. Clearing cache..."
curl -s -X DELETE "$API/cache" | jq '.'
echo ""

# Add some entries
echo "2. Adding 10 entries to see bucket distribution..."
for i in {1..10}; do
  curl -s -X POST "$API/keys" \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"user:$i\", \"value\": \"User $i data\"}" > /dev/null
  echo "  Added user:$i"
done
echo ""

# Check HashMap stats
echo "3. HashMap Internal Statistics:"
echo "======================================"
curl -s "$API/debug/hashmap" | jq '.data'
echo ""

# Check bucket distribution
echo "4. Bucket Distribution (which keys are in which buckets):"
echo "======================================"
curl -s "$API/debug/cache" | jq '.data.bucketDistribution'
echo ""

# Add more entries to trigger resize
echo "5. Adding 10 more entries (total 20)..."
for i in {11..20}; do
  curl -s -X POST "$API/keys" \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"user:$i\", \"value\": \"User $i data\"}" > /dev/null
  echo "  Added user:$i"
done
echo ""

echo "6. HashMap stats after adding more entries (should see capacity increase):"
echo "======================================"
curl -s "$API/debug/hashmap" | jq '.data'
echo ""

# Test collision scenario
echo "7. Testing collision handling - adding entries that may collide..."
for i in {1..5}; do
  curl -s -X POST "$API/keys" \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"test-collision-key-$i\", \"value\": \"Collision test $i\"}" > /dev/null
  echo "  Added test-collision-key-$i"
done
echo ""

echo "8. Checking collision statistics:"
echo "======================================"
curl -s "$API/debug/hashmap" | jq '.data.hashmap | {size, capacity, loadFactor, maxChainLength, avgChainLength, collisionRate}'
echo ""

# Test LRU behavior
echo "9. Testing LRU eviction - fill cache to max (1000 entries)..."
echo "   Adding entries 1-1000..."
for i in {1..1000}; do
  curl -s -X POST "$API/keys" \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"item:$i\", \"value\": \"Item $i\"}" > /dev/null
  if [ $((i % 100)) -eq 0 ]; then
    echo "  Progress: $i/1000"
  fi
done
echo ""

echo "10. Cache is now full. Stats:"
echo "======================================"
curl -s "$API/stats" | jq '.data'
echo ""

echo "11. HashMap internal state at capacity:"
echo "======================================"
curl -s "$API/debug/hashmap" | jq '.data.hashmap'
echo ""

# Access some old entries to move them in LRU
echo "12. Accessing some entries to update LRU order..."
curl -s "$API/keys/item:1" > /dev/null
curl -s "$API/keys/item:2" > /dev/null
curl -s "$API/keys/item:3" > /dev/null
echo "  Accessed item:1, item:2, item:3"
echo ""

# Add one more to trigger eviction
echo "13. Adding one more entry to trigger LRU eviction..."
curl -s -X POST "$API/keys" \
  -H "Content-Type: application/json" \
  -d '{"key": "trigger-eviction", "value": "This will evict the LRU item"}' > /dev/null
echo ""

echo "14. Stats after eviction:"
echo "======================================"
curl -s "$API/stats" | jq '.data | {size, maxSize, evictions}'
echo ""

# Check LRU order
echo "15. Current LRU order (first 10 and last 10):"
echo "======================================"
echo "Least recently used (will be evicted next):"
curl -s "$API/debug/lru" | jq '.data.lruOrder[0:5]'
echo ""
echo "Most recently used (safe from eviction):"
curl -s "$API/debug/lru" | jq '.data.lruOrder[-5:]'
echo ""

echo "======================================"
echo "  Test Complete!"
echo "======================================"
echo ""
echo "Summary commands you can use:"
echo "  curl $API/debug/hashmap | jq '.data'"
echo "  curl $API/debug/cache | jq '.data.bucketDistribution'"
echo "  curl $API/debug/lru | jq '.data'"
echo "  curl $API/stats | jq '.data'"
