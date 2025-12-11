#!/bin/bash

# CacheLab Test Script
# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   CacheLab Testing Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 1. Reset cache
echo -e "${YELLOW}1. Resetting cache...${NC}"
curl -X POST "$BASE_URL/debug/reset" -H "Content-Type: application/json"
echo -e "\n"

# 2. Create keys
echo -e "${YELLOW}2. Creating test keys...${NC}"
echo -e "${GREEN}Creating key: user1${NC}"
curl -X POST "$BASE_URL/keys" \
  -H "Content-Type: application/json" \
  -d '{"key": "user1", "value": {"name": "Alice", "age": 30}}'
echo -e "\n"

echo -e "${GREEN}Creating key: user2${NC}"
curl -X POST "$BASE_URL/keys" \
  -H "Content-Type: application/json" \
  -d '{"key": "user2", "value": {"name": "Bob", "age": 25}}'
echo -e "\n"

echo -e "${GREEN}Creating key: config${NC}"
curl -X POST "$BASE_URL/keys" \
  -H "Content-Type: application/json" \
  -d '{"key": "config", "value": {"theme": "dark", "language": "fr"}}'
echo -e "\n"

# 3. List all keys
echo -e "${YELLOW}3. Listing all keys...${NC}"
curl -X GET "$BASE_URL/keys"
echo -e "\n\n"

# 4. Get specific key
echo -e "${YELLOW}4. Getting key 'user1'...${NC}"
curl -X GET "$BASE_URL/keys/user1"
echo -e "\n\n"

# 5. Update key
echo -e "${YELLOW}5. Updating key 'user1'...${NC}"
curl -X PUT "$BASE_URL/keys/user1" \
  -H "Content-Type: application/json" \
  -d '{"value": {"name": "Alice Smith", "age": 31}}'
echo -e "\n\n"

# 6. Get updated key
echo -e "${YELLOW}6. Getting updated key 'user1'...${NC}"
curl -X GET "$BASE_URL/keys/user1"
echo -e "\n\n"

# 7. Debug endpoints
echo -e "${YELLOW}7. Testing debug endpoints...${NC}"
echo -e "${GREEN}Bucket size:${NC}"
curl -X GET "$BASE_URL/debug/bucket-size"
echo -e "\n"

echo -e "${GREEN}Load factor:${NC}"
curl -X GET "$BASE_URL/debug/load-factor"
echo -e "\n"

echo -e "${GREEN}Entry count:${NC}"
curl -X GET "$BASE_URL/debug/count"
echo -e "\n"

echo -e "${GREEN}Memory usage:${NC}"
curl -X GET "$BASE_URL/debug/memory"
echo -e "\n\n"

# 8. Test memory limit with large data
echo -e "${YELLOW}8. Testing RAM limit with large strings...${NC}"
echo -e "${GREEN}Creating large entries to trigger LRU eviction...${NC}"
for i in {1..100}
do
  # Create entries with large string values (each ~50KB)
  large_string=$(printf 'x%.0s' {1..50000})
  curl -X POST "$BASE_URL/keys" \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"large_$i\", \"value\": \"$large_string\"}" \
    -s > /dev/null
  
  if [ $((i % 10)) -eq 0 ]; then
    echo -e "Created $i entries..."
  fi
done
echo -e "\n"

echo -e "${GREEN}Memory usage after large inserts:${NC}"
curl -X GET "$BASE_URL/debug/memory"
echo -e "\n"

echo -e "${GREEN}Entry count after eviction:${NC}"
curl -X GET "$BASE_URL/debug/count"
echo -e "\n"

echo -e "${GREEN}Remaining keys:${NC}"
curl -X GET "$BASE_URL/keys"
echo -e "\n\n"

# 9. Delete a key
echo -e "${YELLOW}9. Deleting key 'user2'...${NC}"
curl -X DELETE "$BASE_URL/keys/user2"
echo -e "\n\n"

# 10. Try to get deleted key (should return 404)
echo -e "${YELLOW}10. Trying to get deleted key 'user2' (should fail)...${NC}"
curl -X GET "$BASE_URL/keys/user2"
echo -e "\n\n"

# 11. Final stats
echo -e "${YELLOW}11. Final cache statistics...${NC}"
echo -e "${GREEN}Bucket size:${NC}"
curl -X GET "$BASE_URL/debug/bucket-size"
echo -e "\n"

echo -e "${GREEN}Load factor:${NC}"
curl -X GET "$BASE_URL/debug/load-factor"
echo -e "\n"

echo -e "${GREEN}Entry count:${NC}"
curl -X GET "$BASE_URL/debug/count"
echo -e "\n"

echo -e "${GREEN}Memory usage:${NC}"
curl -X GET "$BASE_URL/debug/memory"
echo -e "\n"

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}   Testing Complete!${NC}"
echo -e "${BLUE}========================================${NC}"

