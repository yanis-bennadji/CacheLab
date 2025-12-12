# 🎯 HashMap avec Cache LRU - Présentation Rapide

## 📌 Vue d'Ensemble en 30 Secondes

```
HashMap + Gestion Collisions + Rehashing Auto + LRU + Limite RAM (5MB)
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CacheStore                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Buckets Array:                                     │
│  ┌───┐                                              │
│  │ 0 │ → null                                       │
│  ├───┤                                              │
│  │ 1 │ → [user1] → [config] → null                 │
│  ├───┤                                              │
│  │ 2 │ → [data] → null                              │
│  ├───┤                                              │
│  │ 3 │ → null                                       │
│  ├───┤                                              │
│  │...│                                              │
│  └───┘                                              │
│                                                      │
│  Métadonnées:                                       │
│  • size: 7 (nombre de buckets)                      │
│  • currentMemoryUsage: 1234567 bytes                │
│  • MAX_MEMORY: 5MB                                  │
│  • LOAD_FACTOR_THRESHOLD: 0.75                      │
└─────────────────────────────────────────────────────┘
```

---

## 🔑 Les 5 Mécanismes Principaux

### 1️⃣ **Fonction de Hachage (SHA-256)**

```
Clé: "user123"
    ↓ SHA-256
"a1b2c3d4e5f6...7890"
    ↓ Premiers 8 chars
"a1b2c3d4"
    ↓ parseInt(hex)
2712847316
    ↓ Modulo size
2712847316 % 7 = 5
    ↓
Bucket[5]
```

**Pourquoi ?**
- ✅ Distribution uniforme
- ✅ Pas de collisions prévisibles
- ✅ Même clé → même hash

---

### 2️⃣ **Gestion des Collisions (Chaînage)**

```
Hash("user1") % 7 = 2
Hash("config") % 7 = 2  ← COLLISION!

Solution: Liste chaînée

Bucket[2]: [user1] → [config] → null
           ↑         ↑
           premier   deuxième
```

**Avantage :** Pas de limite d'entrées par bucket

---

### 3️⃣ **Rehashing Automatique**

```
Situation:
• 6 entrées dans 7 buckets
• Load Factor = 6/7 = 0.857 > 0.75 ⚠️
• Risque: chaînes trop longues

Action:
1. Doubler la taille: 7 → 14
2. Redistribuer TOUTES les entrées
3. Nouveau Load Factor = 6/14 = 0.428 ✅
```

**Évolution:**
```
7 → 14 → 28 → 56 → 112 → 224 → ...
```

---

### 4️⃣ **Gestion RAM (Limite 5MB)**

```typescript
Avant insertion:
┌─────────────────────────┐
│ Mémoire: 4.8 MB / 5 MB │
└─────────────────────────┘

Nouvelle entrée: 0.5 MB
4.8 + 0.5 = 5.3 MB > 5 MB ❌

→ Déclenche éviction LRU
→ Supprime entrée la plus ancienne (0.3 MB)
→ Nouvelle mémoire: 4.5 MB
→ 4.5 + 0.5 = 5.0 MB ✅
→ Insertion réussie
```

**Estimation taille:**
- `boolean`: 4 bytes
- `number`: 8 bytes
- `string`: length × 2 bytes (UTF-16)
- `object`: JSON.stringify(obj).length × 2

---

### 5️⃣ **LRU (Least Recently Used)**

```
Timeline des accès:

user1  ─────────────────────────○ (accès récent)
user2  ────────○                   (accès moyen)
user3  ──○                         (accès ancien) ← Éviction en premier!

Règle: À chaque GET, mettre à jour lastAccessed
```

**Algorithme d'éviction:**
```
1. Parcourir TOUS les buckets
2. Trouver l'entrée avec le plus ancien lastAccessed
3. La supprimer
4. Mettre à jour currentMemoryUsage
```

---

## ⚡ Complexités

| Opération | Cas Moyen | Cas Pire | Note |
|-----------|-----------|----------|------|
| `set()`   | **O(1)**  | O(n) + éviction | Sans éviction |
| `get()`   | **O(1)**  | O(n) | Dépend de la chaîne |
| `delete()` | **O(1)** | O(n) | Dépend de la chaîne |
| `rehash()` | **O(n)** | O(n) | Redistribution complète |
| `evictLRU()` | **O(n)** | O(n) | Scan complet |

**Note:** SHA-256 rend les chaînes longues très improbables → cas moyen dominant

---

## 🎬 Exemple d'Exécution

### Scénario: Insérer 3 clés puis remplir le cache

```javascript
// État initial
size: 7, count: 0, memory: 0 MB

// 1. Première insertion
set("alice", {age: 30})
→ Hash → Bucket[3]
→ count: 1, memory: 0.001 MB

// 2. Deuxième insertion (même bucket!)
set("bob", {age: 25})
→ Hash → Bucket[3] (collision)
→ Bucket[3]: [alice] → [bob] → null
→ count: 2, memory: 0.002 MB

// 3. Accès à alice
get("alice")
→ Trouve dans Bucket[3]
→ Met à jour lastAccessed = now()
→ Retourne {age: 30}

// 4. Remplir avec grandes données
for i in 1..100:
    set("large_" + i, "x" * 50000)  // 50KB chacun
    
→ Après ~100 entrées:
   - LRU supprime "bob" (plus ancien)
   - "alice" reste (accédé récemment)
   - memory ≈ 5 MB (limite atteinte)
   - count < 100 (évictions)

// 5. Vérifier
get("bob")     → null (évincé)
get("alice")   → {age: 30} (toujours là!)
```

---

## 🔧 Code Simplifié des Opérations

### SET (Insertion)
```typescript
set(key, value):
    // 1. Gestion mémoire
    if (memoryUsage + newSize > MAX):
        evictLRU()
    
    // 2. Rehash si nécessaire
    if (loadFactor > 0.75):
        rehash()
    
    // 3. Calculer bucket
    index = hash(key) % size
    
    // 4. Insérer ou mettre à jour
    if bucket[index] is empty:
        bucket[index] = newEntry
    else:
        traverser chaîne et ajouter/update
```

### GET (Lecture)
```typescript
get(key):
    index = hash(key) % size
    current = buckets[index]
    
    while current:
        if current.key == key:
            current.lastAccessed = now()  // 🕐 LRU
            return current.value
        current = current.next
    
    return null
```

### DELETE (Suppression)
```typescript
delete(key):
    index = hash(key) % size
    current = buckets[index]
    previous = null
    
    while current:
        if current.key == key:
            memoryUsage -= current.size  // 📉 RAM
            
            if previous:
                previous.next = current.next
            else:
                buckets[index] = current.next
            
            return true
        
        previous = current
        current = current.next
    
    return false
```

---

## 📊 Statistiques de Performance

### Distribution Typique (1000 clés, 14 buckets)

```
Bucket  | Nombre d'entrées | Chaîne max
--------|------------------|------------
0       | 68               | ██████
1       | 74               | ███████
2       | 71               | ███████
3       | 69               | ██████
4       | 73               | ███████
...     | ...              | ...
Moyenne | 71.4             | ███████
```

**Observation:** Distribution quasi-uniforme grâce à SHA-256

---

## 💡 Points Clés à Retenir

### ✅ Forces
1. **Performance O(1)** en moyenne pour set/get/delete
2. **Gestion automatique** de la mémoire (5MB max)
3. **Éviction intelligente** via LRU
4. **Scalabilité** via rehashing automatique
5. **Robustesse** avec SHA-256

### ⚠️ Limitations
1. **LRU scan** est O(n) → lent si beaucoup d'entrées
2. **Rehashing** temporairement coûteux
3. **Pas de persistance** (données en RAM uniquement)
4. **Estimation de taille** approximative

### 🚀 Cas d'Usage Idéaux
- Cache d'API avec données fréquemment accédées
- Session storage temporaire
- Cache de configuration
- Données avec patterns d'accès prévisibles

---

## 🎓 Concepts Avancés Utilisés

| Concept | Où ? | Pourquoi ? |
|---------|------|------------|
| **Hash Table** | Structure de base | Accès O(1) |
| **Separate Chaining** | Gestion collisions | Pas de limite |
| **Load Factor** | Déclencheur rehash | Maintenir performance |
| **SHA-256** | Fonction hash | Distribution uniforme |
| **LRU Cache** | Politique éviction | Garder données utiles |
| **Memory Management** | Limite RAM | Éviter OOM |
| **Linked List** | Chaînes buckets | Collisions dynamiques |
| **Dynamic Resizing** | Rehashing | Scalabilité |

---

## 🎯 Améliorations Possibles

### 1. **LRU Optimisé** (O(1) éviction)
```
Utiliser doubly-linked list + HashMap auxiliaire
┌──────┬──────┬──────┐
│ head │  ↔   │ tail │
└──────┴──────┴──────┘
  MRU           LRU
```

### 2. **Hash Plus Rapide**
```
Remplacer SHA-256 par MurmurHash3
Performance: ~10x plus rapide
Distribution: Toujours excellente
```

### 3. **TTL (Time To Live)**
```typescript
interface CacheEntry {
    // ...
    expiresAt: number;  // Timestamp d'expiration
}

// Vérifier à chaque get()
if (Date.now() > entry.expiresAt) {
    delete(key);
    return null;
}
```

### 4. **Statistiques**
```typescript
interface CacheStats {
    hits: number;           // Nombre de get() réussis
    misses: number;         // Nombre de get() ratés
    evictions: number;      // Nombre d'évictions
    rehashes: number;       // Nombre de rehash
    avgChainLength: number; // Longueur moyenne des chaînes
}
```

---

## 📚 Ressources Supplémentaires

- **Fichier:** `src/cache.ts` - Implémentation complète
- **Tests:** `test-cache.sh` - Tests automatisés
- **Documentation:** `EXPLICATION_HASHMAP.md` - Explication détaillée

---

**🎉 Une implémentation professionnelle de HashMap avec toutes les fonctionnalités avancées !**


