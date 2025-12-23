import "dotenv/config";
import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Exécute les migrations SQL directement via Drizzle
 * Utilisé au démarrage sur Render quand drizzle-kit n'est pas disponible
 */
export async function runMigrationsOnStartup() {
  try {
    console.log("[DB] Exécution des migrations automatiques...");

    // Créer la table otp_codes si elle n'existe pas
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        attempts INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[DB] ✅ Table otp_codes créée/vérifiée");

    // Créer la table admin_users si elle n'existe pas
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[DB] ✅ Table admin_users créée/vérifiée");

    // Créer la table restaurants si elle n'existe pas
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS restaurants (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        address TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        categories TEXT,
        is_open BOOLEAN DEFAULT true,
        opening_hours TEXT,
        delivery_time INTEGER DEFAULT 30,
        min_order NUMERIC(10, 2) DEFAULT 0,
        rating NUMERIC(2, 1) DEFAULT 4.5,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[DB] ✅ Table restaurants créée/vérifiée");
    
    // Ajouter la colonne categories si elle n'existe pas et migrer category vers categories
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'restaurants' AND column_name = 'categories'
        ) THEN
          ALTER TABLE restaurants ADD COLUMN categories TEXT;
          -- Migrer les données existantes de category vers categories
          UPDATE restaurants 
          SET categories = CASE 
            WHEN category IS NOT NULL THEN json_build_array(category)::text
            ELSE '["pizza"]'::text
          END
          WHERE categories IS NULL;
        END IF;
      END $$;
    `);
    console.log("[DB] ✅ Colonne categories ajoutée/vérifiée");

    // Créer la table drivers si elle n'existe pas
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS drivers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        status TEXT DEFAULT 'available',
        last_seen TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[DB] ✅ Table drivers créée/vérifiée");

    // Créer la table pizzas si elle n'existe pas
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pizzas (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id VARCHAR NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        product_type TEXT DEFAULT 'pizza',
        category TEXT NOT NULL,
        image_url TEXT,
        available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[DB] ✅ Table pizzas créée/vérifiée");
    
    // Ajouter la colonne product_type si elle n'existe pas (migration)
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'pizzas' AND column_name = 'product_type'
        ) THEN
          ALTER TABLE pizzas ADD COLUMN product_type TEXT DEFAULT 'pizza';
        END IF;
      END $$;
    `);
    console.log("[DB] ✅ Colonne product_type ajoutée/vérifiée");

    // Créer la table pizza_prices si elle n'existe pas
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pizza_prices (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        pizza_id VARCHAR NOT NULL REFERENCES pizzas(id) ON DELETE CASCADE,
        size TEXT NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(pizza_id, size)
      );
    `);
    console.log("[DB] ✅ Table pizza_prices créée/vérifiée");

    // Créer la table orders si elle n'existe pas
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id VARCHAR NOT NULL REFERENCES restaurants(id),
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        address_details TEXT,
        customer_lat NUMERIC(10, 7),
        customer_lng NUMERIC(10, 7),
        status TEXT DEFAULT 'pending',
        total_price NUMERIC(10, 2) NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        notes TEXT,
        estimated_delivery_time INTEGER,
        driver_id VARCHAR REFERENCES drivers(id) ON DELETE SET NULL,
        assigned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[DB] ✅ Table orders créée/vérifiée");

    // Créer la table order_items si elle n'existe pas
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id VARCHAR NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        pizza_id VARCHAR NOT NULL REFERENCES pizzas(id),
        size TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price_per_unit NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[DB] ✅ Table order_items créée/vérifiée");

    console.log("[DB] 🎉 Toutes les migrations sont terminées avec succès!");
  } catch (error: any) {
    console.error("[DB] ❌ Erreur lors des migrations:", error.message);
    // On continue quand même, certaines tables peuvent déjà exister
  }
}


