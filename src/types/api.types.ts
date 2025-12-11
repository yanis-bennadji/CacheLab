// Request body types
export interface CreateKeyRequestBody {
    key: string;
    value: any;
}

export interface UpdateKeyRequestBody {
    value: any;
}

// Request param types
export interface KeyParamRequest {
    key: string;
}

// Response types
export interface KeysResponse {
    keys: string[];
}

export interface CreateKeyResponse {
    message: string;
    key: string;
}

export interface GetKeyResponse {
    key: string;
    value: any;
}

export interface UpdateKeyResponse {
    message: string;
    key: string;
    value: any;
}

export interface DeleteKeyResponse {
    message: string;
}

export interface ErrorResponse {
    error: string;
}

// Debug response types
export interface BucketSizeResponse {
    bucketSize: number;
}

export interface LoadFactorResponse {
    loadFactor: number;
}

export interface CountResponse {
    count: number;
}

export interface ResetResponse {
    message: string;
}

export interface MemoryUsageResponse {
    currentMemoryBytes: number;
    maxMemoryBytes: number;
    usagePercentage: number;
}

// Note: Les types de Request étendu ne sont pas nécessaires avec Express en ESM
// On utilise directement Request dans les controllers avec les génériques

