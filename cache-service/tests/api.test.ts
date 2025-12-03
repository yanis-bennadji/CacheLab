import request from 'supertest';
import app from '../src/index';

describe('Cache API Integration Tests', () => {
  beforeEach(async () => {
    // Clear cache before each test
    await request(app).delete('/api/cache');
  });

  describe('POST /api/keys', () => {
    test('should create a new cache entry', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({ key: 'test-key', value: 'test-value' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe('test-key');
    });

    test('should create entry with TTL', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({ key: 'test-key', value: 'test-value', ttl: 60 })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    test('should reject request without key', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({ value: 'test-value' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject request without value', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({ key: 'test-key' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/keys/:key', () => {
    test('should get an existing key', async () => {
      // Create entry
      await request(app)
        .post('/api/keys')
        .send({ key: 'test-key', value: 'test-value' });

      // Get entry
      const response = await request(app)
        .get('/api/keys/test-key')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe('test-key');
      expect(response.body.data.value).toBe('test-value');
    });

    test('should return 404 for non-existent key', async () => {
      const response = await request(app)
        .get('/api/keys/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/keys/:key', () => {
    test('should update an existing key value', async () => {
      // Create entry
      await request(app)
        .post('/api/keys')
        .send({ key: 'test-key', value: 'old-value' });

      // Update entry
      const response = await request(app)
        .put('/api/keys/test-key')
        .send({ value: 'new-value' })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify update
      const getResponse = await request(app)
        .get('/api/keys/test-key')
        .expect(200);

      expect(getResponse.body.data.value).toBe('new-value');
    });

    test('should update TTL', async () => {
      // Create entry
      await request(app)
        .post('/api/keys')
        .send({ key: 'test-key', value: 'test-value', ttl: 60 });

      // Update TTL
      const response = await request(app)
        .put('/api/keys/test-key')
        .send({ ttl: 120 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 for non-existent key', async () => {
      const response = await request(app)
        .put('/api/keys/non-existent')
        .send({ value: 'new-value' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/keys/:key', () => {
    test('should delete an existing key', async () => {
      // Create entry
      await request(app)
        .post('/api/keys')
        .send({ key: 'test-key', value: 'test-value' });

      // Delete entry
      const response = await request(app)
        .delete('/api/keys/test-key')
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      await request(app)
        .get('/api/keys/test-key')
        .expect(404);
    });

    test('should return 404 for non-existent key', async () => {
      const response = await request(app)
        .delete('/api/keys/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/keys', () => {
    test('should list all keys', async () => {
      // Create multiple entries
      await request(app)
        .post('/api/keys')
        .send({ key: 'key1', value: 'value1' });

      await request(app)
        .post('/api/keys')
        .send({ key: 'key2', value: 'value2' });

      await request(app)
        .post('/api/keys')
        .send({ key: 'key3', value: 'value3' });

      // List keys
      const response = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.keys).toHaveLength(3);
      expect(response.body.data.keys).toContain('key1');
      expect(response.body.data.keys).toContain('key2');
      expect(response.body.data.keys).toContain('key3');
    });

    test('should return empty list when cache is empty', async () => {
      const response = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.keys).toHaveLength(0);
    });
  });

  describe('GET /api/stats', () => {
    test('should return cache statistics', async () => {
      // Create some entries
      await request(app)
        .post('/api/keys')
        .send({ key: 'key1', value: 'value1' });

      await request(app)
        .post('/api/keys')
        .send({ key: 'key2', value: 'value2' });

      // Get some keys (hits)
      await request(app).get('/api/keys/key1');
      await request(app).get('/api/keys/key2');

      // Try to get non-existent key (miss)
      await request(app).get('/api/keys/non-existent');

      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('hits');
      expect(response.body.data).toHaveProperty('misses');
      expect(response.body.data).toHaveProperty('hitRate');
      expect(response.body.data).toHaveProperty('size');
      expect(response.body.data).toHaveProperty('maxSize');
      expect(response.body.data.hits).toBeGreaterThan(0);
      expect(response.body.data.misses).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/cache', () => {
    test('should clear all cache entries', async () => {
      // Create multiple entries
      await request(app)
        .post('/api/keys')
        .send({ key: 'key1', value: 'value1' });

      await request(app)
        .post('/api/keys')
        .send({ key: 'key2', value: 'value2' });

      // Clear cache
      const response = await request(app)
        .delete('/api/cache')
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify cache is empty
      const listResponse = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(listResponse.body.data.keys).toHaveLength(0);
    });
  });

  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('cache');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-route')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should validate key length', async () => {
      const longKey = 'a'.repeat(300); // Exceeds 256 char limit

      const response = await request(app)
        .post('/api/keys')
        .send({ key: longKey, value: 'value' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Complex Values', () => {
    test('should handle object values', async () => {
      const objectValue = {
        name: 'John',
        age: 30,
        nested: {
          city: 'New York'
        }
      };

      await request(app)
        .post('/api/keys')
        .send({ key: 'user-object', value: objectValue })
        .expect(201);

      const response = await request(app)
        .get('/api/keys/user-object')
        .expect(200);

      expect(response.body.data.value).toEqual(objectValue);
    });

    test('should handle array values', async () => {
      const arrayValue = [1, 2, 3, 4, 5];

      await request(app)
        .post('/api/keys')
        .send({ key: 'numbers', value: arrayValue })
        .expect(201);

      const response = await request(app)
        .get('/api/keys/numbers')
        .expect(200);

      expect(response.body.data.value).toEqual(arrayValue);
    });
  });
});
