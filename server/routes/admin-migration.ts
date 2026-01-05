/**
 * Route admin temporaire pour migrer les données de Render vers Supabase
 * 
 * Usage:
 * POST /api/admin/migrate-to-supabase
 * Headers: Authorization: Bearer <admin-token>
 * 
 * ⚠️  SUPPRIMER CETTE ROUTE APRÈS LA MIGRATION
 */

import type { Express, Response } from "express";
import { authenticateAdmin, type AuthRequest } from "../auth";
import { Pool } from "pg";
import dns from "dns";

dns.setDefaultResultOrder('ipv4first');

const TABLES = [
  'admin_users',
  'restaurants',
  'drivers',
  'pizzas',
  'pizza_prices',
  'customers',
  'orders',
  'order_items',
  'otp_codes',
  'idempotency_keys',
  'telegram_messages',
  'cash_handovers'
];

const BATCH_SIZE = 500;

async function migrateTable(
  renderPool: Pool,
  supabasePool: Pool,
  tableName: string
): Promise<{ migrated: number; skipped: number }> {
  try {
    const result = await renderPool.query(`SELECT * FROM ${tableName} ORDER BY id`);
    const rows = result.rows;
    
    if (rows.length === 0) {
      return { migrated: 0, skipped: 0 };
    }
    
    const tableExists = await supabasePool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      )
    `, [tableName]);
    
    if (!tableExists.rows[0].exists) {
      return { migrated: 0, skipped: rows.length };
    }
    
    let migrated = 0;
    let skipped = 0;
    
    for (const row of rows) {
      try {
        const columns = Object.keys(row).filter(key => row[key] !== undefined && row[key] !== null);
        const values = columns.map((_, idx) => `$${idx + 1}`);
        const valuesArray = columns.map(col => row[col]);
        
        const insertQuery = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${values.join(', ')})
          ON CONFLICT DO NOTHING
        `;
        
        await supabasePool.query(insertQuery, valuesArray);
        migrated++;
      } catch (error: any) {
        if (error.code === '23505') {
          skipped++;
        } else {
          skipped++;
        }
      }
    }
    
    return { migrated, skipped };
  } catch (error: any) {
    console.error(`[MIGRATION] Erreur ${tableName}:`, error.message);
    return { migrated: 0, skipped: 0 };
  }
}

export function registerAdminMigrationRoute(app: Express): void {
  app.post(
    "/api/admin/migrate-to-supabase",
    authenticateAdmin,
    async (req: AuthRequest, res: Response) => {
      console.log("[MIGRATION] 🚀 Démarrage de la migration vers Supabase");
      
      const SUPABASE_DB_URL = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
      const RENDER_DB_URL = process.env.OLD_DATABASE_URL || process.env.DATABASE_URL;
      
      if (!SUPABASE_DB_URL || !RENDER_DB_URL) {
        return res.status(400).json({
          error: "Configuration manquante",
          message: "SUPABASE_DATABASE_URL et OLD_DATABASE_URL doivent être définis",
        });
      }
      
      // Détecter quelle URL est Render et laquelle est Supabase
      const isSupabaseUrl = (url: string) => url.includes('supabase');
      const supabaseUrl = isSupabaseUrl(SUPABASE_DB_URL) ? SUPABASE_DB_URL : 
                         isSupabaseUrl(RENDER_DB_URL) ? RENDER_DB_URL : SUPABASE_DB_URL;
      const renderUrl = !isSupabaseUrl(SUPABASE_DB_URL) && !isSupabaseUrl(RENDER_DB_URL) ? 
                        RENDER_DB_URL : 
                        (isSupabaseUrl(SUPABASE_DB_URL) ? RENDER_DB_URL : SUPABASE_DB_URL);
      
      const supabasePoolConfig: any = {
        connectionString: supabaseUrl,
      };
      
      if (supabaseUrl.includes('supabase')) {
        supabasePoolConfig.ssl = { rejectUnauthorized: false };
      }
      
      const renderPool = new Pool({ connectionString: renderUrl });
      const supabasePool = new Pool(supabasePoolConfig);
      
      try {
        // Test des connexions
        await renderPool.query("SELECT 1");
        await supabasePool.query("SELECT 1");
        
        console.log("[MIGRATION] ✅ Connexions établies");
        
        // Compter les lignes avant migration
        const counts: Record<string, number> = {};
        for (const table of TABLES) {
          try {
            const result = await renderPool.query(`SELECT COUNT(*) as count FROM ${table}`);
            counts[table] = parseInt(result.rows[0]?.count || "0");
          } catch (e) {
            counts[table] = 0;
          }
        }
        
        // Migrer chaque table
        const results: Record<string, { migrated: number; skipped: number }> = {};
        let totalMigrated = 0;
        let totalSkipped = 0;
        
        for (const table of TABLES) {
          console.log(`[MIGRATION] 📦 Migration de ${table}...`);
          const result = await migrateTable(renderPool, supabasePool, table);
          results[table] = result;
          totalMigrated += result.migrated;
          totalSkipped += result.skipped;
          console.log(`[MIGRATION] ✅ ${table}: ${result.migrated} migrées, ${result.skipped} ignorées`);
        }
        
        // Vérification finale
        const finalCounts: Record<string, number> = {};
        for (const table of TABLES) {
          try {
            const result = await supabasePool.query(`SELECT COUNT(*) as count FROM ${table}`);
            finalCounts[table] = parseInt(result.rows[0]?.count || "0");
          } catch (e) {
            finalCounts[table] = 0;
          }
        }
        
        await renderPool.end();
        await supabasePool.end();
        
        console.log("[MIGRATION] ✨ Migration terminée");
        
        return res.json({
          success: true,
          message: "Migration terminée avec succès",
          summary: {
            totalMigrated,
            totalSkipped,
          },
          details: results,
          counts: {
            before: counts,
            after: finalCounts,
          },
        });
        
      } catch (error: any) {
        await renderPool.end();
        await supabasePool.end();
        
        console.error("[MIGRATION] ❌ Erreur:", error.message);
        
        return res.status(500).json({
          error: "Erreur lors de la migration",
          message: error.message,
        });
      }
    }
  );
}
