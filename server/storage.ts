import { db } from "./db.js";
import { 
  adminUsers, pizzas, pizzaPrices, otpCodes, orders, orderItems, drivers, restaurants, customers, idempotencyKeys, telegramMessages,
  type Pizza, type InsertAdminUser, type AdminUser, type Order, type OrderItem, type OtpCode, type Driver, type InsertDriver, type Restaurant, type InsertRestaurant,
  type PizzaPrice, type InsertOrder, type Customer, type InsertCustomer,
  insertPizzaSchema, insertPizzaPriceSchema
} from "../shared/schema.js";
import type { z } from "zod";
import { eq, and, desc, asc, sql, inArray, or, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Admin Users
  getAdminByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;

  // Customers (simple auth - MVP)
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<Customer>): Promise<Customer>;

  // Restaurants
  getAllRestaurants(): Promise<Restaurant[]>;
  getRestaurantById(id: string): Promise<Restaurant | undefined>;
  getRestaurantByPhone(phone: string): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, data: Partial<Restaurant>): Promise<Restaurant>;
  getOrdersByRestaurant(restaurantId: string): Promise<Order[]>;

  // Drivers
  getDriverByPhone(phone: string): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  getDriverById(id: string): Promise<Driver | undefined>;
  getAllDrivers(): Promise<Driver[]>;
  getAvailableDrivers(): Promise<Driver[]>;
  getOrdersByDriver(driverId: string): Promise<Order[]>;
  updateDriverStatus(id: string, status: string): Promise<Driver>;
  updateDriver(id: string, data: Partial<Driver>): Promise<Driver>;
  deleteDriver(id: string): Promise<void>;
  assignOrderToDriver(orderId: string, driverId: string): Promise<Order>;
  acceptOrderByDriver(orderId: string, driverId: string): Promise<Order | null>;

  // Pizzas
  getAllPizzas(): Promise<Pizza[]>;
  getPizzaById(id: string): Promise<Pizza | undefined>;
  getPizzasByIds(ids: string[]): Promise<Pizza[]>;
  getPizzasByRestaurant(restaurantId: string): Promise<Pizza[]>;
  createPizza(pizza: z.infer<typeof insertPizzaSchema>): Promise<Pizza>;
  updatePizza(id: string, pizza: Partial<z.infer<typeof insertPizzaSchema>>): Promise<Pizza>;
  deletePizza(id: string): Promise<void>;

  // Pizza Prices
  getPizzaPrices(pizzaId: string): Promise<PizzaPrice[]>;
  getPizzaPricesByPizzaIds(pizzaIds: string[]): Promise<PizzaPrice[]>;
  createPizzaPrice(price: z.infer<typeof insertPizzaPriceSchema>): Promise<PizzaPrice>;

  // OTP
  createOtpCode(phone: string, code: string, expiresAt: Date): Promise<OtpCode>;
  getLatestOtpCode(phone: string): Promise<OtpCode | undefined>;
  verifyOtpCode(phone: string, code: string): Promise<boolean>;

  // Orders
  // Note: createOrder attend les données de la table orders (sans items)
  // La transformation InsertOrder -> Order doit être faite dans le service
  createOrder(order: typeof orders.$inferInsert): Promise<Order>;
  // Transactional method to create order with items atomically
  // Items should not include orderId or id (they are set automatically)
  // If checkDuplicate is provided, checks for duplicates within the transaction (prevents race conditions)
  createOrderWithItems(
    order: typeof orders.$inferInsert,
    items: Array<Omit<typeof orderItems.$inferInsert, 'orderId' | 'id'>>,
    checkDuplicate?: { phone: string; restaurantId: string; totalPrice: string; withinSeconds: number }
  ): Promise<Order | null>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrderByClientOrderId(clientOrderId: string): Promise<Order | undefined>;
  getRecentDuplicateOrder(phone: string, restaurantId: string, totalPrice: string, withinSeconds?: number): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  getOrdersByPhone(phone: string): Promise<Order[]>;
  getReadyOrders(): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<Order>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: typeof orderItems.$inferInsert): Promise<OrderItem>;
}

export class DatabaseStorage implements IStorage {
  // ============ HELPER METHODS ============
  
  /**
   * Logger avec niveaux (skip debug en production)
   */
  private log(level: 'debug' | 'info' | 'error', message: string, data?: any): void {
    if (process.env.NODE_ENV === "production" && level === 'debug') {
      return; // Skip debug logs in production
    }
    const prefix = `[DB] ${level.toUpperCase()}`;
    if (data) {
      console[level === 'error' ? 'error' : 'log'](`${prefix} ${message}`, data);
    } else {
      console[level === 'error' ? 'error' : 'log'](`${prefix} ${message}`);
    }
  }

  /**
   * Parse isOpen depuis raw SQL (gère bug Neon HTTP)
   */
  private parseIsOpen(rawValue: any, restaurantName?: string): boolean {
    try {
      if (rawValue === 'true' || rawValue === 't' || rawValue === true || rawValue === 1) {
        return true;
      } else if (rawValue === 'false' || rawValue === 'f' || rawValue === false || rawValue === 0) {
        return false;
      } else {
        if (process.env.NODE_ENV !== "production") {
          this.log('debug', `Valeur is_open_text inattendue${restaurantName ? ` pour ${restaurantName}` : ''}: "${rawValue}", défaut à true`);
        }
        return true;
      }
    } catch (e) {
      this.log('error', `Erreur parsing is_open${restaurantName ? ` pour ${restaurantName}` : ''}`, e);
      return true; // Par défaut, considérer ouvert
    }
  }

  /**
   * Parse categories depuis raw SQL (support JSONB + string JSON)
   */
  private parseCategories(rawCategories: any, restaurantName?: string): string[] | null {
    try {
      if (!rawCategories) return null;
      
      if (Array.isArray(rawCategories)) {
        return rawCategories;
      } else if (typeof rawCategories === 'string') {
        const parsed = JSON.parse(rawCategories);
        return Array.isArray(parsed) ? parsed : null;
      } else if (typeof rawCategories === 'object') {
        return Array.isArray(rawCategories) ? rawCategories : null;
      }
      
      return null;
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        this.log('debug', `Erreur parsing categories${restaurantName ? ` pour ${restaurantName}` : ''}`, e);
      }
      return null;
    }
  }

  /**
   * Parse openingHours depuis raw SQL
   */
  private parseOpeningHours(rawValue: any): string | null {
    try {
      if (!rawValue) return null;
      
      if (typeof rawValue === 'string') {
        const trimmed = rawValue.trim();
        return trimmed === '' ? null : trimmed;
      } else {
        const str = String(rawValue).trim();
        return str === '' ? null : str;
      }
    } catch (e) {
      return null;
    }
  }

  /**
   * Construire un Restaurant depuis raw SQL row
   */
  private buildRestaurantFromRow(row: any): Restaurant {
    const categories = this.parseCategories(row.categories, row.name);
    const isOpen = this.parseIsOpen(row.is_open_text, row.name);
    const openingHours = this.parseOpeningHours(row.opening_hours);

    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      address: row.address,
      description: row.description || null,
      imageUrl: row.image_url || null,
      categories: categories || null,
      isOpen: Boolean(isOpen),
      openingHours: openingHours,
      deliveryTime: row.delivery_time || 30,
      minOrder: row.min_order || "0",
      rating: row.rating || "4.5",
      orderType: row.order_type || "online",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as Restaurant;
  }

  // ============ ADMIN ============
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

  // ============ CUSTOMERS (Simple Auth - MVP) ============
  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    try {
      const result = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
      return result[0];
    } catch (e) {
      this.log('error', 'getCustomerByPhone failed', e);
      throw e;
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const customerId = randomUUID();
    const customerWithId = { ...customer, id: customerId };
    
    try {
      await db.insert(customers).values(customerWithId);
    } catch (e) {
      this.log('error', 'Insert customer failed', e);
      throw e;
    }
    
    try {
      const result = await db.select().from(customers).where(eq(customers.id, customerId));
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error("Select returned empty result");
      }
      return result[0];
    } catch (e) {
      this.log('error', 'Select customer failed', e);
      throw e;
    }
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    try {
      await db.update(customers)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(customers.id, id));
      
      const result = await db.select().from(customers).where(eq(customers.id, id));
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error("Customer not found");
      }
      return result[0];
    } catch (e) {
      this.log('error', 'updateCustomer failed', e);
      throw e;
    }
  }

  // ============ RESTAURANTS ============
  async getAllRestaurants(): Promise<Restaurant[]> {
    try {
      this.log('debug', 'getAllRestaurants - Début');
      // Use raw SQL with text cast to bypass Neon HTTP boolean parsing bug
      const rawResult = await db.execute(sql`
        SELECT id, name, phone, address, description, image_url, 
               COALESCE(categories::text, NULL) as categories,
               is_open::text as is_open_text, opening_hours, delivery_time, 
               min_order, rating, order_type, created_at, updated_at 
        FROM restaurants ORDER BY name
      `);
      
      this.log('debug', 'getAllRestaurants - Nombre de restaurants', rawResult.rows?.length || 0);
      
      if (!rawResult.rows || rawResult.rows.length === 0) {
        return [];
      }
      
      const restaurants = rawResult.rows.map((row: any) => {
        const restaurant = this.buildRestaurantFromRow(row);
        
        // Log pour debug spécifique (uniquement en dev)
        if (process.env.NODE_ENV !== "production" && restaurant.name && restaurant.name.toLowerCase().includes('bouba')) {
          this.log('debug', `Restaurant ${restaurant.name} - isOpen: ${restaurant.isOpen} (raw: ${row.is_open_text}), openingHours: ${restaurant.openingHours} (raw: ${row.opening_hours})`);
        }
        
        return restaurant;
      });
      
      this.log('debug', 'getAllRestaurants - Restaurants retournés', restaurants.map(r => ({ name: r.name, isOpen: r.isOpen })));
      return restaurants;
    } catch (e) {
      this.log('error', 'getAllRestaurants error', e);
      return [];
    }
  }

  async getRestaurantById(id: string): Promise<Restaurant | undefined> {
    try {
      this.log('debug', 'getRestaurantById - ID', id);
      const rawResult = await db.execute(sql`
        SELECT id, name, phone, address, description, image_url, categories, 
               is_open::text as is_open_text, opening_hours, delivery_time, 
               min_order, rating, order_type, created_at, updated_at 
        FROM restaurants WHERE id = ${id}
      `);
      
      if (!rawResult.rows || rawResult.rows.length === 0) {
        this.log('debug', 'getRestaurantById - Aucun restaurant trouvé');
        return undefined;
      }
      
      const row = rawResult.rows[0] as any;
      this.log('debug', 'getRestaurantById - is_open_text brut', { value: row.is_open_text, type: typeof row.is_open_text });
      
      return this.buildRestaurantFromRow(row);
    } catch (e) {
      this.log('error', 'getRestaurantById error', e);
      return undefined;
    }
  }

  async getRestaurantByPhone(phone: string): Promise<Restaurant | undefined> {
    try {
      const rawResult = await db.execute(sql`
        SELECT id, name, phone, address, description, image_url, categories, 
               is_open::text as is_open_text, opening_hours, delivery_time, 
               min_order, rating, order_type, created_at, updated_at 
        FROM restaurants WHERE phone = ${phone}
      `);
      
      if (!rawResult.rows || rawResult.rows.length === 0) {
        return undefined;
      }
      
      const row = rawResult.rows[0] as any;
      return this.buildRestaurantFromRow(row);
    } catch (e) {
      this.log('error', 'getRestaurantByPhone error', e);
      return undefined;
    }
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const restaurantId = randomUUID();
    const restaurantWithId = { 
      ...restaurant, 
      id: restaurantId,
      categories: Array.isArray(restaurant.categories) ? JSON.stringify(restaurant.categories) : (restaurant.categories || null)
    };
    await db.insert(restaurants).values(restaurantWithId);
    const result = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created restaurant");
    }
    return result[0];
  }

  async updateRestaurant(id: string, data: Partial<Restaurant>): Promise<Restaurant> {
    this.log('debug', 'updateRestaurant - ID', id);
    this.log('debug', 'updateRestaurant - Données à mettre à jour', data);
    
    // Préparer les données pour la mise à jour
    const updateData: Partial<Restaurant> = {
      updatedAt: new Date()
    };
    
    // Traiter isOpen séparément avec SQL brut car Drizzle a des problèmes avec les booléens
    let isOpenValue: boolean | undefined = undefined;
    if (data.isOpen !== undefined) {
      isOpenValue = Boolean(data.isOpen);
      this.log('debug', 'updateRestaurant - isOpen à mettre à jour', { value: isOpenValue, type: typeof isOpenValue });
    }
    
    // Ajouter les autres champs
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.categories !== undefined) {
      updateData.categories = Array.isArray(data.categories) ? JSON.stringify(data.categories) : data.categories;
    }
    if (data.openingHours !== undefined) {
      updateData.openingHours = data.openingHours === "" ? null : data.openingHours;
    }
    if (data.deliveryTime !== undefined) updateData.deliveryTime = data.deliveryTime;
    if (data.minOrder !== undefined) updateData.minOrder = data.minOrder;
    if (data.rating !== undefined) updateData.rating = data.rating;
    
    // Mettre à jour isOpen AVANT la mise à jour Drizzle pour éviter les conflits
    if (isOpenValue !== undefined) {
      this.log('debug', 'updateRestaurant - Exécution SQL brut pour isOpen', isOpenValue);
      try {
        await db.execute(sql`
          UPDATE restaurants 
          SET is_open = ${isOpenValue}::boolean, updated_at = NOW()
          WHERE id = ${id}
        `);
      } catch (sqlError) {
        this.log('error', 'updateRestaurant - Erreur SQL brut pour isOpen', sqlError);
        throw sqlError;
      }
    }
    
    // Utiliser Drizzle pour la mise à jour des autres champs (sans isOpen)
    if (Object.keys(updateData).length > 1) { // Plus que juste updatedAt
      await db.update(restaurants)
        .set(updateData)
        .where(eq(restaurants.id, id));
      this.log('debug', 'updateRestaurant - Mise à jour Drizzle effectuée');
    }
    
    // Récupérer le restaurant mis à jour
    const result = await this.getRestaurantById(id);
    if (!result) {
      throw new Error("Failed to retrieve updated restaurant");
    }
    
    this.log('debug', 'updateRestaurant - Restaurant récupéré', { isOpen: result.isOpen, type: typeof result.isOpen });
    return result;
  }

  async getOrdersByRestaurant(restaurantId: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.restaurantId, restaurantId)).orderBy(desc(orders.createdAt));
  }

  // ============ DRIVERS ============
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
    return await db.select().from(orders).where(eq(orders.driverId, driverId));
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
        and(
          eq(orders.id, orderId),
          or(
            sql`${orders.driverId} IS NULL`,
            eq(orders.driverId, "")
          )
        )
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
    // ✅ SIMPLIFICATION : Quand le livreur accepte, passer directement à "delivery"
    // Accept if order is received, accepted or ready AND not assigned to anyone
    // Le statut passe directement à "delivery" (en livraison)
    const result = await db.update(orders)
      .set({ 
        driverId,
        status: "delivery", // ✅ Passer directement à "delivery"
        updatedAt: new Date() 
      })
      .where(and(
        eq(orders.id, orderId),
        sql`${orders.status} IN ('received', 'accepted', 'ready')`,
        sql`(${orders.driverId} IS NULL OR ${orders.driverId} = '')`
      ))
      .returning();
    
    // If result is empty, the WHERE conditions were not met (order already assigned or wrong status)
    if (!result || result.length === 0) {
      return null;
    }
    
    // ✅ NOUVEAU : Mettre à jour le message Telegram pour afficher "EN COURS DE LIVRAISON"
    import("./services/telegram-message-updater.js").then(({ updateTelegramMessageToDelivery }) => {
      updateTelegramMessageToDelivery(orderId, driverId).catch((error) => {
        console.error(`[Storage] ❌ Erreur mise à jour Telegram (accept, non-bloquant):`, error);
      });
    }).catch((error) => {
      console.error(`[Storage] ⚠️ Erreur import telegram-message-updater (non-bloquant):`, error);
    });
    
    // The UPDATE succeeded, return the updated order
    return result[0];
  }

  // ============ PIZZAS ============
  async getAllPizzas(): Promise<Pizza[]> {
    // Ne retourner que les produits disponibles (available = true)
    return await db.select().from(pizzas).where(eq(pizzas.available, true));
  }

  async getPizzaById(id: string): Promise<Pizza | undefined> {
    const result = await db.select().from(pizzas).where(eq(pizzas.id, id));
    return result[0];
  }

  /**
   * Batch fetch pizzas by IDs to avoid N+1 queries
   */
  async getPizzasByIds(ids: string[]): Promise<Pizza[]> {
    if (ids.length === 0) return [];
    return await db.select().from(pizzas).where(inArray(pizzas.id, ids));
  }

  async getPizzasByRestaurant(restaurantId: string): Promise<Pizza[]> {
    try {
      // Ne retourner que les produits disponibles (available = true)
      const result = await db.select()
        .from(pizzas)
        .where(and(
          eq(pizzas.restaurantId, restaurantId),
          eq(pizzas.available, true)
        ));
      this.log('debug', `getPizzasByRestaurant(${restaurantId}): ${result.length} produits disponibles trouvés`);
      return result;
    } catch (error) {
      this.log('error', `Erreur getPizzasByRestaurant(${restaurantId})`, error);
      return [];
    }
  }

  async createPizza(pizza: z.infer<typeof insertPizzaSchema>): Promise<Pizza> {
    const pizzaId = randomUUID();
    const pizzaWithId = { ...pizza, id: pizzaId };
    
    await db.insert(pizzas).values(pizzaWithId);
    
    const result = await db.select().from(pizzas).where(eq(pizzas.id, pizzaId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created pizza");
    }
    return result[0];
  }

  async updatePizza(id: string, pizza: Partial<z.infer<typeof insertPizzaSchema>>): Promise<Pizza> {
    await db.update(pizzas).set({ ...pizza, updatedAt: new Date() }).where(eq(pizzas.id, id));
    const result = await db.select().from(pizzas).where(eq(pizzas.id, id));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve updated pizza");
    }
    return result[0];
  }

  async deletePizza(id: string): Promise<void> {
    await db.delete(pizzaPrices).where(eq(pizzaPrices.pizzaId, id));
    await db.delete(pizzas).where(eq(pizzas.id, id));
  }

  // ============ PIZZA PRICES ============
  async getPizzaPrices(pizzaId: string): Promise<PizzaPrice[]> {
    return await db.select().from(pizzaPrices).where(eq(pizzaPrices.pizzaId, pizzaId));
  }

  /**
   * Batch fetch pizza prices by pizza IDs to avoid N+1 queries
   * Returns all prices for the given pizza IDs
   */
  async getPizzaPricesByPizzaIds(pizzaIds: string[]): Promise<PizzaPrice[]> {
    if (pizzaIds.length === 0) return [];
    return await db.select().from(pizzaPrices).where(inArray(pizzaPrices.pizzaId, pizzaIds));
  }

  async createPizzaPrice(price: z.infer<typeof insertPizzaPriceSchema>): Promise<PizzaPrice> {
    const priceId = randomUUID();
    // Convertir price en string car la DB attend numeric (string)
    const priceWithId = { 
      ...price, 
      id: priceId,
      price: typeof price.price === 'number' ? price.price.toString() : price.price
    };
    
    await db.insert(pizzaPrices).values(priceWithId);
    
    const result = await db.select().from(pizzaPrices).where(eq(pizzaPrices.id, priceId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created pizza price");
    }
    return result[0];
  }

  // ============ OTP ============
  async createOtpCode(phone: string, code: string, expiresAt: Date): Promise<OtpCode> {
    const otpId = randomUUID();
    
    await db.insert(otpCodes).values({ id: otpId, phone, code, expiresAt });
    
    const result = await db.select().from(otpCodes).where(eq(otpCodes.id, otpId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created OTP code");
    }
    return result[0];
  }

  async getLatestOtpCode(phone: string): Promise<OtpCode | undefined> {
    const result = await db.select().from(otpCodes)
      .where(eq(otpCodes.phone, phone))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    return result[0];
  }

  async verifyOtpCode(phone: string, code: string): Promise<boolean> {
    // Code de démo universel (utilisable en dev ET en prod si ENABLE_DEMO_OTP=true)
    const DEMO_OTP_CODE = process.env.DEMO_OTP_CODE || "1234";
    const ENABLE_DEMO_OTP = process.env.ENABLE_DEMO_OTP === "true" || process.env.NODE_ENV !== "production";
    const isDemoCode = code === DEMO_OTP_CODE && ENABLE_DEMO_OTP;
    
    // Si c'est le code de démo, accepter directement (sans vérifier la DB)
    if (isDemoCode) {
      console.log(`[OTP] ✅ Code de démo accepté pour ${phone} (ENABLE_DEMO_OTP=${ENABLE_DEMO_OTP})`);
      return true;
    }
    
    const otpRecord = await this.getLatestOtpCode(phone);
    if (!otpRecord) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[OTP] ❌ Aucun code OTP trouvé pour ${phone}`);
      }
      return false;
    }
    
    if (otpRecord.verified) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[OTP] ❌ Code déjà utilisé pour ${phone}`);
      }
      return false;
    }
    
    if (new Date() > otpRecord.expiresAt) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[OTP] ❌ Code expiré pour ${phone} (expiré à ${otpRecord.expiresAt})`);
      }
      return false;
    }
    
    if ((otpRecord.attempts || 0) >= 3) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[OTP] ❌ Trop de tentatives pour ${phone} (${otpRecord.attempts} tentatives)`);
      }
      return false;
    }
    
    const isValidCode = otpRecord.code === code;
    
    if (!isValidCode) {
      const newAttempts = (otpRecord.attempts || 0) + 1;
      await db.update(otpCodes).set({ attempts: newAttempts }).where(eq(otpCodes.id, otpRecord.id));
      if (process.env.NODE_ENV !== "production") {
        console.log(`[OTP] ❌ Code incorrect pour ${phone}:`, {
          codeFourni: code,
          codeAttendu: otpRecord.code,
          tentatives: newAttempts,
        });
      }
      return false;
    }
    
    await db.update(otpCodes).set({ verified: true }).where(eq(otpCodes.id, otpRecord.id));
    if (process.env.NODE_ENV !== "production") {
      console.log(`[OTP] ✅ Code validé pour ${phone}`);
    }
    return true;
  }

  // ============ ORDERS ============
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
      const orderWithId = { ...order, id: orderId };
      
      const orderResult = await tx.insert(orders)
        .values(orderWithId)
        .returning();
      
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
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
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
      this.log('error', `[STORAGE] getPendingOrdersWithoutDriver - Erreur:`, error);
      throw error;
    }
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    await db.update(orders).set({ status: status as any, updatedAt: new Date() }).where(eq(orders.id, id));
    const result = await db.select().from(orders).where(eq(orders.id, id));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve updated order");
    }
    
    const updatedOrder = result[0];
    
    // ✅ NOUVEAU : Mettre à jour le message Telegram selon le statut
    if (updatedOrder.driverId) {
      const driverId = updatedOrder.driverId;
      
      // Mettre à jour le message Telegram de manière non-bloquante
      if (status === 'delivery') {
        import("./services/telegram-message-updater.js").then(({ updateTelegramMessageToDelivery }) => {
          updateTelegramMessageToDelivery(id, driverId).catch((error) => {
            console.error(`[Storage] ❌ Erreur mise à jour Telegram (delivery, non-bloquant):`, error);
          });
        }).catch((error) => {
          console.error(`[Storage] ⚠️ Erreur import telegram-message-updater (non-bloquant):`, error);
        });
      } else if (status === 'delivered') {
        import("./services/telegram-message-updater.js").then(({ updateTelegramMessageToDelivered }) => {
          updateTelegramMessageToDelivered(id, driverId).catch((error) => {
            console.error(`[Storage] ❌ Erreur mise à jour Telegram (delivered, non-bloquant):`, error);
          });
        }).catch((error) => {
          console.error(`[Storage] ⚠️ Erreur import telegram-message-updater (non-bloquant):`, error);
        });
        
        // Déclencher la re-notification si la commande est livrée
        import("./websocket.js").then(({ checkAndNotifyPendingOrdersForDriver }) => {
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

  // Idempotency Keys (anti double commande - PRIORITÉ 1)
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

  // ============ TELEGRAM MESSAGES ============
  
  async saveTelegramMessage(
    orderId: string,
    driverId: string,
    chatId: string,
    messageId: number,
    status: string = "sent"
  ): Promise<void> {
    try {
      await db.insert(telegramMessages).values({
        orderId,
        driverId,
        chatId,
        messageId,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      this.log('debug', `[STORAGE] Telegram message sauvegardé: orderId=${orderId}, driverId=${driverId}, messageId=${messageId}`);
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

export const storage = new DatabaseStorage();
