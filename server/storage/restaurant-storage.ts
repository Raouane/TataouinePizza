import { db } from "../db.js";
import { restaurants, orders, type Restaurant, type InsertRestaurant, type Order } from "../../shared/schema.js";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseStorage } from "./base-storage.js";

/**
 * Storage pour les restaurants
 * Gère les opérations CRUD pour les restaurants
 */
export class RestaurantStorage extends BaseStorage {
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
        SELECT id, name, phone, password, address, description, image_url, categories, 
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
      console.log("[STORAGE] 🔍 getRestaurantByPhone - Recherche avec téléphone:", phone);
      
      // Essayer d'abord avec le téléphone tel quel
      console.log("[STORAGE] 📞 Tentative 1: Recherche avec téléphone exact:", phone);
      let rawResult = await db.execute(sql`
        SELECT id, name, phone, password, address, description, image_url, categories, 
               is_open::text as is_open_text, opening_hours, delivery_time, 
               min_order, rating, order_type, created_at, updated_at 
        FROM restaurants WHERE phone = ${phone}
      `);
      
      console.log("[STORAGE] 📊 Résultat tentative 1:", {
        rowsFound: rawResult.rows?.length || 0,
        hasPassword: rawResult.rows?.[0]?.password ? "OUI" : "NON"
      });
      
      // Si pas trouvé et que le téléphone commence par 216, essayer sans le préfixe
      if ((!rawResult.rows || rawResult.rows.length === 0) && phone.startsWith('216')) {
        const phoneWithoutPrefix = phone.substring(3);
        console.log("[STORAGE] 📞 Tentative 2: Recherche sans préfixe 216:", phoneWithoutPrefix);
        rawResult = await db.execute(sql`
          SELECT id, name, phone, password, address, description, image_url, categories, 
                 is_open::text as is_open_text, opening_hours, delivery_time, 
                 min_order, rating, order_type, created_at, updated_at 
          FROM restaurants WHERE phone = ${phoneWithoutPrefix}
        `);
        console.log("[STORAGE] 📊 Résultat tentative 2:", {
          rowsFound: rawResult.rows?.length || 0,
          hasPassword: rawResult.rows?.[0]?.password ? "OUI" : "NON"
        });
      }
      
      // Si pas trouvé et que le téléphone ne commence pas par 216, essayer avec le préfixe
      if ((!rawResult.rows || rawResult.rows.length === 0) && !phone.startsWith('216')) {
        const phoneWithPrefix = `216${phone}`;
        console.log("[STORAGE] 📞 Tentative 3: Recherche avec préfixe 216:", phoneWithPrefix);
        rawResult = await db.execute(sql`
          SELECT id, name, phone, password, address, description, image_url, categories, 
                 is_open::text as is_open_text, opening_hours, delivery_time, 
                 min_order, rating, order_type, created_at, updated_at 
          FROM restaurants WHERE phone = ${phoneWithPrefix}
        `);
        console.log("[STORAGE] 📊 Résultat tentative 3:", {
          rowsFound: rawResult.rows?.length || 0,
          hasPassword: rawResult.rows?.[0]?.password ? "OUI" : "NON"
        });
      }
      
      if (!rawResult.rows || rawResult.rows.length === 0) {
        console.log("[STORAGE] ❌ Aucun restaurant trouvé pour téléphone:", phone);
        return undefined;
      }
      
      const row = rawResult.rows[0] as any;
      console.log("[STORAGE] ✅ Restaurant trouvé dans la DB:", {
        id: row.id,
        name: row.name,
        phone: row.phone,
        hasPassword: !!row.password,
        passwordType: typeof row.password,
        passwordValue: row.password ? row.password.substring(0, 20) + "..." : "NULL",
        allFields: Object.keys(row)
      });
      
      const restaurant = this.buildRestaurantFromRow(row);
      console.log("[STORAGE] 🏗️ Restaurant construit:", {
        id: restaurant.id,
        name: restaurant.name,
        phone: restaurant.phone,
        hasPassword: !!restaurant.password,
        passwordType: typeof restaurant.password,
        passwordValue: restaurant.password ? restaurant.password.substring(0, 20) + "..." : "NULL"
      });
      
      return restaurant;
    } catch (e) {
      console.log("[STORAGE] ❌ ERREUR dans getRestaurantByPhone:", e);
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
    
    // ✅ LOGS DE DIAGNOSTIC pour imageUrl
    console.log(`\n[RestaurantStorage] 🔄 ========================================`);
    console.log(`[RestaurantStorage] 🔄 MISE À JOUR RESTAURANT ${id}`);
    console.log(`[RestaurantStorage]    imageUrl reçu: ${data.imageUrl || 'NULL/UNDEFINED'}`);
    console.log(`[RestaurantStorage]    Type: ${typeof data.imageUrl}`);
    console.log(`[RestaurantStorage]    !== undefined: ${data.imageUrl !== undefined}`);
    console.log(`[RestaurantStorage]    !== null: ${data.imageUrl !== null}`);
    
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
    if (data.imageUrl !== undefined) {
      updateData.imageUrl = data.imageUrl;
      console.log(`[RestaurantStorage] ✅ imageUrl ajouté à updateData: ${updateData.imageUrl}`);
    } else {
      console.log(`[RestaurantStorage] ⚠️ imageUrl NON ajouté (undefined)`);
    }
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
      console.log(`[RestaurantStorage] 🔄 Exécution UPDATE Drizzle avec:`, JSON.stringify(updateData, null, 2));
      await db.update(restaurants)
        .set(updateData)
        .where(eq(restaurants.id, id));
      this.log('debug', 'updateRestaurant - Mise à jour Drizzle effectuée');
      console.log(`[RestaurantStorage] ✅ UPDATE Drizzle exécuté`);
    } else {
      console.log(`[RestaurantStorage] ⚠️ UPDATE Drizzle SKIPPÉ (seulement updatedAt)`);
    }
    
    // Récupérer le restaurant mis à jour
    const result = await this.getRestaurantById(id);
    if (!result) {
      throw new Error("Failed to retrieve updated restaurant");
    }
    
    console.log(`[RestaurantStorage] ✅ Restaurant récupéré après UPDATE`);
    console.log(`[RestaurantStorage]    imageUrl dans le résultat: ${result.imageUrl || 'NULL'}`);
    console.log(`[RestaurantStorage] ========================================\n`);
    
    this.log('debug', 'updateRestaurant - Restaurant récupéré', { isOpen: result.isOpen, type: typeof result.isOpen });
    return result;
  }

  async getOrdersByRestaurant(restaurantId: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.restaurantId, restaurantId)).orderBy(desc(orders.createdAt));
  }
}
