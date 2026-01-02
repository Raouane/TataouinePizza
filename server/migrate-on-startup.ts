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

    // Créer la table customers si elle n'existe pas (authentification simple - MVP)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[DB] ✅ Table customers créée/vérifiée");

    // Créer la table restaurants si elle n'existe pas
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS restaurants (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        password TEXT,
        address TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        categories TEXT,
        is_open BOOLEAN DEFAULT true,
        opening_hours TEXT,
        delivery_time INTEGER DEFAULT 30,
        min_order NUMERIC(10, 2) DEFAULT 0,
        rating NUMERIC(2, 1) DEFAULT 4.5,
        order_type TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[DB] ✅ Table restaurants créée/vérifiée");
    
    // Ajouter la colonne password si elle n'existe pas
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'restaurants' AND column_name = 'password'
        ) THEN
          ALTER TABLE restaurants ADD COLUMN password TEXT;
          RAISE NOTICE 'Colonne password ajoutée à restaurants';
        END IF;
      END $$;
    `);
    console.log("[DB] ✅ Colonne password vérifiée pour restaurants");
    
    // Ajouter la colonne order_type si elle n'existe pas
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'restaurants' AND column_name = 'order_type'
        ) THEN
          ALTER TABLE restaurants ADD COLUMN order_type TEXT;
          RAISE NOTICE 'Colonne order_type ajoutée à restaurants';
        END IF;
      END $$;
    `);
    console.log("[DB] ✅ Colonne order_type vérifiée");
    
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

    // Migration : Convertir categories de TEXT vers JSONB (si pas déjà fait)
    try {
      await db.execute(sql`
        DO $$ 
        BEGIN
          -- Vérifier si categories est encore TEXT et convertir vers JSONB
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'restaurants' 
            AND column_name = 'categories' 
            AND data_type = 'text'
          ) THEN
            -- Créer une colonne temporaire JSONB
            ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS categories_jsonb JSONB;
            
            -- Migrer les données : parser le JSON string en JSONB
            UPDATE restaurants 
            SET categories_jsonb = CASE 
              WHEN categories IS NULL OR categories = '' THEN NULL
              WHEN categories::text LIKE '[%' OR categories::text LIKE '{%' THEN categories::jsonb
              ELSE jsonb_build_array(categories)::jsonb
            END;
            
            -- Supprimer l'ancienne colonne TEXT
            ALTER TABLE restaurants DROP COLUMN categories;
            
            -- Renommer la nouvelle colonne
            ALTER TABLE restaurants RENAME COLUMN categories_jsonb TO categories;
            
            RAISE NOTICE 'Colonne categories migrée de TEXT vers JSONB';
          END IF;
        END $$;
      `);
      console.log("[DB] ✅ Migration categories vers JSONB vérifiée");
    } catch (error: any) {
      // La migration peut échouer si la colonne est déjà JSONB ou n'existe pas
      console.log("[DB] ℹ️ Migration categories vers JSONB :", error.message.includes('already exists') || error.message.includes('does not exist') ? 'Déjà migrée ou non nécessaire' : error.message);
    }

    // Créer la table drivers si elle n'existe pas
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS drivers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        status TEXT DEFAULT 'available',
        last_seen TIMESTAMP DEFAULT NOW(),
        push_subscription TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[DB] ✅ Table drivers créée/vérifiée");
    
    // Ajouter la colonne push_subscription si elle n'existe pas (pour les tables existantes)
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'drivers' AND column_name = 'push_subscription'
        ) THEN
          ALTER TABLE drivers ADD COLUMN push_subscription TEXT;
          RAISE NOTICE 'Colonne push_subscription ajoutée à drivers';
        END IF;
      END $$;
    `);
    console.log("[DB] ✅ Colonne push_subscription vérifiée");

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
        client_order_id VARCHAR,
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
    
    // Ajouter la colonne client_order_id si elle n'existe pas (pour les tables existantes)
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'orders' AND column_name = 'client_order_id'
        ) THEN
          ALTER TABLE orders ADD COLUMN client_order_id VARCHAR;
        END IF;
      END $$;
    `);
    console.log("[DB] ✅ Colonne client_order_id ajoutée/vérifiée");

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

    // Créer la table telegram_messages si elle n'existe pas (pour stocker les messageId et pouvoir les modifier)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS telegram_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id VARCHAR NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        driver_id VARCHAR NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        chat_id TEXT NOT NULL,
        message_id INTEGER NOT NULL,
        status TEXT DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[DB] ✅ Table telegram_messages créée/vérifiée");
    
    // Créer les index pour améliorer les performances
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_telegram_messages_order_id ON telegram_messages(order_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_telegram_messages_driver_id ON telegram_messages(driver_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_telegram_messages_order_driver ON telegram_messages(order_id, driver_id);
    `);
    console.log("[DB] ✅ Index telegram_messages créés/vérifiés");

    console.log("[DB] 🎉 Toutes les migrations sont terminées avec succès!");
  } catch (error: any) {
    console.error("[DB] ❌ Erreur lors des migrations:", error.message);
    // On continue quand même, certaines tables peuvent déjà exister
  }
}


