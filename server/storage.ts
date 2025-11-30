import { db } from "./db.js";
import { 
  adminUsers, pizzas, pizzaPrices, otpCodes, orders, orderItems,
  type Pizza, type InsertAdminUser, type AdminUser, type Order, type OrderItem, type OtpCode
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

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
}

export class DatabaseStorage implements IStorage {
  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    const result = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return result[0];
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    const result = await db.insert(adminUsers).values(user).returning();
    return result[0];
  }

  async getAllPizzas(): Promise<Pizza[]> {
    return await db.select().from(pizzas).orderBy(pizzas.createdAt);
  }

  async getPizzaById(id: string): Promise<Pizza | undefined> {
    const result = await db.select().from(pizzas).where(eq(pizzas.id, id));
    return result[0];
  }

  async createPizza(pizza: any): Promise<Pizza> {
    const result = await db.insert(pizzas).values(pizza).returning();
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
    const result = await db.insert(pizzaPrices).values(price).returning();
    return result[0];
  }

  async createOtpCode(phone: string, code: string, expiresAt: Date): Promise<OtpCode> {
    const result = await db.insert(otpCodes).values({ phone, code, expiresAt }).returning();
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
    const result = await db.insert(orders).values(order).returning();
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

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const result = await db.update(orders).set({ status: status as any, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }
}

export const storage = new DatabaseStorage();
