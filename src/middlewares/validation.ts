import type { Request, Response, NextFunction } from 'express';
import type { ErrorResponse } from '../types/api.types.js';

/**
 * Valide que la requête POST /keys contient key et value
 */
export function validateCreateKey(
    req: Request,
    res: Response<ErrorResponse>,
    next: NextFunction
): void {
    const { key, value } = req.body;
    
    if (key === undefined || value === undefined) {
        res.status(400).json({ error: "Clé et valeur requises" });
        return;
    }
    
    next();
}

/**
 * Valide que la requête PUT /keys/:key contient value
 */
export function validateUpdateKey(
    req: Request,
    res: Response<ErrorResponse>,
    next: NextFunction
): void {
    const { value } = req.body;
    
    if (value === undefined) {
        res.status(400).json({ error: "Valeur requise" });
        return;
    }
    
    next();
}

