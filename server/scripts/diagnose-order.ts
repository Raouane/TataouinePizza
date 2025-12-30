import "dotenv/config";
import { storage } from "../storage.js";

/**
 * Script pour diagnostiquer pourquoi les notifications WhatsApp n'ont pas été envoyées
 * Usage: npm run script:diagnose-order <order-id-partiel>
 */
async function diagnoseOrder() {
  const searchTerm = process.argv[2];

  if (!searchTerm) {
    console.error("❌ Usage: npm run script:diagnose-order <order-id-partiel>");
    console.error("   Exemple: npm run script:diagnose-order 8708c40c");
    process.exit(1);
  }

  console.log("========================================");
  console.log("🔍 DIAGNOSTIC COMMANDE");
  console.log("========================================");
  console.log(`Terme de recherche: ${searchTerm}`);
  console.log("");

  try {
    // Récupérer toutes les commandes récentes
    const { db } = await import("../db.js");
    const { orders } = await import("@shared/schema");
    const { desc, like, or, ilike } = await import("drizzle-orm");

    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(50);

    // Chercher par ID partiel
    const matchingOrders = allOrders.filter(order => 
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (matchingOrders.length === 0) {
      console.log(`❌ Aucune commande trouvée avec "${searchTerm}"`);
      process.exit(1);
    }

    const order = matchingOrders[0];
    console.log(`✅ Commande trouvée: ${order.id}`);
    console.log("");
    console.log("========================================");
    console.log("📋 INFORMATIONS COMMANDE");
    console.log("========================================");
    console.log(`   - ID: ${order.id}`);
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

    // Vérifier le statut de la commande
    console.log("========================================");
    console.log("🔍 ANALYSE DU STATUT");
    console.log("========================================");
    if (order.status === 'received') {
      console.log("✅ Statut: 'received' - Les notifications WhatsApp DEVRAIENT être envoyées");
    } else if (order.status === 'accepted') {
      console.log("⚠️  Statut: 'accepted' - Les notifications WhatsApp DEVRAIENT être envoyées (même pour 'accepted')");
    } else if (order.status === 'ready') {
      console.log("⚠️  Statut: 'ready' - Les notifications WhatsApp DEVRAIENT être envoyées (même pour 'ready')");
    } else if (order.status === 'delivery' || order.status === 'delivered') {
      console.log("❌ Statut: 'delivery' ou 'delivered' - Les notifications WhatsApp sont envoyées uniquement lors de la création");
      console.log("   Cette commande a déjà été acceptée/livrée.");
    }
    console.log("");

    // Vérifier les livreurs disponibles
    console.log("========================================");
    console.log("👥 VÉRIFICATION DES LIVREURS");
    console.log("========================================");
    const allDrivers = await storage.getAllDrivers();
    const availableDrivers = allDrivers.filter(d => d.status === 'available');
    
    console.log(`📊 Total livreurs: ${allDrivers.length}`);
    console.log(`✅ Livreurs disponibles (status='available'): ${availableDrivers.length}`);
    console.log("");

    if (availableDrivers.length === 0) {
      console.log("❌ PROBLÈME IDENTIFIÉ: Aucun livreur disponible !");
      console.log("   Les notifications WhatsApp ne seront PAS envoyées si aucun livreur n'est disponible.");
      console.log("");
      console.log("📋 Statut de tous les livreurs:");
      allDrivers.forEach((driver, index) => {
        console.log(`   ${index + 1}. ${driver.name} (${driver.phone}) - Statut: ${driver.status || 'NON DÉFINI'}`);
      });
    } else {
      console.log("✅ Livreurs disponibles trouvés:");
      availableDrivers.forEach((driver, index) => {
        console.log(`   ${index + 1}. ${driver.name} (${driver.phone}) - Statut: ${driver.status}`);
        
        // Vérifier les commandes actives de ce livreur
        storage.getOrdersByDriver(driver.id).then(driverOrders => {
          const activeOrders = driverOrders.filter(o => 
            o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready'
          );
          if (activeOrders.length > 0) {
            console.log(`      ⚠️  ${activeOrders.length} commande(s) active(s)`);
          }
        });
      });
    }
    console.log("");

    // Vérifier la configuration Twilio
    console.log("========================================");
    console.log("📱 VÉRIFICATION TWILIO");
    console.log("========================================");
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    if (!twilioAccountSid || !twilioAuthToken) {
      console.log("❌ PROBLÈME IDENTIFIÉ: Twilio non configuré !");
      console.log(`   - TWILIO_ACCOUNT_SID: ${twilioAccountSid ? '✅ Défini' : '❌ NON DÉFINI'}`);
      console.log(`   - TWILIO_AUTH_TOKEN: ${twilioAuthToken ? '✅ Défini' : '❌ NON DÉFINI'}`);
    } else {
      console.log("✅ Twilio configuré:");
      console.log(`   - Account SID: ${twilioAccountSid.substring(0, 12)}...`);
      console.log(`   - Auth Token: ${twilioAuthToken.substring(0, 8)}...`);
    }
    
    if (!twilioWhatsAppNumber) {
      console.log("❌ PROBLÈME IDENTIFIÉ: TWILIO_WHATSAPP_NUMBER non défini !");
    } else {
      console.log(`   - WhatsApp Number: ${twilioWhatsAppNumber}`);
      if (!twilioWhatsAppNumber.startsWith('whatsapp:')) {
        console.log("   ⚠️  ATTENTION: Le numéro WhatsApp devrait commencer par 'whatsapp:'");
        console.log("   ⚠️  Format attendu: whatsapp:+14155238886");
      }
    }
    console.log("");

    // Résumé
    console.log("========================================");
    console.log("📊 RÉSUMÉ DU DIAGNOSTIC");
    console.log("========================================");
    
    const issues: string[] = [];
    
    if (order.status === 'delivery' || order.status === 'delivered') {
      issues.push("La commande est déjà acceptée/livrée (notifications envoyées uniquement lors de la création)");
    }
    
    if (availableDrivers.length === 0) {
      issues.push("Aucun livreur disponible (status='available')");
    }
    
    if (!twilioAccountSid || !twilioAuthToken) {
      issues.push("Twilio non configuré (variables d'environnement manquantes)");
    }
    
    if (!twilioWhatsAppNumber) {
      issues.push("TWILIO_WHATSAPP_NUMBER non défini");
    }
    
    if (issues.length === 0) {
      console.log("✅ Aucun problème identifié dans la configuration");
      console.log("   Les notifications WhatsApp DEVRAIENT être envoyées pour cette commande.");
      console.log("");
      console.log("💡 Si vous n'avez pas reçu de message WhatsApp, vérifiez:");
      console.log("   1. Les logs du serveur autour de l'heure de création (10:00:55)");
      console.log("   2. Les logs [WhatsApp] 📱📱📱 SEND WHATSAPP TO DRIVERS");
      console.log("   3. Les logs [WhatsApp] 📤 ENVOI MESSAGE - Valeurs finales");
      console.log("   4. La console Twilio pour voir si le message a été envoyé");
    } else {
      console.log("❌ Problèmes identifiés:");
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }

  process.exit(0);
}

diagnoseOrder();

