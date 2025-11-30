import { db } from "./db.js";
import { 
  adminUsers, pizzas, pizzaPrices, otpCodes, orders, orderItems,
  type Pizza, type InsertAdminUser, type AdminUser, type Order, type OrderItem, type OtpCode
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Admin Users
  getAdminByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;

  // Pizzas
  getAllPizzas(): Promise<Pizza[]>;
  getPizzaById(id: string): Promise<Pizza | undefined>;
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
  updateOrderStatus(id: string, status: string): Promise<Order>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: any): Promise<OrderItem>;
}

export class DatabaseStorage implements IStorage {
  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    const result = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return result[0];
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    // Generate UUID client-side since .returning() doesn't work reliably with Neon HTTP
    const adminId = randomUUID();
    const adminWithId = { ...user, id: adminId };
    
    await db.insert(adminUsers).values(adminWithId);
    
    // Fetch the created admin to return it
    const result = await db.select().from(adminUsers).where(eq(adminUsers.id, adminId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created admin user");
    }
    return result[0];
  }

  async getAllPizzas(): Promise<Pizza[]> {
    return await db.select().from(pizzas);
  }

  async getPizzaById(id: string): Promise<Pizza | undefined> {
    const result = await db.select().from(pizzas).where(eq(pizzas.id, id));
    return result[0];
  }

  async createPizza(pizza: any): Promise<Pizza> {
    // Generate UUID client-side since .returning() doesn't work reliably with Neon HTTP
    const pizzaId = randomUUID();
    const pizzaWithId = { ...pizza, id: pizzaId };
    
    await db.insert(pizzas).values(pizzaWithId);
    
    // Fetch the created pizza to return it
    const result = await db.select().from(pizzas).where(eq(pizzas.id, pizzaId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created pizza");
    }
    return result[0];
  }

  async updatePizza(id: string, pizza: any): Promise<Pizza> {
    const result = await db.update(pizzas).set({ ...pizza, updatedAt: new Date() }).where(eq(pizzas.id, id)).returning();
    return result[0];
  }

  async deletePizza(id: string): Promise<void> {
    await db.delete(pizzas).where(eq(pizzas.id, id));
  }

  async getPizzaPrices(pizzaId: string): Promise<any[]> {
    return await db.select().from(pizzaPrices).where(eq(pizzaPrices.pizzaId, pizzaId));
  }

  async createPizzaPrice(price: any): Promise<any> {
    // Generate UUID client-side since .returning() doesn't work reliably with Neon HTTP
    const priceId = randomUUID();
    const priceWithId = { ...price, id: priceId };
    
    await db.insert(pizzaPrices).values(priceWithId);
    
    // Fetch the created price to return it
    const result = await db.select().from(pizzaPrices).where(eq(pizzaPrices.id, priceId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created pizza price");
    }
    return result[0];
  }

  async createOtpCode(phone: string, code: string, expiresAt: Date): Promise<OtpCode> {
    // Generate UUID client-side since .returning() doesn't work reliably with Neon HTTP
    const otpId = randomUUID();
    
    await db.insert(otpCodes).values({ id: otpId, phone, code, expiresAt });
    
    // Fetch the created OTP code to return it
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
    if (otpRecord.code !== code) {
      await db.update(otpCodes).set({ attempts: (otpRecord.attempts || 0) + 1 }).where(eq(otpCodes.id, otpRecord.id));
      return false;
    }
    await db.update(otpCodes).set({ verified: true }).where(eq(otpCodes.id, otpRecord.id));
    return true;
  }

  async createOrder(order: any): Promise<Order> {
    // Generate UUID client-side since .returning() doesn't work reliably with Neon HTTP
    const orderId = randomUUID();
    const orderWithId = { ...order, id: orderId };
    
    await db.insert(orders).values(orderWithId);
    
    // Fetch the created order to return it
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
    return await db.select().from(orders);
  }

  async getOrdersByPhone(phone: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.phone, phone));
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const result = await db.update(orders).set({ status: status as any, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: any): Promise<any> {
    // Generate UUID client-side since .returning() doesn't work reliably with Neon HTTP
    const itemId = randomUUID();
    const itemWithId = { ...item, id: itemId };
    
    await db.insert(orderItems).values(itemWithId);
    
    // Fetch the created order item to return it
    const result = await db.select().from(orderItems).where(eq(orderItems.id, itemId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created order item");
    }
    return result[0];
  }
}

export const storage = new DatabaseStorage();
