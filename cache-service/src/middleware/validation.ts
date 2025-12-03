import { Request, Response, NextFunction } from 'express';
import { isValidKey, isValidValueSize } from '../../../shared/utils/helpers';
import { ValidationError } from '../../../shared/types';

const MAX_KEY_LENGTH = 256;
const MAX_VALUE_SIZE = 1048576; // 1MB

/**
 * Validate cache key in request parameters
 */
export function validateKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.params.key || req.body.key;

  if (!key) {
    res.status(400).json({
      success: false,
      error: 'Key is required'
    });
    return;
  }

  if (!isValidKey(key, MAX_KEY_LENGTH)) {
    res.status(400).json({
      success: false,
      error: `Key must be a non-empty string with maximum length of ${MAX_KEY_LENGTH} characters`
    });
    return;
  }

  next();
}

/**
 * Validate cache entry data in request body
 */
export function validateCacheEntry(req: Request, res: Response, next: NextFunction): void {
  const { key, value, ttl } = req.body;

  const errors: ValidationError[] = [];

  // Validate key
  if (!key) {
    errors.push({ field: 'key', message: 'Key is required' });
  } else if (!isValidKey(key, MAX_KEY_LENGTH)) {
    errors.push({
      field: 'key',
      message: `Key must be a non-empty string with maximum length of ${MAX_KEY_LENGTH} characters`
    });
  }

  // Validate value
  if (value === undefined || value === null) {
    errors.push({ field: 'value', message: 'Value is required' });
  } else if (!isValidValueSize(value, MAX_VALUE_SIZE)) {
    errors.push({
      field: 'value',
      message: `Value size exceeds maximum allowed size of ${MAX_VALUE_SIZE} bytes`
    });
  }

  // Validate TTL (optional)
  if (ttl !== undefined) {
    if (typeof ttl !== 'number' || ttl < 0) {
      errors.push({ field: 'ttl', message: 'TTL must be a non-negative number' });
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors
    });
    return;
  }

  next();
}

/**
 * Validate update request
 */
export function validateUpdate(req: Request, res: Response, next: NextFunction): void {
  const { value, ttl } = req.body;

  const errors: ValidationError[] = [];

  // At least one field must be present
  if (value === undefined && ttl === undefined) {
    errors.push({ field: 'body', message: 'At least one of value or ttl must be provided' });
  }

  // Validate value if present
  if (value !== undefined && !isValidValueSize(value, MAX_VALUE_SIZE)) {
    errors.push({
      field: 'value',
      message: `Value size exceeds maximum allowed size of ${MAX_VALUE_SIZE} bytes`
    });
  }

  // Validate TTL if present
  if (ttl !== undefined) {
    if (typeof ttl !== 'number' || ttl < 0) {
      errors.push({ field: 'ttl', message: 'TTL must be a non-negative number' });
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors
    });
    return;
  }

  next();
}
