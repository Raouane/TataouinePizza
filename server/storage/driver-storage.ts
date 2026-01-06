import { db } from "../db.js";
import { drivers, orders, type Driver, type InsertDriver, type Order } from "../../shared/schema.js";
import { eq, sql, or, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseStorage } from "./base-storage.js";

/**
 * Storage pour les livreurs (drivers)
 * Gère les opérations CRUD pour les livreurs et l'assignation de commandes
 */
export class DriverStorage extends BaseStorage {
  async getDriverByPhone(phone: string): Promise<Driver | undefined> {
    const result = await db.select().from(drivers).where(eq(drivers.phone, phone));
    return result[0];
  }

  async createDriver(driver: InsertDriver): Promise<Driver> {
    const driverId = randomUUID();
    const driverWithId = { ...driver, id: driverId };
    await db.insert(drivers).values(driverWithId);
    const result = await db.select().from(drivers).where(eq(drivers.id, driverId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created driver");
    }
    return result[0];
  }

  async getDriverById(id: string): Promise<Driver | undefined> {
    const result = await db.select().from(drivers).where(eq(drivers.id, id));
    return result[0];
  }

  async getAllDrivers(): Promise<Driver[]> {
    const result = await db.select().from(drivers);
    return Array.isArray(result) ? result : [];
  }

  async getAvailableDrivers(): Promise<Driver[]> {
    const result = await db
      .select()
      .from(drivers)
      .where(
        sql`status = 'available' AND last_seen > NOW() - INTERVAL '5 minutes'`
      );
    return Array.isArray(result) ? result : [];
  }

  async getOrdersByDriver(driverId: string): Promise<Order[]> {
    try {
      return await db.select().from(orders).where(eq(orders.driverId, driverId));
    } catch (error: any) {
      // ✅ NOUVEAU : Gérer le cas où la colonne ignored_by n'existe pas encore
      if (error?.message?.includes('ignored_by') || error?.message?.includes('column') || error?.code === '42703') {
        this.log('error', `[STORAGE] ⚠️ Colonne ignored_by manquante, utilisation SELECT SQL brut`);
        try {
          const result = await db.execute(sql`
            SELECT id, restaurant_id, customer_name, phone, address, address_details, 
                   customer_lat, customer_lng, client_order_id, status, total_price, 
                   payment_method, notes, estimated_delivery_time, driver_id, assigned_at, 
                   created_at, updated_at
            FROM orders 
            WHERE driver_id = ${driverId}
            ORDER BY created_at DESC
          `);
          if (result.rows && result.rows.length > 0) {
            return result.rows.map((row: any) => ({
              ...row,
              restaurantId: row.restaurant_id,
              customerName: row.customer_name,
              addressDetails: row.address_details,
              customerLat: row.customer_lat,
              customerLng: row.customer_lng,
              clientOrderId: row.client_order_id,
              totalPrice: row.total_price,
              paymentMethod: row.payment_method,
              estimatedDeliveryTime: row.estimated_delivery_time,
              driverId: row.driver_id,
              assignedAt: row.assigned_at,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              ignoredBy: undefined
            })) as Order[];
          }
          return [];
        } catch (fallbackError: any) {
          this.log('error', `[STORAGE] Erreur SELECT explicite (fallback):`, fallbackError);
          return [];
        }
      }
      throw error;
    }
  }

  async updateDriverStatus(id: string, status: string): Promise<Driver> {
    await db.update(drivers).set({ status, updatedAt: new Date() }).where(eq(drivers.id, id));
    const result = await db.select().from(drivers).where(eq(drivers.id, id));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve updated driver");
    }
    return result[0];
  }

  async updateDriver(id: string, data: Partial<Driver>): Promise<Driver> {
    await db.update(drivers).set({ ...data, updatedAt: new Date() }).where(eq(drivers.id, id));
    const result = await db.select().from(drivers).where(eq(drivers.id, id));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve updated driver");
    }
    return result[0];
  }

  async deleteDriver(id: string): Promise<void> {
    await db.delete(drivers).where(eq(drivers.id, id));
  }

  async assignOrderToDriver(orderId: string, driverId: string): Promise<Order> {
    // Atomic update: only assign if not already assigned
    const result = await db.update(orders)
      .set({ 
        driverId, 
        assignedAt: sql`NOW()`,
        updatedAt: new Date() 
      })
      .where(
        sql`id = ${orderId} AND (driver_id IS NULL OR driver_id = '')`
      )
      .returning();
    
    if (!result || !result[0]) {
      // Order might already be assigned, fetch it to check
      const existing = await db.select().from(orders).where(eq(orders.id, orderId));
      if (existing[0] && existing[0].driverId && existing[0].driverId !== driverId) {
        throw new Error("Order already assigned to another driver");
      }
      throw new Error("Failed to assign order to driver");
    }
    
    return result[0];
  }

  // Atomic driver acceptance - prevents race condition
  // Uses .returning() to ensure atomicity: UPDATE returns the row only if it was actually updated
  async acceptOrderByDriver(orderId: string, driverId: string): Promise<Order | null> {
    try {
      console.log(`\n[ACCEPT ORDER] 🎯 ========================================`);
      console.log(`[ACCEPT ORDER] 🎯 ACCEPTATION COMMANDE PAR LIVREUR`);
      console.log(`[ACCEPT ORDER]    Order ID: ${orderId}`);
      console.log(`[ACCEPT ORDER]    Driver ID: ${driverId}`);
      
      // Vérifier le statut actuel AVANT la mise à jour
      const currentOrder = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (currentOrder[0]) {
        console.log(`[ACCEPT ORDER]    Statut AVANT acceptation: ${currentOrder[0].status}`);
        console.log(`[ACCEPT ORDER]    Driver ID AVANT: ${currentOrder[0].driverId || 'NULL'}`);
      } else {
        console.log(`[ACCEPT ORDER] ⚠️ Commande non trouvée dans la DB`);
      }
      
      // ✅ SIMPLIFICATION : Quand le livreur accepte, passer directement à "delivery"
      // Accept if order is received, accepted or ready AND not assigned to anyone
      // Le statut passe directement à "delivery" (en livraison)
      console.log(`[ACCEPT ORDER]    Tentative de mise à jour vers statut: "delivery"`);
      
      const result = await db.update(orders)
        .set({ 
          driverId,
          status: "delivery", // ✅ Passer directement à "delivery"
          updatedAt: new Date() 
        })
        .where(
          sql`id = ${orderId} AND status IN ('received', 'accepted', 'ready') AND (driver_id IS NULL OR driver_id = '')`
        )
        .returning();
      
      // If result is empty, the WHERE conditions were not met (order already assigned or wrong status)
      if (!result || result.length === 0) {
        console.log(`[ACCEPT ORDER] ❌ Échec: conditions WHERE non remplies`);
        console.log(`[ACCEPT ORDER]    La commande est peut-être déjà assignée ou le statut est invalide`);
        console.log(`[ACCEPT ORDER] ========================================\n`);
        return null;
      }
      
      console.log(`[ACCEPT ORDER] ✅ Statut APRÈS acceptation: ${result[0].status}`);
      console.log(`[ACCEPT ORDER] ✅ Driver ID APRÈS: ${result[0].driverId}`);
      console.log(`[ACCEPT ORDER]    ⚠️ Vérification: le statut devrait être "delivery"`);
      
      if (result[0].status !== 'delivery') {
        console.error(`[ACCEPT ORDER] ⚠️⚠️⚠️ ERREUR: Le statut n'est pas "delivery" !`);
        console.error(`[ACCEPT ORDER]    Statut obtenu: ${result[0].status}`);
        console.error(`[ACCEPT ORDER]    Statut attendu: "delivery"`);
      }
      
      console.log(`[ACCEPT ORDER] ========================================\n`);
      
      // ✅ NOUVEAU : Mettre à jour le message Telegram pour afficher "EN COURS DE LIVRAISON"
      import("../services/telegram-message-updater.js").then(({ updateTelegramMessageToDelivery }) => {
        updateTelegramMessageToDelivery(orderId, driverId).catch((error) => {
          console.error(`[Storage] ❌ Erreur mise à jour Telegram (accept, non-bloquant):`, error);
        });
      }).catch((error) => {
        console.error(`[Storage] ⚠️ Erreur import telegram-message-updater (non-bloquant):`, error);
      });
      
      // The UPDATE succeeded, return the updated order
      return result[0];
    } catch (error: any) {
      // ✅ NOUVEAU : Gérer le cas où la colonne ignored_by n'existe pas encore
      if (error?.message?.includes('ignored_by') || error?.message?.includes('column') || error?.code === '42703') {
        this.log('error', `[STORAGE] ⚠️ Colonne ignored_by manquante, utilisation UPDATE SQL brut`);
        try {
          // UPDATE SQL brut sans ignored_by
          const updateResult = await db.execute(sql`
            UPDATE orders 
            SET driver_id = ${driverId},
                status = 'delivery',
                updated_at = NOW()
            WHERE id = ${orderId}
              AND status IN ('received', 'accepted', 'ready')
              AND (driver_id IS NULL OR driver_id = '')
            RETURNING id, restaurant_id, customer_name, phone, address, address_details,
                      customer_lat, customer_lng, client_order_id, status, total_price,
                      payment_method, notes, estimated_delivery_time, driver_id, assigned_at,
                      created_at, updated_at
          `);
          
          if (!updateResult.rows || updateResult.rows.length === 0) {
            return null;
          }
          
          // Mapper le résultat SQL brut vers le format Order
          const row = updateResult.rows[0] as any;
          const mappedOrder = {
            ...row,
            restaurantId: row.restaurant_id,
            customerName: row.customer_name,
            addressDetails: row.address_details,
            customerLat: row.customer_lat,
            customerLng: row.customer_lng,
            clientOrderId: row.client_order_id,
            totalPrice: row.total_price,
            paymentMethod: row.payment_method,
            estimatedDeliveryTime: row.estimated_delivery_time,
            driverId: row.driver_id,
            assignedAt: row.assigned_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            ignoredBy: undefined
          } as Order;
          
          // ✅ NOUVEAU : Mettre à jour le message Telegram pour afficher "EN COURS DE LIVRAISON"
          import("../services/telegram-message-updater.js").then(({ updateTelegramMessageToDelivery }) => {
            updateTelegramMessageToDelivery(orderId, driverId).catch((error) => {
              console.error(`[Storage] ❌ Erreur mise à jour Telegram (accept, non-bloquant):`, error);
            });
          }).catch((error) => {
            console.error(`[Storage] ⚠️ Erreur import telegram-message-updater (non-bloquant):`, error);
          });
          
          return mappedOrder;
        } catch (fallbackError: any) {
          this.log('error', `[STORAGE] Erreur UPDATE SQL brut (fallback):`, fallbackError);
          throw error; // Re-throw l'erreur originale
        }
      }
      throw error;
    }
  }
}
