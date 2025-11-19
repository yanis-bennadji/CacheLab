/**
 * Valide que la requête POST /keys contient key et value
 */
export function validateCreateKey(req, res, next) {
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
export function validateUpdateKey(req, res, next) {
    const { value } = req.body;
    
    if (value === undefined) {
        res.status(400).json({ error: "Valeur requise" });
        return;
    }
    
    next();
}

