import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "accepted",
  "preparing",
  "baking",
  "ready",
  "delivery",
  "delivered",
  "rejected"
]);

export const pizzaSizeEnum = pgEnum("pizza_size", ["small", "medium", "large"]);

// Admin Users (for global supervision)
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Restaurants
export const restaurants = pgTable("restaurants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  address: text("address").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  category: text("category").default("pizza"), // pizza, burger, etc.
  isOpen: boolean("is_open").default(true),
  openingHours: text("opening_hours"), // "09:00-23:00"
  deliveryTime: integer("delivery_time").default(30), // minutes
  minOrder: numeric("min_order", { precision: 10, scale: 2 }).default("0"),
  rating: numeric("rating", { precision: 2, scale: 1 }).default("4.5"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Delivery Drivers
export const drivers = pgTable("drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  status: text("status").default("available"), // "available", "on_delivery", "offline"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pizzas Menu - now linked to restaurant
export const pizzas = pgTable("pizzas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // "classic", "special", "vegetarian"
  imageUrl: text("image_url"),
  available: boolean("available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pizza Prices (support multiple sizes)
export const pizzaPrices = pgTable("pizza_prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pizzaId: varchar("pizza_id").notNull().references(() => pizzas.id, { onDelete: "cascade" }),
  size: pizzaSizeEnum("size").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
});

// OTP Codes (for SMS verification)
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer Orders - now linked to restaurant
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  addressDetails: text("address_details"),
  status: orderStatusEnum("status").default("pending"),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").default("cash"),
  notes: text("notes"),
  estimatedDeliveryTime: integer("estimated_delivery_time"), // in minutes
  driverId: varchar("driver_id").references(() => drivers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order Items
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  pizzaId: varchar("pizza_id").notNull().references(() => pizzas.id),
  size: pizzaSizeEnum("size").notNull(),
  quantity: integer("quantity").notNull(),
  pricePerUnit: numeric("price_per_unit", { precision: 10, scale: 2 }).notNull(),
});

// Zod Schemas for validation
export const insertAdminUserSchema = createInsertSchema(adminUsers)
  .pick({ email: true, password: true })
  .extend({
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Mot de passe min 6 caractères"),
  });

export const insertRestaurantSchema = createInsertSchema(restaurants)
  .pick({ name: true, phone: true, address: true, description: true, imageUrl: true, category: true })
  .extend({
    name: z.string().min(2, "Nom min 2 caractères"),
    phone: z.string().min(8, "Téléphone invalide"),
    address: z.string().min(5, "Adresse invalide"),
  });

export const insertPizzaSchema = createInsertSchema(pizzas)
  .pick({ restaurantId: true, name: true, description: true, category: true, imageUrl: true, available: true })
  .extend({
    name: z.string().min(2, "Nom min 2 caractères"),
    category: z.enum(["classic", "special", "vegetarian"]),
    available: z.boolean().optional().default(true),
  });

export const insertPizzaPriceSchema = createInsertSchema(pizzaPrices)
  .pick({ pizzaId: true, size: true, price: true })
  .extend({
    price: z.string().or(z.number()).pipe(z.coerce.number().positive("Prix doit être positif")),
  });

export const insertOrderSchema = z.object({
  restaurantId: z.string(),
  customerName: z.string().min(2, "Nom min 2 caractères"),
  phone: z.string().min(8, "Téléphone invalide"),
  address: z.string().min(5, "Adresse invalide"),
  addressDetails: z.string().optional(),
  items: z.array(z.object({
    pizzaId: z.string(),
    size: z.enum(["small", "medium", "large"]),
    quantity: z.number().min(1),
  })).min(1, "Au moins 1 item requis"),
});

export const verifyOtpSchema = z.object({
  phone: z.string(),
  code: z.string().length(4, "Code 4 chiffres"),
});

export const sendOtpSchema = z.object({
  phone: z.string().min(8, "Téléphone invalide"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "accepted", "preparing", "baking", "ready", "delivery", "delivered", "rejected"]),
});

// Driver Schemas
export const insertDriverSchema = z.object({
  name: z.string().min(2, "Nom min 2 caractères"),
  phone: z.string().min(8, "Téléphone invalide"),
  password: z.string().min(6, "Mot de passe min 6 caractères"),
});

export const driverLoginSchema = z.object({
  phone: z.string().min(8, "Téléphone invalide"),
  password: z.string().min(6, "Mot de passe min 6 caractères"),
});

// Types
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Pizza = typeof pizzas.$inferSelect;
export type PizzaPrice = typeof pizzaPrices.$inferSelect;
export type OtpCode = typeof otpCodes.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
