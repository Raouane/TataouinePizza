import "dotenv/config";
import { Pool } from "pg";

/**
 * Script pour supprimer manuellement un message Telegram
 * 
 * Usage: npm run delete:telegram -- <orderId>
 */
async function deleteTelegramMessage(orderId: string) {
  if (!process.env.DATABASE_URL) {
    console.error("❌ ERREUR: DATABASE_URL n'est pas défini");
    process.exit(1);
  }

  // Préparer la connection string
  let connectionString = process.env.DATABASE_URL;
  if (connectionString.includes('.render.com') && !connectionString.match(/:\d+\//)) {
    connectionString = connectionString.replace('.render.com/', '.render.com:5432/');
  }
  if (connectionString.includes('.render.com') && !connectionString.includes('sslmode=')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
  }

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });

  try {
    console.log(`🔍 Recherche des messages Telegram pour la commande: ${orderId}`);

    // Récupérer les messages Telegram
    const messagesResult = await pool.query(`
      SELECT id, driver_id, driver_telegram_id, message_id, created_at, deleted_at
      FROM order_telegram_messages
      WHERE order_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `, [orderId]);

    if (messagesResult.rows.length === 0) {
      console.log(`⚠️  Aucun message Telegram non supprimé trouvé pour cette commande`);
      await pool.end();
      return;
    }

    console.log(`📱 ${messagesResult.rows.length} message(s) trouvé(s)\n`);

    // Importer le service Telegram
    const { telegramService } = await import("../server/services/telegram-service.js");

    // Supprimer chaque message
    for (const msg of messagesResult.rows) {
      console.log(`🗑️  Suppression du message ${msg.message_id} pour driver ${msg.driver_telegram_id}...`);
      
      try {
        const deleteResult = await telegramService.deleteMessage(msg.driver_telegram_id, msg.message_id);
        
        if (deleteResult.success) {
          // Marquer comme supprimé dans la DB
          await pool.query(`
            UPDATE order_telegram_messages
            SET deleted_at = NOW()
            WHERE id = $1
          `, [msg.id]);
          
          console.log(`✅ Message ${msg.message_id} supprimé avec succès\n`);
        } else {
          console.error(`❌ Erreur suppression message ${msg.message_id}: ${deleteResult.error}\n`);
        }
      } catch (error: any) {
        console.error(`❌ Erreur lors de la suppression: ${error.message}\n`);
      }
    }

    console.log(`✅ Traitement terminé`);

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Récupérer l'orderId depuis les arguments
const orderId = process.argv[2];
if (!orderId) {
  console.error("❌ Usage: npm run delete:telegram -- <orderId>");
  process.exit(1);
}

deleteTelegramMessage(orderId);
