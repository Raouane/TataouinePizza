import { db } from "../db.js";
import { appSettings, type AppSetting } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { BaseStorage } from "./base-storage.js";

/**
 * Storage pour les settings de l'application
 */
export class AppSettingsStorage extends BaseStorage {
  /**
   * Récupère un setting par sa clé
   */
  async getSetting(key: string): Promise<AppSetting | undefined> {
    try {
      this.log('debug', `getSetting - key: ${key}`);
      const result = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
      return result[0];
    } catch (e) {
      this.log('error', 'getSetting error', e);
      return undefined;
    }
  }

  /**
   * Récupère tous les settings
   */
  async getAllSettings(): Promise<AppSetting[]> {
    try {
      this.log('debug', 'getAllSettings');
      return await db.select().from(appSettings);
    } catch (e) {
      this.log('error', 'getAllSettings error', e);
      return [];
    }
  }

  /**
   * Crée ou met à jour un setting
   */
  async upsertSetting(
    key: string,
    value: string,
    description?: string,
    updatedBy?: string
  ): Promise<AppSetting> {
    try {
      this.log('debug', `upsertSetting - key: ${key}, value: ${value}`);
      
      const existing = await this.getSetting(key);
      
      if (existing) {
        // Mise à jour
        const [updated] = await db
          .update(appSettings)
          .set({
            value,
            description: description ?? existing.description,
            updatedBy: updatedBy ?? existing.updatedBy,
            updatedAt: new Date(),
          })
          .where(eq(appSettings.key, key))
          .returning();
        
        return updated;
      } else {
        // Création
        const [created] = await db
          .insert(appSettings)
          .values({
            key,
            value,
            description,
            updatedBy,
          })
          .returning();
        
        return created;
      }
    } catch (e) {
      this.log('error', 'upsertSetting error', e);
      throw e;
    }
  }

  /**
   * Supprime un setting
   */
  async deleteSetting(key: string): Promise<void> {
    try {
      this.log('debug', `deleteSetting - key: ${key}`);
      await db.delete(appSettings).where(eq(appSettings.key, key));
    } catch (e) {
      this.log('error', 'deleteSetting error', e);
      throw e;
    }
  }
}
