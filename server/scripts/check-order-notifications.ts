import "dotenv/config";
import { storage } from "../storage.js";

/**
 * Script pour vérifier si les notifications WhatsApp ont été envoyées pour une commande
 * Usage: npm run script:check-order-notifications <orderId>
 */
async function checkOrderNotifications() {
  const orderId = process.argv[2];

  if (!orderId) {
    console.error("❌ Usage: npm run script:check-order-notifications <orderId>");
    console.error("   Exemple: npm run script:check-order-notifications ba45aac3-f1ab-48ce-becf-ff88c8b778b5");
    process.exit(1);
  }

  console.log("========================================");
  console.log("🔍 VÉRIFICATION DES NOTIFICATIONS");
  console.log("========================================");
  console.log(`Order ID: ${orderId}`);
  console.log("");

  try {
    // Récupérer la commande
    const order = await storage.getOrderById(orderId);
    
    if (!order) {
      console.error(`❌ Commande ${orderId} non trouvée`);
      process.exit(1);
    }

    console.log("📋 Informations de la commande:");
    console.log(`   - Statut: ${order.status}`);
    console.log(`   - Client: ${order.customerName}`);
    console.log(`   - Téléphone: ${order.phone}`);
    console.log(`   - Adresse: ${order.address}`);
    console.log(`   - Prix total: ${order.totalPrice} TND`);
    console.log(`   - Créée le: ${order.createdAt}`);
    console.log(`   - Livreur assigné: ${order.driverId || 'AUCUN'}`);
    console.log("");

    // Vérifier le statut des livreurs
    const allDrivers = await storage.getAllDrivers();
    const availableDrivers = allDrivers.filter(d => d.status === 'available');
    
    console.log("👥 Statut des livreurs:");
    console.log(`   - Total: ${allDrivers.length}`);
    console.log(`   - Disponibles (available): ${availableDrivers.length}`);
    console.log("");

    if (availableDrivers.length > 0) {
      console.log("📋 Livreurs disponibles:");
      availableDrivers.forEach((driver, index) => {
        console.log(`   ${index + 1}. ${driver.name} (${driver.phone})`);
        console.log(`      - Statut: ${driver.status}`);
        console.log(`      - Last seen: ${driver.lastSeen ? new Date(driver.lastSeen).toISOString() : 'JAMAIS'}`);
      });
    } else {
      console.log("⚠️  Aucun livreur disponible - Les notifications WhatsApp ne seront pas envoyées");
    }

    console.log("");
    console.log("========================================");
    console.log("💡 DIAGNOSTIC");
    console.log("========================================");
    
    if (order.status === 'accepted' || order.status === 'ready' || order.status === 'delivery' || order.status === 'delivered') {
      console.log("⚠️  Cette commande est déjà acceptée/livrée.");
      console.log("   Les notifications WhatsApp sont envoyées uniquement lors de la création (statut 'received').");
    } else if (availableDrivers.length === 0) {
      console.log("⚠️  Aucun livreur disponible.");
      console.log("   Les notifications WhatsApp ne seront pas envoyées.");
    } else {
      console.log("✅ Conditions remplies pour l'envoi de notifications:");
      console.log("   - Commande en statut 'received'");
      console.log("   - Livreur(s) disponible(s)");
      console.log("");
      console.log("🔍 Vérifiez les logs du serveur lors de la création de cette commande:");
      console.log("   - Cherchez '[ORDER] ⚡⚡⚡ POST /api/orders'");
      console.log("   - Cherchez '[WhatsApp] 📱📱📱 SEND WHATSAPP TO DRIVERS'");
    }

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }

  process.exit(0);
}

checkOrderNotifications();

