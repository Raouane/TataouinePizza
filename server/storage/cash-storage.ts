import { db } from "../db.js";
import { cashHandovers, type CashHandover } from "../../shared/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { BaseStorage } from "./base-storage.js";

/**
 * Storage pour les remises de caisse
 * Gère les opérations CRUD pour les remises de caisse des livreurs
 */
export class CashStorage extends BaseStorage {
  /**
   * Crée une nouvelle remise de caisse
   */
  async createCashHandover(driverId: string, amount: number, deliveryCount: number, handoverDate: Date): Promise<CashHandover> {
    try {
      const [handover] = await db.insert(cashHandovers)
        .values({
          driverId,
          amount: amount.toString(),
          deliveryCount,
          handoverDate,
          handoverAt: new Date(),
        })
        .returning();
      
      this.log('info', `[STORAGE] Remise de caisse créée: driverId=${driverId}, amount=${amount}, deliveries=${deliveryCount}`);
      return handover;
    } catch (error: any) {
      this.log('error', `[STORAGE] Erreur création remise de caisse:`, error);
      throw error;
    }
  }

  /**
   * Récupère la dernière remise de caisse pour un livreur à une date donnée
   */
  async getLastCashHandover(driverId: string, date: Date): Promise<CashHandover | undefined> {
    try {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      const [handover] = await db.select()
        .from(cashHandovers)
        .where(
          and(
            eq(cashHandovers.driverId, driverId),
            sql`${cashHandovers.handoverDate} >= ${dateStart}`,
            sql`${cashHandovers.handoverDate} <= ${dateEnd}`
          )
        )
        .orderBy(desc(cashHandovers.handoverAt))
        .limit(1);

      return handover;
    } catch (error: any) {
      // Si la table n'existe pas encore, retourner undefined
      if (error?.message?.includes('does not exist') || error?.code === '42P01') {
        this.log('debug', `[STORAGE] Table cash_handovers n'existe pas encore`);
        return undefined;
      }
      this.log('error', `[STORAGE] Erreur récupération dernière remise de caisse:`, error);
      throw error;
    }
  }

  /**
   * Valide une remise de caisse par un admin/gérant
   */
  async validateCashHandover(handoverId: string, adminId: string): Promise<CashHandover> {
    try {
      const [handover] = await db.update(cashHandovers)
        .set({
          validatedBy: adminId,
          validatedAt: new Date(),
        })
        .where(eq(cashHandovers.id, handoverId))
        .returning();

      if (!handover) {
        throw new Error("Cash handover not found");
      }

      this.log('info', `[STORAGE] Remise de caisse validée: handoverId=${handoverId}, adminId=${adminId}`);
      return handover;
    } catch (error: any) {
      this.log('error', `[STORAGE] Erreur validation remise de caisse:`, error);
      throw error;
    }
  }

  /**
   * Vérifie si une remise de caisse a été validée
   */
  async isCashHandoverValidated(handoverId: string): Promise<boolean> {
    try {
      const [handover] = await db.select()
        .from(cashHandovers)
        .where(eq(cashHandovers.id, handoverId))
        .limit(1);

      return handover ? !!handover.validatedAt : false;
    } catch (error: any) {
      // Si la table n'existe pas encore, retourner false
      if (error?.message?.includes('does not exist') || error?.code === '42P01') {
        return false;
      }
      this.log('error', `[STORAGE] Erreur vérification validation remise de caisse:`, error);
      return false;
    }
  }
}
