import "dotenv/config";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

/**
 * Script pour exécuter la migration order_telegram_messages
 * 
 * Usage: npm run migrate:telegram
 * ou: tsx script/migrate-telegram-messages.ts
 */
async function runTelegramMigration() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ ERREUR: DATABASE_URL n'est pas défini");
    process.exit(1);
  }

  // Préparer la connection string (comme dans server/db.ts)
  let connectionString = process.env.DATABASE_URL;
  if (connectionString.includes('.render.com') && !connectionString.match(/:\d+\//)) {
    connectionString = connectionString.replace('.render.com/', '.render.com:5432/');
    console.log("[DB] Port 5432 ajouté automatiquement pour Render");
  }
  if (connectionString.includes('.render.com') && !connectionString.includes('sslmode=')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
    console.log("[DB] SSL mode ajouté automatiquement pour Render");
  }

  const pool = new Pool({
    connectionString,
    // Augmenter les timeouts pour les connexions lentes
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });

  try {
    console.log("🔄 Exécution de la migration order_telegram_messages...");
    console.log("📡 Connexion à la base de données...");

    // Tester la connexion
    await pool.query("SELECT 1");

    // Lire le fichier SQL
    const migrationPath = path.join(process.cwd(), "migrations", "add_order_telegram_messages.sql");
    const sql = fs.readFileSync(migrationPath, "utf-8");

    // Exécuter la migration SQL complète
    console.log("📝 Exécution du script SQL...");
    
    // Exécuter chaque commande SQL séparément (en respectant l'ordre)
    const lines = sql.split('\n');
    let currentCommand = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Ignorer les commentaires
      if (trimmedLine.startsWith('--') || trimmedLine === '') {
        continue;
      }
      
      currentCommand += line + '\n';
      
      // Si la ligne se termine par ';', exécuter la commande
      if (trimmedLine.endsWith(';')) {
        const command = currentCommand.trim();
        if (command) {
          try {
            await pool.query(command);
            const cmdType = command.split(' ')[0].toUpperCase();
            console.log(`✅ ${cmdType} exécuté avec succès`);
          } catch (error: any) {
            // Ignorer les erreurs "already exists" (IF NOT EXISTS)
            if (error.message.includes("already exists") || 
                error.message.includes("duplicate key") ||
                (error.message.includes("relation") && error.message.includes("already exists"))) {
              const cmdType = command.split(' ')[0].toUpperCase();
              console.log(`ℹ️  ${cmdType} (déjà existant)`);
            } else {
              // Afficher l'erreur mais continuer
              console.warn(`⚠️  Erreur: ${error.message.substring(0, 150)}`);
            }
          }
        }
        currentCommand = '';
      }
    }

    // Vérifier que la table existe maintenant
    console.log("🔍 Vérification de la création de la table...");
    try {
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'order_telegram_messages'
      `);

      if (result.rows.length > 0) {
        console.log("✅ Migration order_telegram_messages exécutée avec succès!");
        console.log("📊 La table order_telegram_messages est maintenant disponible.");
      } else {
        console.warn("⚠️  La table n'a pas été trouvée après la migration.");
      }
    } catch (error: any) {
      // Si la vérification échoue, ce n'est pas grave
      console.log("ℹ️  Impossible de vérifier la table, mais la migration a été tentée.");
    }

  } catch (error: any) {
    if (error.message.includes("already exists") || error.message.includes("duplicate")) {
      console.log("ℹ️  La table order_telegram_messages existe déjà");
    } else {
      console.error("❌ Erreur lors de la migration:", error.message);
      console.error("💡 Astuce: Vérifiez que DATABASE_URL est correct et que la base de données est accessible");
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

// Exécuter la migration
runTelegramMigration();
