import "dotenv/config";
import { Pool } from "pg";

/**
 * Script pour vérifier les messages Telegram stockés pour une commande
 * 
 * Usage: tsx script/check-telegram-messages.ts <orderId>
 */
async function checkTelegramMessages(orderId?: string) {
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
    if (orderId) {
      console.log(`🔍 Recherche des messages Telegram pour la commande: ${orderId}`);
      
      // Vérifier si la commande existe
      const orderResult = await pool.query(`
        SELECT id, status, created_at, updated_at
        FROM orders
        WHERE id = $1
      `, [orderId]);

      if (orderResult.rows.length === 0) {
        console.log(`❌ Commande ${orderId} non trouvée`);
        await pool.end();
        return;
      }

      const order = orderResult.rows[0];
      console.log(`\n📦 Commande trouvée:`);
      console.log(`   - Statut: ${order.status}`);
      console.log(`   - Créée le: ${order.created_at}`);
      console.log(`   - Modifiée le: ${order.updated_at}`);

      // Vérifier les messages Telegram
      const messagesResult = await pool.query(`
        SELECT id, driver_id, driver_telegram_id, message_id, created_at, deleted_at
        FROM order_telegram_messages
        WHERE order_id = $1
        ORDER BY created_at DESC
      `, [orderId]);

      if (messagesResult.rows.length === 0) {
        console.log(`\n⚠️  Aucun message Telegram stocké pour cette commande`);
        console.log(`\n💡 Raisons possibles:`);
        console.log(`   1. La commande a été créée AVANT la migration (table order_telegram_messages)`);
        console.log(`   2. Le messageId n'a pas été stocké lors de l'envoi`);
        console.log(`   3. Le driverId n'était pas disponible lors de l'envoi`);
      } else {
        console.log(`\n📱 Messages Telegram trouvés: ${messagesResult.rows.length}`);
        messagesResult.rows.forEach((msg, index) => {
          console.log(`\n   Message ${index + 1}:`);
          console.log(`   - ID: ${msg.id}`);
          console.log(`   - Driver ID: ${msg.driver_id}`);
          console.log(`   - Telegram ID: ${msg.driver_telegram_id}`);
          console.log(`   - Message ID: ${msg.message_id}`);
          console.log(`   - Créé le: ${msg.created_at}`);
          console.log(`   - Supprimé le: ${msg.deleted_at || 'Non supprimé'}`);
        });
      }
    } else {
      // Afficher toutes les commandes avec messages Telegram
      console.log(`🔍 Liste de toutes les commandes avec messages Telegram:\n`);
      
      const allMessagesResult = await pool.query(`
        SELECT 
          otm.order_id,
          otm.driver_id,
          otm.driver_telegram_id,
          otm.message_id,
          otm.created_at,
          otm.deleted_at,
          o.status as order_status,
          o.customer_name
        FROM order_telegram_messages otm
        JOIN orders o ON o.id = otm.order_id
        ORDER BY otm.created_at DESC
        LIMIT 20
      `);

      if (allMessagesResult.rows.length === 0) {
        console.log(`⚠️  Aucun message Telegram stocké dans la base de données`);
      } else {
        console.log(`📊 ${allMessagesResult.rows.length} message(s) trouvé(s):\n`);
        allMessagesResult.rows.forEach((msg, index) => {
          console.log(`${index + 1}. Commande: ${msg.order_id.substring(0, 8)}...`);
          console.log(`   - Client: ${msg.customer_name}`);
          console.log(`   - Statut: ${msg.order_status}`);
          console.log(`   - Message ID: ${msg.message_id}`);
          console.log(`   - Supprimé: ${msg.deleted_at ? 'Oui' : 'Non'}`);
          console.log('');
        });
      }
    }

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    if (error.message.includes("does not exist")) {
      console.error("\n💡 La table order_telegram_messages n'existe pas encore.");
      console.error("   Exécutez: npm run migrate:telegram");
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Récupérer l'orderId depuis les arguments
const orderId = process.argv[2];
checkTelegramMessages(orderId);
