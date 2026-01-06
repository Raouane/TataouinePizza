import { db } from "../db.js";
import { orders, orderItems, type Order, type OrderItem } from "../../shared/schema.js";
import { eq, and, desc, asc, sql, inArray, or, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseStorage } from "./base-storage.js";

/**
 * Storage pour les commandes (orders)
 * Gère les opérations CRUD pour les commandes et leurs items
 * Note: Les méthodes markOrderAsIgnoredByDriver utilisent getOrderById qui doit être accessible
 */
export class OrderStorage extends BaseStorage {
  async createOrder(order: typeof orders.$inferInsert): Promise<Order> {
    const orderId = randomUUID();
    const orderWithId = { ...order, id: orderId };
    
    await db.insert(orders).values(orderWithId);
    
    const result = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created order");
    }
    return result[0];
  }

  /**
   * Create order with items in a single transaction
   * Ensures atomicity: if any item creation fails, the entire order is rolled back
   * Items should not include orderId or id (they are set automatically)
   * If checkDuplicate is provided, checks for duplicates WITHIN the transaction using FOR UPDATE lock
   * This prevents race conditions when multiple requests arrive simultaneously
   */
  async createOrderWithItems(
    order: typeof orders.$inferInsert,
    items: Array<{
      pizzaId: string;
      size: "small" | "medium" | "large";
      quantity: number;
      pricePerUnit: string;
    }>,
    checkDuplicate?: { phone: string; restaurantId: string; totalPrice: string; withinSeconds: number }
  ): Promise<Order | null> {
    try {
      this.log('debug', `[STORAGE] createOrderWithItems - Début création commande pour ${order.phone}`, {
        restaurantId: order.restaurantId,
        itemsCount: items.length,
        clientOrderId: order.clientOrderId,
      });
      
      return await db.transaction(async (tx) => {
      // CRITICAL: Use PostgreSQL advisory lock to prevent concurrent duplicate creation
      // This is the ONLY way to guarantee no duplicates when multiple requests arrive simultaneously
      const lockKey = order.clientOrderId 
        ? `client_order_${order.clientOrderId}`.substring(0, 50) // Advisory lock key (max 50 chars)
        : `order_${checkDuplicate?.phone}_${checkDuplicate?.restaurantId}_${checkDuplicate?.totalPrice}`.substring(0, 50);
      
      // Acquire advisory lock (blocks until available, prevents concurrent execution)
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);
      
      // Priority 1: Check by clientOrderId if provided (most reliable idempotency)
      // This check is done WITHIN the transaction AFTER acquiring the lock
      if (order.clientOrderId) {
        try {
          const existingByClientId = await tx.execute(sql`
            SELECT id FROM orders
            WHERE client_order_id = ${order.clientOrderId}
            LIMIT 1
          `);
          
          if (existingByClientId.rows && existingByClientId.rows.length > 0) {
            // Order with this clientOrderId already exists, return null
            // Advisory lock will be released automatically when transaction ends
            return null;
          }
        } catch (error: any) {
          // If column doesn't exist yet (migration not run), log and continue with fallback check
          if (error?.message?.includes('client_order_id') || error?.message?.includes('column')) {
            this.log('error', 'Column client_order_id does not exist yet. Run migration: migrations/add_client_order_id.sql', error);
            // Continue with fallback duplicate check below
          } else {
            throw error; // Re-throw if it's a different error
          }
        }
      }
      
      // Priority 2: If duplicate check is requested, verify within transaction
      // Advisory lock already prevents race conditions, but we still check for duplicates
      if (checkDuplicate) {
        // Calculer la date limite en JavaScript plutôt qu'en SQL pour éviter les problèmes d'interpolation
        const cutoffTime = new Date(Date.now() - checkDuplicate.withinSeconds * 1000);
        const duplicateResult = await tx.execute(sql`
          SELECT id FROM orders
          WHERE phone = ${checkDuplicate.phone}
            AND restaurant_id = ${checkDuplicate.restaurantId}
            AND total_price = ${checkDuplicate.totalPrice}
            AND created_at > ${cutoffTime}
          LIMIT 1
        `);
        
        if (duplicateResult.rows && duplicateResult.rows.length > 0) {
          // Duplicate found, return null to signal duplicate
          return null;
        }
      }
      
      // Create order
      const orderId = randomUUID();
      // ✅ NOUVEAU : Exclure ignoredBy si la colonne n'existe pas encore en base
      const { ignoredBy, ...orderWithoutIgnoredBy } = order as any;
      const orderWithId = { ...orderWithoutIgnoredBy, id: orderId };
      
      // ✅ NOUVEAU : Gérer le cas où la colonne ignored_by n'existe pas encore
      let orderResult;
      try {
        orderResult = await tx.insert(orders)
          .values(orderWithId)
          .returning();
      } catch (insertError: any) {
        // Si l'erreur est liée à la colonne ignored_by manquante, utiliser INSERT SQL brut
        if (insertError?.message?.includes('ignored_by') || insertError?.message?.includes('column') || insertError?.code === '42703') {
          this.log('error', `[STORAGE] ⚠️ Colonne ignored_by manquante, utilisation INSERT SQL brut`);
          // INSERT SQL brut sans ignored_by
          const insertResult = await tx.execute(sql`
            INSERT INTO orders (
              id, restaurant_id, customer_name, phone, address, address_details,
              customer_lat, customer_lng, client_order_id, status, total_price,
              payment_method, notes, estimated_delivery_time, driver_id, assigned_at,
              created_at, updated_at
            ) VALUES (
              ${orderId}, ${order.restaurantId}, ${order.customerName}, ${order.phone},
              ${order.address}, ${order.addressDetails || null}, ${order.customerLat || null},
              ${order.customerLng || null}, ${order.clientOrderId || null}, ${order.status},
              ${order.totalPrice}, ${order.paymentMethod || 'cash'}, ${order.notes || null},
              ${order.estimatedDeliveryTime || null}, ${order.driverId || null}, ${order.assignedAt || null},
              NOW(), NOW()
            ) RETURNING *
          `);
          
          if (!insertResult.rows || insertResult.rows.length === 0) {
            throw new Error("Failed to create order");
          }
          
          // Mapper le résultat SQL brut vers le format Order
          const row = insertResult.rows[0] as any;
          orderResult = [{
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
          }];
        } else {
          throw insertError; // Re-throw si c'est une autre erreur
        }
      }
      
      if (!orderResult || !orderResult[0]) {
        throw new Error("Failed to create order");
      }
      
      // Create all order items
      if (items.length > 0) {
        const itemsWithOrderId = items.map(item => ({
          ...item,
          id: randomUUID(),
          orderId: orderId,
        }));
        
        await tx.insert(orderItems).values(itemsWithOrderId);
      }
      
      // Return the created order
      const createdOrder = orderResult[0];
      this.log('debug', `[STORAGE] createOrderWithItems - Commande créée avec succès: ${createdOrder.id}`);
      return createdOrder;
    });
    } catch (error: any) {
      this.log('error', '[STORAGE] createOrderWithItems - Erreur lors de la création:', error);
      // Re-throw pour que la route puisse gérer l'erreur
      throw error;
    }
  }

  /**
   * Marque un livreur comme ayant refusé une commande (ajoute à ignoredBy)
   * Gère le cas où la colonne ignored_by n'existe pas encore en base de données
   */
  async markOrderAsIgnoredByDriver(orderId: string, driverId: string): Promise<void> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // ✅ NOUVEAU : Vérifier si la colonne ignored_by existe en base
      // Si elle n'existe pas, on log un avertissement mais on ne plante pas
      try {
        // Récupérer la liste actuelle des livreurs qui ont refusé
        let ignoredList: string[] = [];
        if (order.ignoredBy) {
          try {
            ignoredList = JSON.parse(order.ignoredBy);
          } catch (e) {
            // Si le JSON est invalide, on repart de zéro
            ignoredList = [];
          }
        }

        // Ajouter le driverId s'il n'est pas déjà dans la liste
        if (!ignoredList.includes(driverId)) {
          ignoredList.push(driverId);
        }

        // Mettre à jour la commande avec la nouvelle liste
        await db.update(orders)
          .set({
            ignoredBy: JSON.stringify(ignoredList),
            updatedAt: new Date()
          })
          .where(eq(orders.id, orderId));

        this.log('debug', `[STORAGE] Livreur ${driverId} ajouté à ignoredBy pour commande ${orderId}`);
      } catch (sqlError: any) {
        // Si l'erreur est liée à la colonne manquante, on log mais on ne plante pas
        if (sqlError?.message?.includes('ignored_by') || sqlError?.message?.includes('column') || sqlError?.code === '42703') {
          this.log('error', `[STORAGE] ⚠️ Colonne ignored_by n'existe pas encore en base. Migration nécessaire. Erreur ignorée (non-bloquant).`);
          // Ne pas throw - on continue sans bloquer le flux
        } else {
          // Autre erreur, on la propage
          throw sqlError;
        }
      }
    } catch (error: any) {
      this.log('error', `[STORAGE] Erreur markOrderAsIgnoredByDriver:`, error);
      // Ne pas throw pour ne pas bloquer le flux si la colonne n'existe pas
      // Seulement log l'erreur
    }
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    try {
      const result = await db.select().from(orders).where(eq(orders.id, id));
      return result[0];
    } catch (error: any) {
      // ✅ NOUVEAU : Gérer le cas où la colonne ignored_by n'existe pas encore
      if (error?.message?.includes('ignored_by') || error?.message?.includes('column') || error?.code === '42703') {
        this.log('error', `[STORAGE] ⚠️ Colonne ignored_by manquante, tentative SELECT explicite sans ignored_by`);
        try {
          const result = await db.execute(sql`
            SELECT id, restaurant_id, customer_name, phone, address, address_details, 
                   customer_lat, customer_lng, client_order_id, status, total_price, 
                   payment_method, notes, estimated_delivery_time, driver_id, assigned_at, 
                   created_at, updated_at
            FROM orders 
            WHERE id = ${id}
          `);
          if (result.rows && result.rows.length > 0) {
            const row = result.rows[0] as any;
            return {
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
              ignoredBy: undefined // Colonne n'existe pas encore
            } as Order;
          }
          return undefined;
        } catch (fallbackError: any) {
          this.log('error', `[STORAGE] Erreur SELECT explicite (fallback):`, fallbackError);
          throw error; // Re-throw l'erreur originale
        }
      }
      throw error;
    }
  }

  /**
   * Get order by clientOrderId (for idempotency)
   * Returns the existing order if clientOrderId was already used
   */
  async getOrderByClientOrderId(clientOrderId: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.clientOrderId, clientOrderId));
    return result[0];
  }

  /**
   * Check for recent duplicate order to prevent duplicate submissions
   * Checks if an order with same phone, restaurant, and total was created recently
   */
  async getRecentDuplicateOrder(
    phone: string,
    restaurantId: string,
    totalPrice: string,
    withinSeconds: number = 10
  ): Promise<Order | undefined> {
    // Calculer la date limite en JavaScript plutôt qu'en SQL pour éviter les problèmes d'interpolation
    const cutoffTime = new Date(Date.now() - withinSeconds * 1000);
    const result = await db.select().from(orders)
      .where(and(
        eq(orders.phone, phone),
        eq(orders.restaurantId, restaurantId),
        eq(orders.totalPrice, totalPrice),
        sql`created_at > ${cutoffTime}`
      ))
      .orderBy(desc(orders.createdAt))
      .limit(1);
    
    return result[0];
  }

  async getAllOrders(): Promise<Order[]> {
    try {
      return await db.select().from(orders).orderBy(desc(orders.createdAt));
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

  async getOrdersByPhone(phone: string): Promise<Order[]> {
    try {
      this.log('debug', `[STORAGE] getOrdersByPhone - Recherche commandes pour téléphone: ${phone}`);
      const result = await db.select().from(orders).where(eq(orders.phone, phone)).orderBy(desc(orders.createdAt));
      this.log('debug', `[STORAGE] getOrdersByPhone - ${result.length} commande(s) trouvée(s)`);
      return result;
    } catch (error: any) {
      // ✅ NOUVEAU : Gérer le cas où la colonne ignored_by n'existe pas encore
      if (error?.message?.includes('ignored_by') || error?.message?.includes('column') || error?.code === '42703') {
        this.log('error', `[STORAGE] ⚠️ Colonne ignored_by manquante, tentative SELECT explicite sans ignored_by`);
        try {
          const result = await db.execute(sql`
            SELECT id, restaurant_id, customer_name, phone, address, address_details, 
                   customer_lat, customer_lng, client_order_id, status, total_price, 
                   payment_method, notes, estimated_delivery_time, driver_id, assigned_at, 
                   created_at, updated_at
            FROM orders 
            WHERE phone = ${phone}
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
              ignoredBy: undefined // Colonne n'existe pas encore
            })) as Order[];
          }
          return [];
        } catch (fallbackError: any) {
          this.log('error', `[STORAGE] Erreur SELECT explicite (fallback):`, fallbackError);
          return []; // Retourner tableau vide plutôt que planter
        }
      }
      this.log('error', `[STORAGE] getOrdersByPhone - Erreur pour téléphone ${phone}:`, error);
      return []; // Retourner tableau vide plutôt que throw
    }
  }

  async getReadyOrders(): Promise<Order[]> {
    try {
      // ✅ SIMPLIFICATION : Inclure aussi les commandes "received" (nouveau workflow)
      // Get orders that are received, accepted or ready and not yet assigned to a driver
      // This allows drivers to see orders early and prepare to pick them up (MVP: simplified workflow)
      const result = await db.select().from(orders)
        .where(and(
          inArray(orders.status, ['received', 'accepted', 'ready']),
          or(
            isNull(orders.driverId),
            eq(orders.driverId, '')
          )
        ))
        .orderBy(desc(orders.createdAt));
      return result || [];
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
            WHERE status IN ('received', 'accepted', 'ready')
              AND (driver_id IS NULL OR driver_id = '')
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

  /**
   * Récupère les commandes en attente (sans driverId)
   * ✅ OPTIMISATION : Requête ciblée au lieu de getAllOrders()
   * @param limit Nombre maximum de commandes à retourner (défaut: 10)
   */
  async getPendingOrdersWithoutDriver(limit: number = 10): Promise<Order[]> {
    try {
      const result = await db
        .select()
        .from(orders)
        .where(
          and(
            inArray(orders.status, ['received', 'accepted', 'ready']),
            or(
              isNull(orders.driverId),
              eq(orders.driverId, '')
            )
          )
        )
        .orderBy(asc(orders.createdAt)) // Plus ancienne en premier (FIFO)
        .limit(limit);
      
      this.log('debug', `[STORAGE] getPendingOrdersWithoutDriver - ${result.length} commande(s) trouvée(s)`);
      return result || [];
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
            WHERE status IN ('received', 'accepted', 'ready')
              AND (driver_id IS NULL OR driver_id = '')
            ORDER BY created_at ASC
            LIMIT ${limit}
          `);
          if (result.rows && result.rows.length > 0) {
            const mapped = result.rows.map((row: any) => ({
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
            this.log('debug', `[STORAGE] getPendingOrdersWithoutDriver - ${mapped.length} commande(s) trouvée(s) (fallback)`);
            return mapped;
          }
          return [];
        } catch (fallbackError: any) {
          this.log('error', `[STORAGE] Erreur SELECT explicite (fallback):`, fallbackError);
          return [];
        }
      }
      this.log('error', `[STORAGE] getPendingOrdersWithoutDriver - Erreur:`, error);
      throw error;
    }
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    // ✅ LOGS DE DIAGNOSTIC - Récupérer l'ancien statut AVANT la mise à jour
    const oldOrder = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    const oldStatus = oldOrder[0]?.status || 'unknown';
    const oldDriverId = oldOrder[0]?.driverId || null;
    
    console.log(`\n[ORDER STATUS] 🔄 ========================================`);
    console.log(`[ORDER STATUS] 🔄 CHANGEMENT DE STATUT`);
    console.log(`[ORDER STATUS]    Order ID: ${id}`);
    console.log(`[ORDER STATUS]    Ancien statut: ${oldStatus}`);
    console.log(`[ORDER STATUS]    Nouveau statut: ${status}`);
    console.log(`[ORDER STATUS]    Driver ID (avant): ${oldDriverId || 'NULL'}`);
    
    // Stack trace pour voir d'où vient l'appel (limité aux 3 premières lignes)
    const stack = new Error().stack;
    const stackLines = stack?.split('\n').slice(1, 4) || [];
    console.log(`[ORDER STATUS]    Appelé depuis:`);
    stackLines.forEach((line, idx) => {
      console.log(`[ORDER STATUS]      ${idx + 1}. ${line.trim()}`);
    });
    console.log(`[ORDER STATUS] 🔄 ========================================\n`);
    
    await db.update(orders).set({ status: status as any, updatedAt: new Date() }).where(eq(orders.id, id));
    const result = await db.select().from(orders).where(eq(orders.id, id));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve updated order");
    }
    
    const updatedOrder = result[0];
    
    // ✅ LOGS DE DIAGNOSTIC - Vérifier le statut APRÈS la mise à jour
    console.log(`[ORDER STATUS] ✅ Statut mis à jour avec succès`);
    console.log(`[ORDER STATUS]    Statut final en DB: ${updatedOrder.status}`);
    console.log(`[ORDER STATUS]    Driver ID (après): ${updatedOrder.driverId || 'NULL'}`);
    
    // ⚠️ ALERTE si le statut passe directement à "delivered" sans passer par "delivery"
    if (status === 'delivered' && oldStatus !== 'delivery' && oldStatus !== 'delivered') {
      console.error(`\n[ORDER STATUS] ⚠️⚠️⚠️ ALERTE: STATUT PASSE DIRECTEMENT À "delivered" ⚠️⚠️⚠️`);
      console.error(`[ORDER STATUS]    Ancien statut: ${oldStatus}`);
      console.error(`[ORDER STATUS]    Nouveau statut: ${status}`);
      console.error(`[ORDER STATUS]    ⚠️ Le statut devrait passer par "delivery" avant "delivered" !`);
      console.error(`[ORDER STATUS] ⚠️⚠️⚠️ ========================================\n`);
    }
    
    // ✅ NOUVEAU : Mettre à jour le message Telegram selon le statut
    if (updatedOrder.driverId) {
      const driverId = updatedOrder.driverId;
      
      // Mettre à jour le message Telegram de manière non-bloquante
      if (status === 'delivery') {
        import("../services/telegram-message-updater.js").then(({ updateTelegramMessageToDelivery }) => {
          updateTelegramMessageToDelivery(id, driverId).catch((error) => {
            console.error(`[Storage] ❌ Erreur mise à jour Telegram (delivery, non-bloquant):`, error);
          });
        }).catch((error) => {
          console.error(`[Storage] ⚠️ Erreur import telegram-message-updater (non-bloquant):`, error);
        });
      } else if (status === 'delivered') {
        import("../services/telegram-message-updater.js").then(({ updateTelegramMessageToDelivered }) => {
          updateTelegramMessageToDelivered(id, driverId).catch((error) => {
            console.error(`[Storage] ❌ Erreur mise à jour Telegram (delivered, non-bloquant):`, error);
          });
        }).catch((error) => {
          console.error(`[Storage] ⚠️ Erreur import telegram-message-updater (non-bloquant):`, error);
        });
        
        // Déclencher la re-notification si la commande est livrée
        import("../websocket.js").then(({ checkAndNotifyPendingOrdersForDriver }) => {
          checkAndNotifyPendingOrdersForDriver(driverId).catch((error) => {
            console.error(`[Storage] ❌ Erreur re-notification (non-bloquant):`, error);
          });
        }).catch((error) => {
          console.error(`[Storage] ⚠️ Erreur import websocket (non-bloquant):`, error);
        });
      }
    }
    
    return updatedOrder;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: typeof orderItems.$inferInsert): Promise<OrderItem> {
    const itemId = randomUUID();
    const itemWithId = { ...item, id: itemId };
    
    await db.insert(orderItems).values(itemWithId);
    
    const result = await db.select().from(orderItems).where(eq(orderItems.id, itemId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created order item");
    }
    return result[0];
  }
}
