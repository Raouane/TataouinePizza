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
      // Use raw SQL with text cast to bypass Neon HTTP boolean parsing bug
      const rawResult = await db.execute(sql`
        SELECT id, name, phone, address, description, image_url, categories, 
               is_open::text as is_open_text, opening_hours, delivery_time, 
               min_order, rating, created_at, updated_at 
        FROM restaurants ORDER BY name
      `);
      
      if (!rawResult.rows || rawResult.rows.length === 0) {
        return [];
      }
      
      return rawResult.rows.map((row: any) => ({
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
      })) as Restaurant[];
    } catch (e) {
      console.error("[DB] getAllRestaurants error:", e);
      return [];
    }
  }

  async getRestaurantById(id: string): Promise<Restaurant | undefined> {
    try {
      const rawResult = await db.execute(sql`
        SELECT id, name, phone, address, description, image_url, categories, 
               is_open::text as is_open_text, opening_hours, delivery_time, 
               min_order, rating, created_at, updated_at 
        FROM restaurants WHERE id = ${id}
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
    const restaurantWithId = { ...restaurant, id: restaurantId };
    await db.insert(restaurants).values(restaurantWithId);
    const result = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created restaurant");
    }
    return result[0];
  }

  async updateRestaurant(id: string, data: Partial<Restaurant>): Promise<Restaurant> {
    await db.update(restaurants).set({ ...data, updatedAt: new Date() }).where(eq(restaurants.id, id));
    // Use getRestaurantById which has proper boolean parsing
    const result = await this.getRestaurantById(id);
    if (!result) {
      throw new Error("Failed to retrieve updated restaurant");
    }
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
    // Accept if order is accepted/preparing/baking/ready AND not assigned to anyone
    // Driver can accept early to prepare for pickup
    const result = await db.update(orders)
      .set({ 
        driverId, 
        updatedAt: new Date() 
      })
      .where(and(
        eq(orders.id, orderId),
        sql`${orders.status} IN ('accepted', 'preparing', 'baking', 'ready')`,
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
    return await db.select().from(pizzas);
  }

  async getPizzaById(id: string): Promise<Pizza | undefined> {
    const result = await db.select().from(pizzas).where(eq(pizzas.id, id));
    return result[0];
  }

  async getPizzasByRestaurant(restaurantId: string): Promise<Pizza[]> {
    return await db.select().from(pizzas).where(eq(pizzas.restaurantId, restaurantId));
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
    // Get orders that are accepted/preparing/baking/ready and not yet assigned to a driver
    // This allows drivers to see orders early and prepare to pick them up
    const result = await db.select().from(orders)
      .where(and(
        inArray(orders.status, ['accepted', 'preparing', 'baking', 'ready']),
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
