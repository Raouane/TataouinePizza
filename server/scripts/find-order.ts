import "dotenv/config";
import { storage } from "../storage.js";

/**
 * Script pour trouver une commande par ID partiel ou nom de client
 * Usage: npm run script:find-order <id-partiel-ou-nom>
 */
async function findOrder() {
  const searchTerm = process.argv[2];

  if (!searchTerm) {
    console.error("❌ Usage: npm run script:find-order <id-partiel-ou-nom>");
    console.error("   Exemple: npm run script:find-order 8708c40c");
    console.error("   Exemple: npm run script:find-order thabet");
    process.exit(1);
  }

  console.log("========================================");
  console.log("🔍 RECHERCHE DE COMMANDE");
  console.log("========================================");
  console.log(`Terme de recherche: ${searchTerm}`);
  console.log("");

  try {
    // Récupérer toutes les commandes récentes (dernières 50)
    const { db } = await import("../db.js");
    const { orders } = await import("@shared/schema");
    const { desc, like, or, ilike } = await import("drizzle-orm");

    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(50);

    // Chercher par ID partiel ou nom de client
    const matchingOrders = allOrders.filter(order => 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (matchingOrders.length === 0) {
      console.log(`❌ Aucune commande trouvée avec "${searchTerm}"`);
      console.log("");
      console.log("📋 Commandes récentes (5 dernières):");
      allOrders.slice(0, 5).forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.customerName} - ${order.id.slice(0, 8)} - ${order.status} - ${new Date(order.createdAt || '').toLocaleString()}`);
      });
      process.exit(1);
    }

    console.log(`✅ ${matchingOrders.length} commande(s) trouvée(s):`);
    console.log("");

    for (const order of matchingOrders) {
      console.log("========================================");
      console.log(`📋 Commande: ${order.id}`);
      console.log("========================================");
      console.log(`   - Client: ${order.customerName}`);
      console.log(`   - Téléphone: ${order.phone}`);
      console.log(`   - Adresse: ${order.address}`);
      console.log(`   - Statut: ${order.status}`);
      console.log(`   - Prix total: ${order.totalPrice} TND`);
      console.log(`   - Restaurant ID: ${order.restaurantId}`);
      console.log(`   - Livreur ID: ${order.driverId || 'AUCUN'}`);
      console.log(`   - Créée le: ${new Date(order.createdAt || '').toLocaleString()}`);
      console.log(`   - Modifiée le: ${new Date(order.updatedAt || '').toLocaleString()}`);
      console.log("");
    }

    // Vérifier les notifications pour la première commande trouvée
    if (matchingOrders.length > 0) {
      const firstOrder = matchingOrders[0];
      console.log("========================================");
      console.log("🔔 VÉRIFICATION DES NOTIFICATIONS");
      console.log("========================================");
      
      const allDrivers = await storage.getAllDrivers();
      const availableDrivers = allDrivers.filter(d => d.status === 'available');
      
      console.log(`👥 Livreurs disponibles: ${availableDrivers.length}`);
      if (availableDrivers.length > 0) {
        availableDrivers.forEach((driver, index) => {
          console.log(`   ${index + 1}. ${driver.name} (${driver.phone}) - Statut: ${driver.status}`);
        });
      } else {
        console.log("   ⚠️  Aucun livreur disponible - Les notifications WhatsApp ne seront pas envoyées");
      }
      
      if (firstOrder.status === 'accepted' || firstOrder.status === 'ready' || firstOrder.status === 'delivery' || firstOrder.status === 'delivered') {
        console.log("");
        console.log("⚠️  Cette commande est déjà acceptée/livrée.");
        console.log("   Les notifications WhatsApp sont envoyées uniquement lors de la création (statut 'received').");
      }
    }

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }

  process.exit(0);
}

findOrder();

