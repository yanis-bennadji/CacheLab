import { createHash } from 'crypto';

interface CacheEntry {
    key: string;
    value: any;
    next: CacheEntry | null;
}

class CacheStore {
    private size: number;
    private buckets: (CacheEntry | null)[];
    private readonly LOAD_FACTOR_THRESHOLD = 0.75;
    private readonly HASH_HEX_LENGTH = 8;

    constructor() {
        this.size = 7;
        this.buckets = new Array(this.size);
        
        for (let i = 0; i < this.size; i++) {
            this.buckets[i] = null;
        }
    }

    // Hash SHA-256 pour distribution optimale et résistance aux collisions
    private _computeHash(key: string): number {
        const hash = createHash('sha256');
        hash.update(key);
        const digest = hash.digest('hex');
        const hexSubstring = digest.substring(0, this.HASH_HEX_LENGTH);
        return parseInt(hexSubstring, 16);
    }

    private _hash(key: string): number {
        return this._computeHash(key) % this.size;
    }

    // Double la taille et redistribue tous les éléments
    private _rehash(): void {
        const oldBuckets = this.buckets;
        const oldSize = this.size;
        
        this.size = this.size * 2;
        this.buckets = new Array(this.size);
        
        for (let i = 0; i < this.size; i++) {
            this.buckets[i] = null;
        }
        
        for (let i = 0; i < oldSize; i++) {
            const bucket = oldBuckets[i];
            if (bucket === null || bucket === undefined) {
                continue;
            }
            
            let current: CacheEntry | null = bucket;
            while (current !== null) {
                const next: CacheEntry | null = current.next;
                current.next = null;
                
                const newIndex = this._hash(current.key);
                const newBucket = this.buckets[newIndex];
                
                if (newBucket === null || newBucket === undefined) {
                    this.buckets[newIndex] = current;
                } else {
                    let tail: CacheEntry | null = newBucket;
                    while (tail !== null && tail.next !== null) {
                        tail = tail.next;
                    }
                    if (tail !== null) {
                        tail.next = current;
                    }
                }
                
                current = next;
            }
        }
    }

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

    public set(key: string, value: any): void {
        const isNewKey = !this._keyExists(key);
        
        // Vérifier le load factor avant d'insérer une nouvelle clé
        if (isNewKey) {
            const currentLoadFactor = this.getLoadFactor();
            if (currentLoadFactor >= this.LOAD_FACTOR_THRESHOLD) {
                this._rehash();
            }
        }

        const index = this._hash(key);

        if (this.buckets[index] === null) {
            this.buckets[index] = { key, value, next: null };
            return;
        }

        const bucket = this.buckets[index];
        if (bucket === null || bucket === undefined) {
            this.buckets[index] = { key, value, next: null };
            return;
        }
        
        let current: CacheEntry | null = bucket;
        
        while (current !== null) {
            if (current.key === key) {
                current.value = value;
                return;
            }

            if (current.next === null) {
                current.next = { key, value, next: null };
                return;
            }

            current = current.next;
        }
    }

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
                    this.buckets[index] = current.next;
                } else {
                    previous.next = current.next;
                }
                return true;
            }
            previous = current;
            current = current.next;
        }
        return false;
    }

    public keys(): string[] {
        const allKeys: string[] = [];

        for (let i = 0; i < this.size; i++) {
            const bucket = this.buckets[i];
            if (bucket === null || bucket === undefined) {
                continue;
            }
            
            let current: CacheEntry | null = bucket;
            
            while (current !== null) {
                allKeys.push(current.key); 
                current = current.next;
            }
        }
        return allKeys;
    }

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

    public getBucketSize(): number {
        return this.size;
    }

    public getLoadFactor(): number {
        return this.count() / this.size;
    }

    public reset(): void {
        this.size = 7;
        this.buckets = new Array(this.size);
        
        for (let i = 0; i < this.size; i++) {
            this.buckets[i] = null;
        }
    }
}

export default new CacheStore();
