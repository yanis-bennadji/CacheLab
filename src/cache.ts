import { createHash } from 'crypto';

// Définition de la forme de nos "noeuds" (les maillons de la chaîne)
interface CacheEntry {
    key: string;
    value: any;       // On accepte n'importe quel type de valeur
    next: CacheEntry | null; // Le "pointeur" vers le suivant
}

class CacheStore {
    private size: number;
    private buckets: (CacheEntry | null)[]; // Un tableau contenant soit un Entry, soit null
    private readonly LOAD_FACTOR_THRESHOLD = 0.75; // Seuil de load factor pour déclencher le rehashing
    private readonly HASH_HEX_LENGTH = 8; // Nombre de caractères hexadécimaux utilisés (max 64 pour SHA-256)

    constructor() {
        this.size = 7; // Taille initiale (nombre premier)
        this.buckets = new Array(this.size);

        // Initialisation manuelle à null (pas de .fill())
        for (let i = 0; i < this.size; i++) {
            this.buckets[i] = null;
        }
    }

    // Calcule le hash avec crypto SHA-256 (distribution cryptographiquement sûre)
    // Avantages: distribution parfaite, résistant aux collisions intentionnelles
    private _computeHash(key: string): number {
        // Créer un hash SHA-256 de la clé
        const hash = createHash('sha256');
        hash.update(key);
        const digest = hash.digest('hex'); // Retourne 64 caractères hexadécimaux
        
        // Prendre les N premiers caractères hexadécimaux (configurable via HASH_HEX_LENGTH)
        // Plus on prend de caractères, meilleure est la distribution
        const hexSubstring = digest.substring(0, this.HASH_HEX_LENGTH);
        
        // Convertir en nombre (base 16)
        const hashNumber = parseInt(hexSubstring, 16);
        
        return hashNumber;
    }

    // Utilise le hash slicé pour obtenir l'index du bucket
    private _hash(key: string): number {
        const slicedHash = this._computeHash(key);
        return slicedHash % this.size;
    }

    // Rehashing: double la taille des buckets mais garde le même slice
    private _rehash(): void {
        const oldBuckets = this.buckets;
        const oldSize = this.size;
        
        // Double la taille des buckets
        this.size = this.size * 2;
        this.buckets = new Array(this.size);
        
        // Initialisation manuelle à null
        for (let i = 0; i < this.size; i++) {
            this.buckets[i] = null;
        }
        
        // Redistribue toutes les entrées avec le nouveau nombre de buckets
        // Le slice reste le même, seule la position des buckets change
        for (let i = 0; i < oldSize; i++) {
            const bucket = oldBuckets[i];
            if (bucket === null || bucket === undefined) {
                continue;
            }
            
            let current: CacheEntry | null = bucket;
            while (current !== null) {
                const next: CacheEntry | null = current.next; // Sauvegarder le suivant avant de déplacer
                current.next = null; // Réinitialiser le pointeur
                
                // Recalculer l'index avec la nouvelle taille (même slice, nouveau modulo)
                const newIndex = this._hash(current.key);
                
                // Insérer dans le nouveau bucket
                const newBucket = this.buckets[newIndex];
                if (newBucket === null || newBucket === undefined) {
                    this.buckets[newIndex] = current;
                } else {
                    // Trouver la fin de la chaîne
                    let tail: CacheEntry | null = newBucket;
                    while (tail !== null && tail.next !== null) {
                        tail = tail.next;
                    }
                    if (tail !== null) {
                        tail.next = current;
                    }
                }
                
                current = next; // Passer à l'élément suivant de l'ancien bucket
            }
        }
    }

    // Vérifie si une clé existe déjà (pour distinguer création vs mise à jour)
    private _keyExists(key: string): boolean {
        const index = this._hash(key);
        const bucket = this.buckets[index];
        if (bucket === null || bucket === undefined) {
            return false;
        }
        
        let current: CacheEntry | null = bucket;
        while (current !== null) {
            if (current.key === key) {
                return true;
            }
            current = current.next;
        }
        return false;
    }

    // CREATE / UPDATE
    public set(key: string, value: any): void {
        // Vérifier si c'est une nouvelle insertion (pas une mise à jour)
        const isNewKey = !this._keyExists(key);
        
        // Si c'est une nouvelle insertion, vérifier le load factor avant d'ajouter
        if (isNewKey) {
            const currentLoadFactor = this.getLoadFactor();
            if (currentLoadFactor >= this.LOAD_FACTOR_THRESHOLD) {
                // Le load factor dépasse le seuil, on fait un rehashing
                this._rehash();
            }
        }

        const index = this._hash(key);

        // Cas 1: Le bucket est vide
        if (this.buckets[index] === null) {
            this.buckets[index] = { key, value, next: null };
            return;
        }

        // Cas 2: Collision -> On parcourt la liste chaînée
        const bucket = this.buckets[index];
        if (bucket === null || bucket === undefined) {
            this.buckets[index] = { key, value, next: null };
            return;
        }
        
        let current: CacheEntry | null = bucket;
        
        // TypeScript sait que 'current' peut être null, donc on vérifie
        while (current !== null) {
            if (current.key === key) {
                current.value = value; // Mise à jour
                return;
            }

            // Si on est au bout de la chaîne, on ajoute
            if (current.next === null) {
                current.next = { key, value, next: null };
                return;
            }

            current = current.next; // On avance le pointeur
        }
    }

    // READ
    public get(key: string): any | null {
        const index = this._hash(key);
        const bucket = this.buckets[index];
        if (bucket === null || bucket === undefined) {
            return null;
        }
        
        let current: CacheEntry | null = bucket;

        while (current !== null) {
            if (current.key === key) {
                return current.value;
            }
            current = current.next;
        }
        return null;
    }

    // DELETE
    public delete(key: string): boolean {
        const index = this._hash(key);
        const bucket = this.buckets[index];
        if (bucket === null || bucket === undefined) {
            return false;
        }
        
        let current: CacheEntry | null = bucket;
        let previous: CacheEntry | null = null;

        while (current !== null) {
            if (current.key === key) {
                if (previous === null) {
                    // C'était le premier élément du bucket
                    this.buckets[index] = current.next;
                } else {
                    // On "saute" l'élément courant
                    previous.next = current.next;
                }
                return true;
            }
            previous = current;
            current = current.next;
        }
        return false;
    }

    // LIST ALL KEYS (Le fameux GET /keys sans map/filter)
    public keys(): string[] {
        const allKeys: string[] = [];
        let count = 0; // Pour gérer l'index du tableau allKeys manuellement si on veut être puriste

        // 1. On parcourt tous les buckets du tableau principal
        for (let i = 0; i < this.size; i++) {
            const bucket = this.buckets[i];
            if (bucket === null || bucket === undefined) {
                continue;
            }
            
            let current: CacheEntry | null = bucket;
            
            // 2. Pour chaque bucket, on parcourt la liste chaînée
            while (current !== null) {
                // On pousse dans le tableau (push est généralement autorisé car c'est une mutation,
                // mais si 'push' est interdit, faites: allKeys[count] = current.key; count++;)
                allKeys.push(current.key); 
                current = current.next;
            }
        }
        return allKeys;
    }

    // Compte le nombre total d'éléments (clés) dans le cache
    public count(): number {
        let totalCount = 0;

        for (let i = 0; i < this.size; i++) {
            const bucket = this.buckets[i];
            if (bucket === null || bucket === undefined) {
                continue;
            }
            
            let current: CacheEntry | null = bucket;
            while (current !== null) {
                totalCount++;
                current = current.next;
            }
        }
        return totalCount;
    }

    // Retourne la taille actuelle des buckets
    public getBucketSize(): number {
        return this.size;
    }

    // Calcule le load factor (nombre d'éléments / nombre de buckets)
    public getLoadFactor(): number {
        const elementCount = this.count();
        return elementCount / this.size;
    }

    // Reset complet du cache (pour les tests)
    public reset(): void {
        this.size = 7; // Retour à la taille initiale
        this.buckets = new Array(this.size);
        
        // Initialisation manuelle à null
        for (let i = 0; i < this.size; i++) {
            this.buckets[i] = null;
        }
    }
}

export default new CacheStore();