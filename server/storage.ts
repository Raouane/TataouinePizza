import { db } from "./db.js";
import { 
  adminUsers, pizzas, pizzaPrices, otpCodes, orders, orderItems, drivers, restaurants,
  type Pizza, type InsertAdminUser, type AdminUser, type Order, type OrderItem, type OtpCode, type Driver, type InsertDriver, type Restaurant, type InsertRestaurant
} from "@shared/schema";
import { eq, and, desc, sql, inArray, or, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Admin Users
  getAdminByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;

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
  getOrdersByDriver(driverId: string): Promise<Order[]>;
  updateDriverStatus(id: string, status: string): Promise<Driver>;
  updateDriver(id: string, data: Partial<Driver>): Promise<Driver>;
  assignOrderToDriver(orderId: string, driverId: string): Promise<Order>;
  acceptOrderByDriver(orderId: string, driverId: string): Promise<Order | null>;

  // Pizzas
  getAllPizzas(): Promise<Pizza[]>;
  getPizzaById(id: string): Promise<Pizza | undefined>;
  getPizzasByRestaurant(restaurantId: string): Promise<Pizza[]>;
  createPizza(pizza: any): Promise<Pizza>;
  updatePizza(id: string, pizza: any): Promise<Pizza>;
  deletePizza(id: string): Promise<void>;

  // Pizza Prices
  getPizzaPrices(pizzaId: string): Promise<any[]>;
  createPizzaPrice(price: any): Promise<any>;

  // OTP
  createOtpCode(phone: string, code: string, expiresAt: Date): Promise<OtpCode>;
  getLatestOtpCode(phone: string): Promise<OtpCode | undefined>;
  verifyOtpCode(phone: string, code: string): Promise<boolean>;

  // Orders
  createOrder(order: any): Promise<Order>;
  getOrderById(id: string): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  getOrdersByPhone(phone: string): Promise<Order[]>;
  getReadyOrders(): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<Order>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: any): Promise<OrderItem>;
}

export class DatabaseStorage implements IStorage {
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
      console.error("[DB] Insert failed:", e);
      throw e;
    }
    
    try {
      const result = await db.select().from(adminUsers).where(eq(adminUsers.id, adminId));
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error("Select returned empty result");
      }
      return result[0];
    } catch (e) {
      console.error("[DB] Select failed:", e);
      throw e;
    }
  }

  // Helper to fix boolean parsing (neon-http returns 'false' instead of 'f')
  private fixRestaurantBooleans(restaurant: Restaurant): Restaurant {
    return {
      ...restaurant,
      isOpen: restaurant.isOpen === true || (restaurant.isOpen as any) === 't' || (restaurant.isOpen as any) === 'true',
    };
  }

  // ============ RESTAURANTS ============
  async getAllRestaurants(): Promise<Restaurant[]> {
    try {
      console.log("[DB] getAllRestaurants - Début");
      // Use raw SQL with text cast to bypass Neon HTTP boolean parsing bug
      const rawResult = await db.execute(sql`
        SELECT id, name, phone, address, description, image_url, categories, 
               is_open::text as is_open_text, opening_hours, delivery_time, 
               min_order, rating, created_at, updated_at 
        FROM restaurants ORDER BY name
      `);
      
      console.log("[DB] getAllRestaurants - Nombre de restaurants:", rawResult.rows?.length || 0);
      
      if (!rawResult.rows || rawResult.rows.length === 0) {
        return [];
      }
      
      const restaurants = rawResult.rows.map((row: any) => {
        // Parser categories : toujours retourner un tableau ou null
        // Supporte JSONB (objet PostgreSQL) et TEXT (string JSON)
        let categories: string[] | null = null;
        try {
          if (row.categories) {
            if (Array.isArray(row.categories)) {
              // Déjà un tableau (JSONB PostgreSQL)
              categories = row.categories;
            } else if (typeof row.categories === 'string') {
              // String JSON à parser
              const parsed = JSON.parse(row.categories);
              categories = Array.isArray(parsed) ? parsed : null;
            } else if (typeof row.categories === 'object') {
              // Objet JSONB PostgreSQL, convertir en tableau si possible
              categories = Array.isArray(row.categories) ? row.categories : null;
            }
          }
          // S'assurer que c'est un tableau
          if (categories && !Array.isArray(categories)) {
            categories = null;
          }
        } catch (e) {
          console.warn(`[DB] Erreur parsing categories pour ${row.name}:`, e);
          categories = null;
        }

        // Parser isOpen : TOUJOURS un boolean
        let isOpen: boolean = false;
        try {
          const isOpenValue = row.is_open_text;
          if (isOpenValue === 'true' || isOpenValue === 't' || isOpenValue === true || isOpenValue === 1) {
            isOpen = true;
          } else if (isOpenValue === 'false' || isOpenValue === 'f' || isOpenValue === false || isOpenValue === 0) {
            isOpen = false;
          } else {
            // Fallback: si la valeur n'est pas claire, considérer comme ouvert par défaut
            console.warn(`[DB] Valeur is_open_text inattendue pour ${row.name}: "${isOpenValue}", défaut à true`);
            isOpen = true;
          }
        } catch (e) {
          console.error(`[DB] Erreur parsing is_open pour ${row.name}:`, e);
          isOpen = true; // Par défaut, considérer ouvert
        }

        // Parser openingHours : toujours une string propre ou null
        let openingHours: string | null = null;
        try {
          if (row.opening_hours) {
            if (typeof row.opening_hours === 'string') {
              openingHours = row.opening_hours.trim();
            } else {
              openingHours = String(row.opening_hours).trim();
            }
            if (openingHours === '') {
              openingHours = null;
            }
          }
        } catch (e) {
          console.warn(`[DB] Erreur parsing opening_hours pour ${row.name}:`, e);
          openingHours = null;
        }

        const restaurant = {
          id: row.id,
          name: row.name,
          phone: row.phone,
          address: row.address,
          description: row.description || null,
          imageUrl: row.image_url || null,
          categories: categories || null, // Toujours null ou un tableau
          isOpen: Boolean(isOpen), // FORCER boolean
          openingHours: openingHours,
          deliveryTime: row.delivery_time || 30,
          minOrder: row.min_order || "0",
          rating: row.rating || "4.5",
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        } as Restaurant;
        
        // Log pour BOUBA uniquement
        if (restaurant.name && restaurant.name.toLowerCase().includes('bouba')) {
          console.log(`[DB] Restaurant ${restaurant.name} - isOpen: ${restaurant.isOpen} (raw: ${row.is_open_text}), openingHours: ${restaurant.openingHours} (raw: ${row.opening_hours})`);
        }
        return restaurant;
      });
      
      console.log("[DB] getAllRestaurants - Restaurants retournés:", restaurants.map(r => ({ name: r.name, isOpen: r.isOpen })));
      return restaurants;
    } catch (e) {
      console.error("[DB] getAllRestaurants error:", e);
      return [];
    }
  }

  async getRestaurantById(id: string): Promise<Restaurant | undefined> {
    try {
      console.log("[DB] getRestaurantById - ID:", id);
      const rawResult = await db.execute(sql`
        SELECT id, name, phone, address, description, image_url, categories, 
               is_open::text as is_open_text, opening_hours, delivery_time, 
               min_order, rating, created_at, updated_at 
        FROM restaurants WHERE id = ${id}
      `);
      
      if (!rawResult.rows || rawResult.rows.length === 0) {
        console.log("[DB] getRestaurantById - Aucun restaurant trouvé");
        return undefined;
      }
      
      const row = rawResult.rows[0] as any;
      console.log("[DB] getRestaurantById - is_open_text brut:", row.is_open_text, "type:", typeof row.is_open_text);
      
      // Parser isOpen de manière plus robuste (comme dans getAllRestaurants)
      let isOpen = false;
      try {
        if (row.is_open_text === 'true' || row.is_open_text === 't' || row.is_open_text === true) {
          isOpen = true;
        } else if (row.is_open_text === 'false' || row.is_open_text === 'f' || row.is_open_text === false) {
          isOpen = false;
        } else {
          console.warn(`[DB] Valeur is_open_text inattendue pour ${row.name}: "${row.is_open_text}", défaut à true`);
          isOpen = true;
        }
      } catch (e) {
        console.error(`[DB] Erreur parsing is_open pour ${row.name}:`, e);
        isOpen = true; // Par défaut, considérer ouvert
      }
      
      console.log("[DB] getRestaurantById - isOpen parsé:", isOpen);
      
      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        address: row.address,
        description: row.description,
        imageUrl: row.image_url,
        categories: row.categories ? (typeof row.categories === 'string' ? JSON.parse(row.categories) : row.categories) : [],
        isOpen,
        openingHours: row.opening_hours,
        deliveryTime: row.delivery_time,
        minOrder: row.min_order,
        rating: row.rating,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as Restaurant;
    } catch (e) {
      console.error("[DB] getRestaurantById error:", e);
      return undefined;
    }
  }

  async getRestaurantByPhone(phone: string): Promise<Restaurant | undefined> {
    try {
      const rawResult = await db.execute(sql`
        SELECT id, name, phone, address, description, image_url, categories, 
               is_open::text as is_open_text, opening_hours, delivery_time, 
               min_order, rating, created_at, updated_at 
        FROM restaurants WHERE phone = ${phone}
      `);
      
      if (!rawResult.rows || rawResult.rows.length === 0) {
        return undefined;
      }
      
      const row = rawResult.rows[0] as any;
      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        address: row.address,
        description: row.description,
        imageUrl: row.image_url,
        categories: row.categories ? (typeof row.categories === 'string' ? JSON.parse(row.categories) : row.categories) : [],
        isOpen: row.is_open_text === 'true',
        openingHours: row.opening_hours,
        deliveryTime: row.delivery_time,
        minOrder: row.min_order,
        rating: row.rating,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as Restaurant;
    } catch (e) {
      console.error("[DB] getRestaurantByPhone error:", e);
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
    console.log("[DB] updateRestaurant - ID:", id);
    console.log("[DB] updateRestaurant - Données à mettre à jour:", data);
    console.log("[DB] updateRestaurant - isOpen dans data:", data.isOpen, "type:", typeof data.isOpen);
    
    // Préparer les données pour la mise à jour
    const updateData: any = {
      updatedAt: new Date()
    };
    
    // Traiter isOpen séparément avec SQL brut car Drizzle a des problèmes avec les booléens
    let isOpenValue: boolean | undefined = undefined;
    if (data.isOpen !== undefined) {
      isOpenValue = Boolean(data.isOpen);
      console.log("[DB] updateRestaurant - isOpen à mettre à jour:", isOpenValue, "type:", typeof isOpenValue);
      // Ne pas inclure isOpen dans updateData pour éviter les conflits
    }
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.categories !== undefined) {
      updateData.categories = Array.isArray(data.categories) ? JSON.stringify(data.categories) : data.categories;
    }
    console.log("[DB] updateRestaurant - Données reçues (data.openingHours):", data.openingHours, "type:", typeof data.openingHours, "présent:", 'openingHours' in data);
    if (data.openingHours !== undefined) {
      updateData.openingHours = data.openingHours === "" ? null : data.openingHours;
      console.log("[DB] updateRestaurant - openingHours à sauvegarder:", updateData.openingHours, "type:", typeof updateData.openingHours);
    } else {
      console.log("[DB] updateRestaurant - openingHours NON inclus dans data (undefined)");
    }
    if (data.deliveryTime !== undefined) updateData.deliveryTime = data.deliveryTime;
    if (data.minOrder !== undefined) updateData.minOrder = data.minOrder;
    if (data.rating !== undefined) updateData.rating = data.rating;
    
    console.log("[DB] updateRestaurant - Données préparées pour Drizzle (sans isOpen):", updateData);
    
    // Mettre à jour isOpen AVANT la mise à jour Drizzle pour éviter les conflits
    if (isOpenValue !== undefined) {
      console.log("[DB] updateRestaurant - Exécution SQL brut pour isOpen EN PREMIER:", isOpenValue);
      try {
        const sqlResult = await db.execute(sql`
          UPDATE restaurants 
          SET is_open = ${isOpenValue}::boolean, updated_at = NOW()
          WHERE id = ${id}
        `);
        console.log("[DB] updateRestaurant - SQL brut exécuté, lignes affectées:", sqlResult.rowCount);
        
        // Vérifier directement dans la DB que la valeur a été mise à jour
        const verifyResult = await db.execute(sql`
          SELECT is_open::text as is_open_text FROM restaurants WHERE id = ${id}
        `);
        if (verifyResult.rows && verifyResult.rows.length > 0) {
          const row = verifyResult.rows[0] as any;
          console.log("[DB] updateRestaurant - Vérification DB immédiate - is_open_text:", row.is_open_text);
        }
      } catch (sqlError) {
        console.error("[DB] updateRestaurant - Erreur SQL brut pour isOpen:", sqlError);
        throw sqlError;
      }
    }
    
    // Utiliser Drizzle pour la mise à jour des autres champs (sans isOpen)
    if (Object.keys(updateData).length > 1) { // Plus que juste updatedAt
      console.log("[DB] updateRestaurant - Données Drizzle complètes:", JSON.stringify(updateData, null, 2));
      console.log("[DB] updateRestaurant - openingHours dans updateData avant Drizzle:", updateData.openingHours, "présent:", 'openingHours' in updateData);
      await db.update(restaurants)
        .set(updateData)
        .where(eq(restaurants.id, id));
      console.log("[DB] updateRestaurant - Mise à jour Drizzle effectuée");
      
      // Vérifier immédiatement après la mise à jour
      const verifyResult = await db.execute(sql`
        SELECT opening_hours FROM restaurants WHERE id = ${id}
      `);
      if (verifyResult.rows && verifyResult.rows.length > 0) {
        const verifyRow = verifyResult.rows[0] as any;
        console.log("[DB] updateRestaurant - Vérification opening_hours après Drizzle:", verifyRow.opening_hours);
      }
    }
    
    // Récupérer le restaurant mis à jour
    console.log("[DB] updateRestaurant - Récupération du restaurant mis à jour...");
    const result = await this.getRestaurantById(id);
    if (!result) {
      throw new Error("Failed to retrieve updated restaurant");
    }
    
    console.log("[DB] updateRestaurant - Restaurant récupéré - isOpen:", result.isOpen, "type:", typeof result.isOpen);
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
  async acceptOrderByDriver(orderId: string, driverId: string): Promise<Order | null> {
    // Accept if order is accepted or ready AND not assigned to anyone
    // Driver can accept early to prepare for pickup (MVP: simplified workflow)
    const result = await db.update(orders)
      .set({ 
        driverId, 
        updatedAt: new Date() 
      })
      .where(and(
        eq(orders.id, orderId),
        sql`${orders.status} IN ('accepted', 'ready')`,
        sql`(${orders.driverId} IS NULL OR ${orders.driverId} = '')`
      ));
    
    // Check if update was successful
    const order = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order[0]) return null;
    
    // If the order now belongs to this driver, success!
    if (order[0].driverId === driverId) {
      return order[0];
    }
    
    // Someone else got it first
    return null;
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

  async getPizzasByRestaurant(restaurantId: string): Promise<Pizza[]> {
    try {
      // Ne retourner que les produits disponibles (available = true)
      const result = await db.select()
        .from(pizzas)
        .where(and(
          eq(pizzas.restaurantId, restaurantId),
          eq(pizzas.available, true)
        ));
      console.log(`[DB] getPizzasByRestaurant(${restaurantId}): ${result.length} produits disponibles trouvés`);
      return result;
    } catch (error) {
      console.error(`[DB] Erreur getPizzasByRestaurant(${restaurantId}):`, error);
      return [];
    }
  }

  async createPizza(pizza: any): Promise<Pizza> {
    const pizzaId = randomUUID();
    const pizzaWithId = { ...pizza, id: pizzaId };
    
    await db.insert(pizzas).values(pizzaWithId);
    
    const result = await db.select().from(pizzas).where(eq(pizzas.id, pizzaId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created pizza");
    }
    return result[0];
  }

  async updatePizza(id: string, pizza: any): Promise<Pizza> {
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
  async getPizzaPrices(pizzaId: string): Promise<any[]> {
    return await db.select().from(pizzaPrices).where(eq(pizzaPrices.pizzaId, pizzaId));
  }

  async createPizzaPrice(price: any): Promise<any> {
    const priceId = randomUUID();
    const priceWithId = { ...price, id: priceId };
    
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
    const otpRecord = await this.getLatestOtpCode(phone);
    if (!otpRecord) return false;
    if (otpRecord.verified) return false;
    if (new Date() > otpRecord.expiresAt) return false;
    if ((otpRecord.attempts || 0) >= 3) return false;
    
    // Accept demo code "1234" for testing OR the actual stored code
    const isValidCode = code === "1234" || otpRecord.code === code;
    
    if (!isValidCode) {
      await db.update(otpCodes).set({ attempts: (otpRecord.attempts || 0) + 1 }).where(eq(otpCodes.id, otpRecord.id));
      return false;
    }
    await db.update(otpCodes).set({ verified: true }).where(eq(otpCodes.id, otpRecord.id));
    return true;
  }

  // ============ ORDERS ============
  async createOrder(order: any): Promise<Order> {
    const orderId = randomUUID();
    const orderWithId = { ...order, id: orderId };
    
    await db.insert(orders).values(orderWithId);
    
    const result = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created order");
    }
    return result[0];
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id));
    return result[0];
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrdersByPhone(phone: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.phone, phone)).orderBy(desc(orders.createdAt));
  }

  async getReadyOrders(): Promise<Order[]> {
    // Get orders that are accepted or ready and not yet assigned to a driver
    // This allows drivers to see orders early and prepare to pick them up (MVP: simplified workflow)
    const result = await db.select().from(orders)
      .where(and(
        inArray(orders.status, ['accepted', 'ready']),
        or(
          isNull(orders.driverId),
          eq(orders.driverId, '')
        )
      ))
      .orderBy(desc(orders.createdAt));
    return result || [];
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    await db.update(orders).set({ status: status as any, updatedAt: new Date() }).where(eq(orders.id, id));
    const result = await db.select().from(orders).where(eq(orders.id, id));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve updated order");
    }
    return result[0];
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: any): Promise<any> {
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

export const storage = new DatabaseStorage();
