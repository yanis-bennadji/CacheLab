# 🚀 HashMap CacheLab - Aide-Mémoire Rapide

## Structure de Base

```typescript
// Nœud de la liste chaînée
CacheEntry {
    key: string
    value: any
    next: CacheEntry | null
    lastAccessed: number     // Pour LRU
    sizeInBytes: number      // Pour gestion RAM
}

// HashMap principale
CacheStore {
    size: number                    // Nombre de buckets (7 → 14 → 28...)
    buckets: CacheEntry[]           // Tableau de listes chaînées
    currentMemoryUsage: number      // RAM utilisée
    MAX_MEMORY: 5MB                 // Limite RAM
    LOAD_FACTOR_THRESHOLD: 0.75    // Seuil rehash
}
```

---

## Fonction de Hachage

```
Clé → SHA-256 → 8 premiers chars → parseInt(hex) → % size → index
```

**Exemple:**
```
"user123" → "a1b2c3d4..." → "a1b2c3d4" → 2712847316 → % 7 → 5
```

---

## Opérations Principales

### SET (key, value)
```
1. Calculer taille de l'entrée
2. SI mémoire insuffisante → Évincer LRU
3. SI load factor > 0.75 → Rehash
4. Calculer index = hash(key) % size
5. Insérer dans bucket[index]
   - Bucket vide → Nouvelle entrée
   - Clé existe → Mettre à jour
   - Sinon → Ajouter à la fin de la chaîne
```

### GET (key)
```
1. index = hash(key) % size
2. Parcourir bucket[index]
3. Si trouvé:
   - Mettre à jour lastAccessed
   - Retourner value
4. Sinon → Retourner null
```

### DELETE (key)
```
1. index = hash(key) % size
2. Parcourir bucket[index]
3. Si trouvé:
   - Soustraire size de currentMemoryUsage
   - Retirer de la chaîne
   - Retourner true
4. Sinon → Retourner false
```

---

## Gestion des Collisions

**Chaînage Séparé:**
```
Bucket[2]: [user1] → [config] → [data] → null
```

Deux clés avec même hash → même bucket → liste chaînée

---

## Rehashing

**Quand ?** Load Factor = count/size > 0.75

**Comment ?**
```
1. oldSize = size
2. size = size × 2
3. Créer nouveau tableau de buckets
4. Pour chaque entrée:
   - Recalculer index avec nouveau size
   - Insérer dans nouveau bucket
```

**Exemple:**
```
6 entrées / 7 buckets = 0.857 > 0.75
→ Rehash: size = 14
→ 6 / 14 = 0.428 < 0.75 ✓
```

---

## LRU (Least Recently Used)

**Principe:** Garder les entrées récemment utilisées

**Tracking:**
- Chaque `get()` → `lastAccessed = Date.now()`
- Chaque `set()` → `lastAccessed = Date.now()`

**Éviction:**
```
1. Parcourir TOUS les buckets
2. Trouver entry avec plus petit lastAccessed
3. delete(entry.key)
4. Répéter si nécessaire pour libérer assez de mémoire
```

---

## Gestion RAM

**Limite:** 5 MB (5,242,880 bytes)

**Estimation taille:**
```
boolean  → 4 bytes
number   → 8 bytes
string   → length × 2 bytes
object   → JSON.stringify(obj).length × 2 bytes
```

**Mécanisme:**
```
AVANT chaque set():
  TANT QUE (currentMemory + newEntrySize > 5MB):
    evictLRU()
```

---

## Complexités

| Opération | Moyenne | Pire |
|-----------|---------|------|
| set()     | O(1)    | O(n) |
| get()     | O(1)    | O(n) |
| delete()  | O(1)    | O(n) |
| rehash()  | O(n)    | O(n) |
| evictLRU()| O(n)    | O(n) |
| keys()    | O(n)    | O(n) |

---

## Endpoints API

### Cache Operations
```bash
GET    /keys           # Lister toutes les clés
POST   /keys           # Créer une clé
GET    /keys/:key      # Lire une clé
PUT    /keys/:key      # Mettre à jour une clé
DELETE /keys/:key      # Supprimer une clé
```

### Debug
```bash
GET  /debug/bucket-size   # Taille du tableau
GET  /debug/load-factor   # Facteur de charge
GET  /debug/count         # Nombre d'entrées
GET  /debug/memory        # Usage mémoire
POST /debug/reset         # Réinitialiser
```

---

## Exemple Complet

```javascript
// 1. Créer 3 entrées
set("alice", {age: 30})   // Bucket[3], lastAccessed: 1000
wait(1s)
set("bob", {age: 25})     // Bucket[3], lastAccessed: 2000 (collision!)
wait(1s)
set("charlie", {age: 35}) // Bucket[5], lastAccessed: 3000

// État: Bucket[3]: alice → bob → null
//       Bucket[5]: charlie → null

// 2. Accéder à alice
get("alice")  // lastAccessed: 4000 (mis à jour!)

// 3. Remplir cache avec grandes données
for i in 1..100:
    set("large_" + i, "x" × 50000)  // 50KB

// 4. Résultat après évictions LRU
get("bob")      → null (évincé, lastAccessed = 2000 était le plus ancien)
get("charlie")  → null (évincé ensuite)
get("alice")    → {age: 30} (toujours là car lastAccessed = 4000)
```

---

## Points à Mentionner

### Forces
✅ O(1) en moyenne  
✅ Gestion automatique RAM  
✅ Éviction intelligente (LRU)  
✅ Scalabilité (rehashing)  
✅ Distribution uniforme (SHA-256)  

### Améliorations Possibles
🔧 LRU O(1) avec doubly-linked list  
🔧 MurmurHash au lieu de SHA-256  
🔧 TTL pour expiration auto  
🔧 Statistiques (hits/misses)  

---

## Commandes Utiles

```bash
# Lancer serveur
npm run dev

# Tests automatiques
./test-cache.sh

# Test manuel
curl http://localhost:3000/keys
curl -X POST http://localhost:3000/keys \
  -H "Content-Type: application/json" \
  -d '{"key": "test", "value": "hello"}'
```

---

## Formules Importantes

```
Load Factor = Nombre d'entrées / Nombre de buckets

Rehash quand: Load Factor > 0.75

Usage mémoire (%) = (currentMemoryBytes / maxMemoryBytes) × 100

Longueur moyenne chaîne = count / size
```

---

## Questions Fréquentes

**Q: Pourquoi SHA-256 ?**  
R: Distribution uniforme + résistance aux collisions intentionnelles

**Q: Pourquoi doubler la taille ?**  
R: Standard pour amortir le coût du rehashing sur O(1) amorti

**Q: Pourquoi LRU et pas FIFO ?**  
R: LRU garde les données fréquemment accédées (meilleur hit rate)

**Q: Que se passe-t-il si une entrée > 5MB ?**  
R: Le cache se vide complètement mais ne peut pas l'insérer

**Q: Chaînage vs Probing linéaire ?**  
R: Chaînage = pas de limite, Probing = meilleure localité cache

---

**📚 Docs complètes:**
- `EXPLICATION_HASHMAP.md` - Guide détaillé
- `PRESENTATION_HASHMAP.md` - Présentation visuelle


