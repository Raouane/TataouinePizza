import { db } from "../db.js";
import { telegramMessages } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { BaseStorage } from "./base-storage.js";

/**
 * Storage pour les messages Telegram
 * Gère le stockage et la récupération des messages Telegram envoyés aux livreurs
 */
export class TelegramStorage extends BaseStorage {
  async saveTelegramMessage(
    orderId: string,
    driverId: string,
    chatId: string,
    messageId: number,
    status: string = "sent",
    scheduledDeletionAt?: Date | null
  ): Promise<void> {
    try {
      await db.insert(telegramMessages).values({
        orderId,
        driverId,
        chatId,
        messageId,
        status,
        scheduledDeletionAt: scheduledDeletionAt || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      this.log('debug', `[STORAGE] Telegram message sauvegardé: orderId=${orderId}, driverId=${driverId}, messageId=${messageId}, scheduledDeletionAt=${scheduledDeletionAt ? scheduledDeletionAt.toISOString() : 'null'}`);
    } catch (error: any) {
      this.log('error', `[STORAGE] Erreur sauvegarde Telegram message:`, error);
      throw error;
    }
  }

  async getTelegramMessagesByOrderId(orderId: string): Promise<Array<{
    id: string;
    orderId: string;
    driverId: string;
    chatId: string;
    messageId: number;
    status: string;
    scheduledDeletionAt: Date | null;
  }>> {
    try {
      const result = await db.select().from(telegramMessages).where(eq(telegramMessages.orderId, orderId));
      return result.map(msg => ({
        id: msg.id,
        orderId: msg.orderId,
        driverId: msg.driverId,
        chatId: msg.chatId,
        messageId: msg.messageId,
        status: msg.status || "sent",
        scheduledDeletionAt: msg.scheduledDeletionAt,
      }));
    } catch (error: any) {
      this.log('error', `[STORAGE] Erreur récupération Telegram messages:`, error);
      return [];
    }
  }

  async getTelegramMessageByOrderAndDriver(orderId: string, driverId: string): Promise<{
    id: string;
    orderId: string;
    driverId: string;
    chatId: string;
    messageId: number;
    status: string;
  } | null> {
    try {
      const result = await db.select()
        .from(telegramMessages)
        .where(and(
          eq(telegramMessages.orderId, orderId),
          eq(telegramMessages.driverId, driverId)
        ))
        .limit(1);
      
      if (result.length === 0) {
        return null;
      }
      
      const msg = result[0];
      return {
        id: msg.id,
        orderId: msg.orderId,
        driverId: msg.driverId,
        chatId: msg.chatId,
        messageId: msg.messageId,
        status: msg.status || "sent",
      };
    } catch (error: any) {
      this.log('error', `[STORAGE] Erreur récupération Telegram message:`, error);
      return null;
    }
  }

  /**
   * Récupère tous les messages Telegram pour une commande et un livreur spécifiques
   * Utilisé pour identifier les duplicatas
   */
  async getTelegramMessagesByOrderIdAndDriver(orderId: string, driverId: string): Promise<Array<{
    id: string;
    orderId: string;
    driverId: string;
    chatId: string;
    messageId: number;
    status: string;
    scheduledDeletionAt: Date | null;
  }>> {
    try {
      const result = await db.select()
        .from(telegramMessages)
        .where(and(
          eq(telegramMessages.orderId, orderId),
          eq(telegramMessages.driverId, driverId)
        ))
        .orderBy(telegramMessages.createdAt);
      
      return result.map(msg => ({
        id: msg.id,
        orderId: msg.orderId,
        driverId: msg.driverId,
        chatId: msg.chatId,
        messageId: msg.messageId,
        status: msg.status || "sent",
        scheduledDeletionAt: msg.scheduledDeletionAt,
      }));
    } catch (error: any) {
      this.log('error', `[STORAGE] Erreur récupération Telegram messages:`, error);
      return [];
    }
  }

  /**
   * Récupère tous les messages Telegram programmés pour suppression (scheduled_deletion_at <= NOW())
   * Utilisé par le job périodique de nettoyage
   */
  async getTelegramMessagesScheduledForDeletion(): Promise<Array<{
    id: string;
    orderId: string;
    driverId: string;
    chatId: string;
    messageId: number;
    status: string;
    scheduledDeletionAt: Date;
  }>> {
    try {
      const { sql } = await import("drizzle-orm");
      const result = await db.execute(sql`
        SELECT id, order_id, driver_id, chat_id, message_id, status, scheduled_deletion_at
        FROM telegram_messages
        WHERE scheduled_deletion_at IS NOT NULL
          AND scheduled_deletion_at <= NOW()
          AND status != 'deleted'
        ORDER BY scheduled_deletion_at ASC
      `);
      
      return (result.rows || []).map((row: any) => ({
        id: row.id,
        orderId: row.order_id,
        driverId: row.driver_id,
        chatId: row.chat_id,
        messageId: row.message_id,
        status: row.status || "sent",
        scheduledDeletionAt: new Date(row.scheduled_deletion_at),
      }));
    } catch (error: any) {
      this.log('error', `[STORAGE] Erreur récupération messages programmés pour suppression:`, error);
      return [];
    }
  }

  async updateTelegramMessageStatus(
    orderId: string,
    driverId: string,
    newStatus: string
  ): Promise<void> {
    try {
      await db.update(telegramMessages)
        .set({ 
          status: newStatus,
          updatedAt: new Date()
        })
        .where(and(
          eq(telegramMessages.orderId, orderId),
          eq(telegramMessages.driverId, driverId)
        ));
      this.log('debug', `[STORAGE] Telegram message mis à jour: orderId=${orderId}, driverId=${driverId}, status=${newStatus}`);
    } catch (error: any) {
      this.log('error', `[STORAGE] Erreur mise à jour Telegram message:`, error);
      throw error;
    }
  }

  /**
   * Marque un message Telegram comme supprimé (met le statut à "deleted")
   * @param messageId ID du message Telegram dans la DB
   */
  async markTelegramMessageAsDeleted(messageId: string): Promise<void> {
    try {
      await db.update(telegramMessages)
        .set({ 
          status: "deleted",
          updatedAt: new Date()
        })
        .where(eq(telegramMessages.id, messageId));
      this.log('debug', `[STORAGE] Telegram message marqué comme supprimé: messageId=${messageId}`);
    } catch (error: any) {
      this.log('error', `[STORAGE] Erreur marquage Telegram message comme supprimé:`, error);
      throw error;
    }
  }
}
