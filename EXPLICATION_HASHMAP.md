# 📚 Explication Détaillée de l'Implémentation HashMap

## 🏗️ Structure de Données

### Vue d'ensemble
Cette implémentation utilise une **HashMap avec chaînage séparé (Separate Chaining)** pour gérer les collisions.

```
Buckets Array:
[0] → null
[1] → {key: "user1", value: {...}, next: null}
[2] → {key: "config", value: {...}, next: {key: "settings", value: {...}, next: null}}
[3] → null
[4] → {key: "data", value: {...}, next: null}
...
```

### Composants Principaux

#### 1. **CacheEntry** (Nœud de Liste Chaînée)
```typescript
interface CacheEntry {
    key: string;              // Clé de l'entrée
    value: any;               // Valeur associée
    next: CacheEntry | null;  // Pointeur vers le prochain nœud (pour les collisions)
    lastAccessed: number;     // Timestamp pour LRU
    sizeInBytes: number;      // Taille estimée en mémoire
}
```

#### 2. **CacheStore** (Structure Principale)
```typescript
class CacheStore {
    private size: number;                    // Nombre de buckets
    private buckets: (CacheEntry | null)[];  // Tableau de buckets
    private currentMemoryUsage: number;       // Mémoire utilisée
    
    // Constantes
    private readonly LOAD_FACTOR_THRESHOLD = 0.75;  // Seuil de rehash
    private readonly MAX_MEMORY_BYTES = 5MB;        // Limite RAM
}
```

---

## 🔐 Fonction de Hachage

### Étape 1 : Calcul du Hash SHA-256

```typescript
private _computeHash(key: string): number {
    const hash = createHash('sha256');
    hash.update(key);
    const digest = hash.digest('hex');
    const hexSubstring = digest.substring(0, 8);
    return parseInt(hexSubstring, 16);
}
```

**Pourquoi SHA-256 ?**
- ✅ **Distribution uniforme** : Évite les clusters
- ✅ **Résistance aux collisions** : Très peu de clés différentes donnent le même hash
- ✅ **Déterministe** : Même clé = même hash

**Exemple :**
```
Clé: "user123"
↓
SHA-256: "a1b2c3d4e5f6...7890" (64 caractères hex)
↓
Prendre 8 premiers: "a1b2c3d4"
↓
Convertir en nombre: 2712847316
```

### Étape 2 : Calcul de l'Index du Bucket

```typescript
private _hash(key: string): number {
    return this._computeHash(key) % this.size;
}
```

**Exemple avec size = 7 :**
```
Hash: 2712847316
2712847316 % 7 = 5
→ L'entrée va dans le bucket[5]
```

---

## 💥 Gestion des Collisions

### Chaînage Séparé (Separate Chaining)

Quand deux clés ont le même index, on les place dans une **liste chaînée**.

**Exemple de collision :**
```
Clé "user1" → hash % 7 = 2
Clé "config" → hash % 7 = 2  ← Collision !

Bucket[2] → {key: "user1", value: ..., next: →} → {key: "config", value: ..., next: null}
```

### Opérations avec Collisions

#### **Insertion (set)**
```typescript
// Si bucket vide : insertion directe
if (this.buckets[index] === null) {
    this.buckets[index] = { key, value, next: null };
}
// Sinon : parcourir la chaîne
else {
    let current = bucket;
    while (current !== null) {
        // Si clé existe : mise à jour
        if (current.key === key) {
            current.value = value;
            return;
        }
        // Fin de chaîne : ajout à la fin
        if (current.next === null) {
            current.next = { key, value, next: null };
            return;
        }
        current = current.next;
    }
}
```

#### **Recherche (get)**
```typescript
let current = bucket;
while (current !== null) {
    if (current.key === key) {
        return current.value;  // Trouvé !
    }
    current = current.next;    // Continuer la recherche
}
return null;  // Pas trouvé
```

---

## 🔄 Rehashing Automatique

### Pourquoi Rehash ?

Le **Load Factor** mesure le taux de remplissage :
```
Load Factor = Nombre d'entrées / Nombre de buckets
```

**Problème :** Si trop d'entrées dans peu de buckets → chaînes longues → performances dégradées

**Solution :** Quand Load Factor > 0.75, on **double la taille** des buckets

### Processus de Rehashing

```typescript
private _rehash(): void {
    const oldBuckets = this.buckets;
    const oldSize = this.size;
    
    // 1. Doubler la taille
    this.size = this.size * 2;  // 7 → 14 → 28 → 56...
    this.buckets = new Array(this.size);
    
    // 2. Redistribuer TOUTES les entrées
    for (let i = 0; i < oldSize; i++) {
        let current = oldBuckets[i];
        while (current !== null) {
            const next = current.next;
            current.next = null;  // Détacher le nœud
            
            // 3. Recalculer l'index avec la nouvelle taille
            const newIndex = this._hash(current.key);
            
            // 4. Insérer dans le nouveau bucket
            // (même logique que set)
            
            current = next;
        }
    }
}
```

**Exemple :**
```
Avant rehash (size = 7):
[0] → null
[1] → A → B
[2] → C
[3] → null
[4] → D
[5] → null
[6] → E → F

Load Factor = 6/7 = 0.857 > 0.75 ⚠️

Après rehash (size = 14):
[0] → null
[1] → A
[2] → C
[3] → null
[4] → D
[5] → B
[6] → null
...
[11] → E
[12] → F
[13] → null

Load Factor = 6/14 = 0.428 ✅
```

---

## 🧠 Gestion de la RAM avec LRU

### Limite Mémoire : 5 MB

### Estimation de la Taille

```typescript
private _estimateSize(value: any): number {
    const type = typeof value;
    
    if (type === 'boolean')  return 4;
    if (type === 'number')   return 8;
    if (type === 'string')   return value.length * 2;  // UTF-16
    if (type === 'object')   return JSON.stringify(value).length * 2;
    
    return 0;
}
```

### Politique d'Éviction LRU (Least Recently Used)

**Principe :** Supprimer les entrées les **moins récemment utilisées**

#### Tracking des Accès

```typescript
// À chaque GET
public get(key: string): any | null {
    if (found) {
        current.lastAccessed = Date.now();  // ⏰ Mise à jour
        return current.value;
    }
}
```

#### Éviction Automatique

```typescript
private _evictLRU(): void {
    let oldestEntry = null;
    let oldestTime = Date.now();
    
    // 1. Trouver l'entrée la plus ancienne
    for each bucket:
        for each entry in bucket:
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestEntry = entry;
            }
    
    // 2. La supprimer
    if (oldestEntry !== null) {
        this.delete(oldestEntry.key);
    }
}
```

#### Déclenchement de l'Éviction

```typescript
public set(key: string, value: any): void {
    const entrySize = this._estimateSize(key) + this._estimateSize(value);
    
    // Évincer jusqu'à avoir assez d'espace
    while (currentMemoryUsage + entrySize > MAX_MEMORY_BYTES) {
        this._evictLRU();  // 🗑️ Supprimer l'entrée la plus ancienne
    }
    
    // Ensuite insérer la nouvelle entrée
}
```

**Exemple d'éviction :**
```
État actuel: 4.8 MB / 5 MB
Nouvelle entrée: 0.5 MB

4.8 + 0.5 = 5.3 > 5 MB ⚠️

→ Trouver l'entrée avec le plus ancien lastAccessed
→ La supprimer (libère 0.3 MB par exemple)
→ 4.5 + 0.5 = 5.0 MB ✅
→ Insérer la nouvelle entrée
```

---

## ⚡ Complexités Temporelles

### Cas Moyen (bien distribué)

| Opération | Complexité | Explication |
|-----------|-----------|-------------|
| `set()`   | **O(1)**  | Hash + insertion directe dans bucket |
| `get()`   | **O(1)**  | Hash + accès direct au bucket |
| `delete()` | **O(1)** | Hash + suppression dans bucket |
| `keys()`  | **O(n)**  | Parcours de tous les buckets |
| `count()` | **O(n)**  | Parcours de tous les buckets |

### Cas Pire (toutes les clés dans un bucket)

| Opération | Complexité | Explication |
|-----------|-----------|-------------|
| `set()`   | **O(n)**  | Parcourir toute la chaîne |
| `get()`   | **O(n)**  | Parcourir toute la chaîne |
| `delete()` | **O(n)** | Parcourir toute la chaîne |

**Note :** Le rehashing automatique avec SHA-256 rend ce cas très improbable.

### Opérations Spéciales

| Opération | Complexité | Explication |
|-----------|-----------|-------------|
| `_rehash()` | **O(n)** | Redistribuer toutes les entrées |
| `_evictLRU()` | **O(n)** | Parcourir toutes les entrées pour trouver la plus ancienne |

---

## 🎯 Algorithmes Clés

### 1. Insertion avec Gestion Complète

```
ALGORITHME SET(key, value):
    1. Calculer entrySize = taille(key) + taille(value)
    2. Vérifier si clé existe déjà
    
    3. SI clé existe:
        - Soustraire ancienne taille de currentMemoryUsage
    
    4. TANT QUE currentMemoryUsage + entrySize > MAX_MEMORY:
        - Évincer l'entrée LRU
    
    5. SI Load Factor > 0.75:
        - Effectuer rehash()
    
    6. index = hash(key) % size
    
    7. SI bucket[index] est vide:
        - Créer nouvelle entrée
        - Ajouter entrySize à currentMemoryUsage
    
    8. SINON (bucket occupé):
        - Parcourir la chaîne:
            - SI clé trouvée: mettre à jour value
            - SINON: ajouter à la fin de la chaîne
        - Ajouter entrySize à currentMemoryUsage
```

### 2. Recherche avec Mise à Jour LRU

```
ALGORITHME GET(key):
    1. index = hash(key) % size
    2. current = buckets[index]
    
    3. TANT QUE current ≠ null:
        - SI current.key == key:
            * Mettre à jour current.lastAccessed = now()
            * RETOURNER current.value
        - current = current.next
    
    4. RETOURNER null (non trouvé)
```

### 3. Suppression avec Mise à Jour Mémoire

```
ALGORITHME DELETE(key):
    1. index = hash(key) % size
    2. current = buckets[index]
    3. previous = null
    
    4. TANT QUE current ≠ null:
        - SI current.key == key:
            * Soustraire current.sizeInBytes de currentMemoryUsage
            * SI previous == null:
                - buckets[index] = current.next  (supprimer tête)
            * SINON:
                - previous.next = current.next   (supprimer milieu/fin)
            * RETOURNER true
        
        - previous = current
        - current = current.next
    
    5. RETOURNER false (non trouvé)
```

---

## 📊 Exemple Complet d'Exécution

### Scénario : Insertion de 10 clés

```javascript
Initial state:
- size = 7
- buckets = [null, null, null, null, null, null, null]
- count = 0
- loadFactor = 0/7 = 0

// Insertion 1-5
set("user1", {...})  → bucket[3]
set("user2", {...})  → bucket[1]
set("user3", {...})  → bucket[5]
set("user4", {...})  → bucket[2]
set("user5", {...})  → bucket[3] ← collision avec user1

After 5 insertions:
- count = 5
- loadFactor = 5/7 = 0.714 < 0.75 ✅

// Insertion 6
set("user6", {...})  → bucket[4]
- count = 6
- loadFactor = 6/7 = 0.857 > 0.75 ⚠️
- TRIGGER REHASH!

After rehash:
- size = 14 (doubled)
- Toutes les entrées redistribuées
- count = 6
- loadFactor = 6/14 = 0.428 ✅
```

---

## 🎓 Points Techniques Importants

### 1. **Pourquoi Load Factor = 0.75 ?**
- **Compromis optimal** entre espace et performance
- Trop bas (0.5) : Gaspille de l'espace
- Trop haut (0.9) : Trop de collisions
- 0.75 est le standard dans la plupart des implémentations (Java HashMap, etc.)

### 2. **Pourquoi SHA-256 au lieu d'une fonction simple ?**
- **Distribution uniforme** : Évite les patterns prévisibles
- **Sécurité** : Difficile de créer des collisions intentionnelles
- **Robustesse** : Fonctionne bien avec tous types de strings

### 3. **Trade-offs de l'Implémentation**

| Aspect | Avantage | Inconvénient |
|--------|----------|--------------|
| **Chaînage séparé** | Simple, pas de limite d'entrées | Peut créer des chaînes longues |
| **SHA-256** | Excellente distribution | Plus lent que hash simple |
| **LRU complet** | Éviction optimale | Scan O(n) à chaque éviction |
| **Rehash 2x** | Réduction rapide des collisions | Pic temporaire de mémoire |

### 4. **Améliorations Possibles**

1. **LRU optimisé** : Utiliser une doubly-linked list + HashMap pour O(1) éviction
2. **Hash alternatif** : MurmurHash pour meilleur performance
3. **Probing linéaire** : Alternative au chaînage séparé
4. **TTL (Time To Live)** : Expiration automatique des entrées

---

## 🧪 Tests de Validation

### Test 1 : Vérifier la Distribution
```javascript
// Insérer 1000 clés aléatoires
// Compter les entrées par bucket
// Distribution uniforme attendue : ~71 entrées/bucket (1000/14)
```

### Test 2 : Vérifier le Rehashing
```javascript
// Insérer 6 clés avec size initial = 7
// Vérifier: size passe à 14
// Vérifier: loadFactor < 0.75
```

### Test 3 : Vérifier LRU
```javascript
// Remplir cache à 5MB
// Accéder à certaines clés
// Ajouter nouvelle grande entrée
// Vérifier: Les clés non-accédées sont évincées en premier
```

---

## 📝 Résumé

Cette implémentation combine plusieurs concepts avancés :

1. ✅ **HashMap classique** avec chaînage séparé
2. ✅ **Fonction de hachage cryptographique** (SHA-256)
3. ✅ **Rehashing dynamique** pour maintenir les performances
4. ✅ **Gestion de mémoire** avec limite de 5MB
5. ✅ **Politique LRU** pour éviction intelligente

**Résultat :** Un cache performant, robuste et avec protection RAM ! 🚀


