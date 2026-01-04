import { db } from "../db.js";
import { adminUsers, type AdminUser, type InsertAdminUser } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseStorage } from "./base-storage.js";

/**
 * Storage pour les administrateurs
 * Gère les opérations CRUD pour les utilisateurs admin
 */
export class AdminStorage extends BaseStorage {
  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    const result = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return result[0];
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    const adminId = randomUUID();
    const adminWithId = { ...user, id: adminId };
    
    try {
      await db.insert(adminUsers).values(adminWithId);
    } catch (e) {
      this.log('error', 'Insert admin user failed', e);
      throw e;
    }
    
    try {
      const result = await db.select().from(adminUsers).where(eq(adminUsers.id, adminId));
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error("Select returned empty result");
      }
      return result[0];
    } catch (e) {
      this.log('error', 'Select admin user failed', e);
      throw e;
    }
  }
}
