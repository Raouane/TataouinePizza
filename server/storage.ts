/**
 * Storage principal - Orchestration de tous les modules de storage
 * 
 * Ce fichier compose tous les modules de storage en une seule interface unifiée.
 * Chaque module est responsable d'un domaine spécifique :
 * - AdminStorage : Utilisateurs admin
 * - CustomerStorage : Clients
 * - RestaurantStorage : Restaurants
 * - DriverStorage : Livreurs
 * - PizzaStorage : Pizzas et prix
 * - OrderStorage : Commandes
 * - IdempotencyStorage : Clés d'idempotence
 * - TelegramStorage : Messages Telegram
 * - CashStorage : Remises de caisse
 * 
 * Note: OtpStorage a été supprimé (OTP complètement retiré du système)
 */

import type { 
  AdminUser, InsertAdminUser,
  Customer, InsertCustomer,
  Restaurant, InsertRestaurant,
  Driver, InsertDriver,
  Pizza, PizzaPrice,
  Order, OrderItem,
  CashHandover
} from "../shared/schema.js";
import type { z } from "zod";
import { orders, orderItems, insertPizzaSchema, insertPizzaPriceSchema } from "../shared/schema.js";

// Importer tous les modules de storage
import { AdminStorage } from "./storage/admin-storage.js";
import { CustomerStorage } from "./storage/customer-storage.js";
import { RestaurantStorage } from "./storage/restaurant-storage.js";
import { DriverStorage } from "./storage/driver-storage.js";
import { PizzaStorage } from "./storage/pizza-storage.js";
import { OrderStorage } from "./storage/order-storage.js";
import { IdempotencyStorage } from "./storage/idempotency-storage.js";
import { TelegramStorage } from "./storage/telegram-storage.js";
import { CashStorage } from "./storage/cash-storage.js";
import { AppSettingsStorage } from "./storage/app-settings-storage.js";

/**
 * Interface principale du storage
 * Définit toutes les méthodes disponibles pour accéder aux données
 */
export interface IStorage {
  // Admin Users
  getAdminByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;

  // Customers
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

  // Orders
  createOrder(order: typeof orders.$inferInsert): Promise<Order>;
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
  markOrderAsIgnoredByDriver(orderId: string, driverId: string): Promise<void>;
  getPendingOrdersWithoutDriver(limit?: number): Promise<Order[]>;

  // Idempotency Keys
  getIdempotencyKey(key: string): Promise<{ orderId: string; driverId: string; response: any } | undefined>;
  createIdempotencyKey(key: string, orderId: string, driverId: string, response: any): Promise<void>;
  deleteOldIdempotencyKeys(olderThanHours?: number): Promise<void>;

  // Telegram Messages
  saveTelegramMessage(orderId: string, driverId: string, chatId: string, messageId: number, status?: string, scheduledDeletionAt?: Date | null): Promise<void>;
  getTelegramMessagesByOrderId(orderId: string): Promise<Array<{ id: string; orderId: string; driverId: string; chatId: string; messageId: number; status: string; scheduledDeletionAt: Date | null }>>;
  getTelegramMessageByOrderAndDriver(orderId: string, driverId: string): Promise<{ id: string; orderId: string; driverId: string; chatId: string; messageId: number; status: string } | null>;
  updateTelegramMessageStatus(orderId: string, driverId: string, newStatus: string): Promise<void>;
  markTelegramMessageAsDeleted(messageId: string): Promise<void>;
  getTelegramMessagesByOrderIdAndDriver(orderId: string, driverId: string): Promise<Array<{
    id: string;
    orderId: string;
    driverId: string;
    chatId: string;
    messageId: number;
    status: string;
    scheduledDeletionAt: Date | null;
  }>>;
  getTelegramMessagesScheduledForDeletion(): Promise<Array<{
    id: string;
    orderId: string;
    driverId: string;
    chatId: string;
    messageId: number;
    status: string;
    scheduledDeletionAt: Date;
  }>>;

  // Cash Handovers
  createCashHandover(driverId: string, amount: number, deliveryCount: number, handoverDate: Date): Promise<CashHandover>;
  getLastCashHandover(driverId: string, date: Date): Promise<CashHandover | undefined>;
  validateCashHandover(handoverId: string, adminId: string): Promise<CashHandover>;
  isCashHandoverValidated(handoverId: string): Promise<boolean>;

  // App Settings
  getSetting(key: string): Promise<{ key: string; value: string; description?: string | null; updatedAt: Date; updatedBy?: string | null } | undefined>;
  getAllSettings(): Promise<Array<{ key: string; value: string; description?: string | null; updatedAt: Date; updatedBy?: string | null }>>;
  upsertSetting(key: string, value: string, description?: string, updatedBy?: string): Promise<{ key: string; value: string; description?: string | null; updatedAt: Date; updatedBy?: string | null }>;
  deleteSetting(key: string): Promise<void>;
}

/**
 * Classe principale qui compose tous les modules de storage
 * Délègue les appels aux modules spécialisés
 */
export class DatabaseStorage implements IStorage {
  // Instances des modules de storage
  private adminStorage = new AdminStorage();
  private customerStorage = new CustomerStorage();
  private restaurantStorage = new RestaurantStorage();
  private driverStorage = new DriverStorage();
  private pizzaStorage = new PizzaStorage();
  private orderStorage = new OrderStorage();
  private idempotencyStorage = new IdempotencyStorage();
  private telegramStorage = new TelegramStorage();
  private cashStorage = new CashStorage();
  private appSettingsStorage = new AppSettingsStorage();

  // ============ ADMIN ============
  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    return this.adminStorage.getAdminByEmail(email);
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    return this.adminStorage.createAdminUser(user);
  }

  // ============ CUSTOMERS ============
  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    return this.customerStorage.getCustomerByPhone(phone);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    return this.customerStorage.createCustomer(customer);
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    return this.customerStorage.updateCustomer(id, data);
  }

  // ============ RESTAURANTS ============
  async getAllRestaurants(): Promise<Restaurant[]> {
    return this.restaurantStorage.getAllRestaurants();
  }

  async getRestaurantById(id: string): Promise<Restaurant | undefined> {
    return this.restaurantStorage.getRestaurantById(id);
  }

  async getRestaurantByPhone(phone: string): Promise<Restaurant | undefined> {
    return this.restaurantStorage.getRestaurantByPhone(phone);
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    return this.restaurantStorage.createRestaurant(restaurant);
  }

  async updateRestaurant(id: string, data: Partial<Restaurant>): Promise<Restaurant> {
    return this.restaurantStorage.updateRestaurant(id, data);
  }

  async getOrdersByRestaurant(restaurantId: string): Promise<Order[]> {
    return this.restaurantStorage.getOrdersByRestaurant(restaurantId);
  }

  // ============ DRIVERS ============
  async getDriverByPhone(phone: string): Promise<Driver | undefined> {
    return this.driverStorage.getDriverByPhone(phone);
  }

  async createDriver(driver: InsertDriver): Promise<Driver> {
    return this.driverStorage.createDriver(driver);
  }

  async getDriverById(id: string): Promise<Driver | undefined> {
    return this.driverStorage.getDriverById(id);
  }

  async getAllDrivers(): Promise<Driver[]> {
    return this.driverStorage.getAllDrivers();
  }

  async getAvailableDrivers(): Promise<Driver[]> {
    return this.driverStorage.getAvailableDrivers();
  }

  async getOrdersByDriver(driverId: string): Promise<Order[]> {
    return this.driverStorage.getOrdersByDriver(driverId);
  }

  async updateDriverStatus(id: string, status: string): Promise<Driver> {
    return this.driverStorage.updateDriverStatus(id, status);
  }

  async updateDriver(id: string, data: Partial<Driver>): Promise<Driver> {
    return this.driverStorage.updateDriver(id, data);
  }

  async deleteDriver(id: string): Promise<void> {
    return this.driverStorage.deleteDriver(id);
  }

  async assignOrderToDriver(orderId: string, driverId: string): Promise<Order> {
    return this.driverStorage.assignOrderToDriver(orderId, driverId);
  }

  async acceptOrderByDriver(orderId: string, driverId: string): Promise<Order | null> {
    return this.driverStorage.acceptOrderByDriver(orderId, driverId);
  }

  // ============ PIZZAS ============
  async getAllPizzas(): Promise<Pizza[]> {
    return this.pizzaStorage.getAllPizzas();
  }

  async getPizzaById(id: string): Promise<Pizza | undefined> {
    return this.pizzaStorage.getPizzaById(id);
  }

  async getPizzasByIds(ids: string[]): Promise<Pizza[]> {
    return this.pizzaStorage.getPizzasByIds(ids);
  }

  async getPizzasByRestaurant(restaurantId: string): Promise<Pizza[]> {
    return this.pizzaStorage.getPizzasByRestaurant(restaurantId);
  }

  async createPizza(pizza: z.infer<typeof insertPizzaSchema>): Promise<Pizza> {
    return this.pizzaStorage.createPizza(pizza);
  }

  async updatePizza(id: string, pizza: Partial<z.infer<typeof insertPizzaSchema>>): Promise<Pizza> {
    return this.pizzaStorage.updatePizza(id, pizza);
  }

  async deletePizza(id: string): Promise<void> {
    return this.pizzaStorage.deletePizza(id);
  }

  // ============ PIZZA PRICES ============
  async getPizzaPrices(pizzaId: string): Promise<PizzaPrice[]> {
    return this.pizzaStorage.getPizzaPrices(pizzaId);
  }

  async getPizzaPricesByPizzaIds(pizzaIds: string[]): Promise<PizzaPrice[]> {
    return this.pizzaStorage.getPizzaPricesByPizzaIds(pizzaIds);
  }

  async createPizzaPrice(price: z.infer<typeof insertPizzaPriceSchema>): Promise<PizzaPrice> {
    return this.pizzaStorage.createPizzaPrice(price);
  }

  // ============ ORDERS ============
  async createOrder(order: typeof orders.$inferInsert): Promise<Order> {
    return this.orderStorage.createOrder(order);
  }

  async createOrderWithItems(
    order: typeof orders.$inferInsert,
    items: Array<Omit<typeof orderItems.$inferInsert, 'orderId' | 'id'>>,
    checkDuplicate?: { phone: string; restaurantId: string; totalPrice: string; withinSeconds: number }
  ): Promise<Order | null> {
    return this.orderStorage.createOrderWithItems(order, items, checkDuplicate);
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    return this.orderStorage.getOrderById(id);
  }

  async getOrderByClientOrderId(clientOrderId: string): Promise<Order | undefined> {
    return this.orderStorage.getOrderByClientOrderId(clientOrderId);
  }

  async getRecentDuplicateOrder(
    phone: string,
    restaurantId: string,
    totalPrice: string,
    withinSeconds: number = 10
  ): Promise<Order | undefined> {
    return this.orderStorage.getRecentDuplicateOrder(phone, restaurantId, totalPrice, withinSeconds);
  }

  async getAllOrders(): Promise<Order[]> {
    return this.orderStorage.getAllOrders();
  }

  async getOrdersByPhone(phone: string): Promise<Order[]> {
    return this.orderStorage.getOrdersByPhone(phone);
  }

  async getReadyOrders(): Promise<Order[]> {
    return this.orderStorage.getReadyOrders();
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    return this.orderStorage.updateOrderStatus(id, status);
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return this.orderStorage.getOrderItems(orderId);
  }

  async createOrderItem(item: typeof orderItems.$inferInsert): Promise<OrderItem> {
    return this.orderStorage.createOrderItem(item);
  }

  async markOrderAsIgnoredByDriver(orderId: string, driverId: string): Promise<void> {
    return this.orderStorage.markOrderAsIgnoredByDriver(orderId, driverId);
  }

  async getPendingOrdersWithoutDriver(limit: number = 10): Promise<Order[]> {
    return this.orderStorage.getPendingOrdersWithoutDriver(limit);
  }

  // ============ IDEMPOTENCY KEYS ============
  async getIdempotencyKey(key: string): Promise<{ orderId: string; driverId: string; response: any } | undefined> {
    return this.idempotencyStorage.getIdempotencyKey(key);
  }

  async createIdempotencyKey(key: string, orderId: string, driverId: string, response: any): Promise<void> {
    return this.idempotencyStorage.createIdempotencyKey(key, orderId, driverId, response);
  }

  async deleteOldIdempotencyKeys(olderThanHours: number = 1): Promise<void> {
    return this.idempotencyStorage.deleteOldIdempotencyKeys(olderThanHours);
  }

  // ============ TELEGRAM MESSAGES ============
  async saveTelegramMessage(
    orderId: string,
    driverId: string,
    chatId: string,
    messageId: number,
    status: string = "sent",
    scheduledDeletionAt?: Date | null
  ): Promise<void> {
    return this.telegramStorage.saveTelegramMessage(orderId, driverId, chatId, messageId, status, scheduledDeletionAt);
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
    return this.telegramStorage.getTelegramMessagesByOrderId(orderId);
  }

  async getTelegramMessageByOrderAndDriver(orderId: string, driverId: string): Promise<{
    id: string;
    orderId: string;
    driverId: string;
    chatId: string;
    messageId: number;
    status: string;
  } | null> {
    return this.telegramStorage.getTelegramMessageByOrderAndDriver(orderId, driverId);
  }

  async updateTelegramMessageStatus(orderId: string, driverId: string, newStatus: string): Promise<void> {
    return this.telegramStorage.updateTelegramMessageStatus(orderId, driverId, newStatus);
  }

  async markTelegramMessageAsDeleted(messageId: string): Promise<void> {
    return this.telegramStorage.markTelegramMessageAsDeleted(messageId);
  }

  async getTelegramMessagesByOrderIdAndDriver(orderId: string, driverId: string): Promise<Array<{
    id: string;
    orderId: string;
    driverId: string;
    chatId: string;
    messageId: number;
    status: string;
    scheduledDeletionAt: Date | null;
  }>> {
    return this.telegramStorage.getTelegramMessagesByOrderIdAndDriver(orderId, driverId);
  }

  async getTelegramMessagesScheduledForDeletion(): Promise<Array<{
    id: string;
    orderId: string;
    driverId: string;
    chatId: string;
    messageId: number;
    status: string;
    scheduledDeletionAt: Date;
  }>> {
    return this.telegramStorage.getTelegramMessagesScheduledForDeletion();
  }

  // ============ CASH HANDOVERS ============
  async createCashHandover(driverId: string, amount: number, deliveryCount: number, handoverDate: Date): Promise<CashHandover> {
    return this.cashStorage.createCashHandover(driverId, amount, deliveryCount, handoverDate);
  }

  async getLastCashHandover(driverId: string, date: Date): Promise<CashHandover | undefined> {
    return this.cashStorage.getLastCashHandover(driverId, date);
  }

  async validateCashHandover(handoverId: string, adminId: string): Promise<CashHandover> {
    return this.cashStorage.validateCashHandover(handoverId, adminId);
  }

  async isCashHandoverValidated(handoverId: string): Promise<boolean> {
    return this.cashStorage.isCashHandoverValidated(handoverId);
  }

  // ============ APP SETTINGS ============
  async getSetting(key: string) {
    return this.appSettingsStorage.getSetting(key);
  }

  async getAllSettings() {
    return this.appSettingsStorage.getAllSettings();
  }

  async upsertSetting(key: string, value: string, description?: string, updatedBy?: string) {
    return this.appSettingsStorage.upsertSetting(key, value, description, updatedBy);
  }

  async deleteSetting(key: string): Promise<void> {
    return this.appSettingsStorage.deleteSetting(key);
  }
}

// Instance singleton exportée
export const storage = new DatabaseStorage();
