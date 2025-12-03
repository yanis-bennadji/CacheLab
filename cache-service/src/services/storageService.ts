import axios from 'axios';
import { config } from '../config/config';

/**
 * Service to communicate with the storage service
 */
export class StorageService {
  private baseUrl: string;
  private enabled: boolean;

  constructor() {
    this.baseUrl = config.storageServiceUrl;
    this.enabled = true;
  }

  /**
   * Check if storage service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/health`, {
        timeout: 2000
      });
      return response.data.success === true;
    } catch (error) {
      console.warn('[StorageService] Storage service unavailable');
      return false;
    }
  }

  /**
   * Save a key-value pair to storage
   */
  async save(key: string, value: any): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/data`,
        { key, value },
        { timeout: 5000 }
      );

      return response.data.success === true;
    } catch (error) {
      console.error(`[StorageService] Error saving key "${key}":`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Load a value from storage
   */
  async load(key: string): Promise<any | undefined> {
    if (!this.enabled) return undefined;

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/data/${encodeURIComponent(key)}`,
        { timeout: 5000 }
      );

      if (response.data.success) {
        return response.data.data.value;
      }

      return undefined;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return undefined;
      }
      console.error(`[StorageService] Error loading key "${key}":`, error.message);
      return undefined;
    }
  }

  /**
   * Delete a key from storage
   */
  async delete(key: string): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await axios.delete(
        `${this.baseUrl}/api/data/${encodeURIComponent(key)}`,
        { timeout: 5000 }
      );

      return response.data.success === true;
    } catch (error) {
      console.error(`[StorageService] Error deleting key "${key}":`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Enable storage persistence
   */
  enable(): void {
    this.enabled = true;
    console.log('[StorageService] Enabled');
  }

  /**
   * Disable storage persistence
   */
  disable(): void {
    this.enabled = false;
    console.log('[StorageService] Disabled');
  }

  /**
   * Check if storage is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

export const storageService = new StorageService();
