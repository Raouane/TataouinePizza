import { db } from "../db.js";
import { idempotencyKeys } from "../../shared/schema.js";
import { eq, sql } from "drizzle-orm";
import { BaseStorage } from "./base-storage.js";

/**
 * Storage pour les clés d'idempotence
 * Gère le stockage et la récupération des clés d'idempotence pour éviter les doubles commandes
 */
export class IdempotencyStorage extends BaseStorage {
  async getIdempotencyKey(key: string): Promise<{ orderId: string; driverId: string; response: any } | undefined> {
    const result = await db.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, key));
    if (!result || !result[0]) {
      return undefined;
    }
    return {
      orderId: result[0].orderId,
      driverId: result[0].driverId,
      response: JSON.parse(result[0].response)
    };
  }

  async createIdempotencyKey(key: string, orderId: string, driverId: string, response: any): Promise<void> {
    await db.insert(idempotencyKeys).values({
      key,
      orderId,
      driverId,
      response: JSON.stringify(response),
      createdAt: new Date()
    });
  }

  async deleteOldIdempotencyKeys(olderThanHours: number = 1): Promise<void> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    await db.delete(idempotencyKeys).where(sql`created_at < ${cutoffTime}`);
  }
}
