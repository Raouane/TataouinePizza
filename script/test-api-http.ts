/**
 * Test de l'API via HTTP pour voir ce que le serveur retourne réellement
 */

import "dotenv/config";

async function testAPIHTTP() {
  try {
    console.log("🧪 Test de l'API /api/restaurants via HTTP...\n");
    
    // Attendre un peu pour s'assurer que le serveur est prêt
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch("http://localhost:5000/api/restaurants");
    if (!response.ok) {
      console.error(`❌ Erreur HTTP: ${response.status}`);
      return;
    }
    
    const restaurants = await response.json();
    const bouba = restaurants.find((r: any) => r.name && r.name.toLowerCase().includes('bouba'));
    
    if (!bouba) {
      console.log("❌ BOUBA non trouvé dans la réponse API");
      return;
    }
    
    console.log("📊 BOUBA dans la réponse API HTTP:");
    console.log(`   - name: ${bouba.name}`);
    console.log(`   - isOpen (toggle): ${bouba.isOpen}`);
    console.log(`   - openingHours: ${bouba.openingHours}`);
    console.log(`   - computedStatus:`, JSON.stringify(bouba.computedStatus, null, 2));
    console.log(`   - computedStatus.isOpen: ${bouba.computedStatus?.isOpen}`);
    
    const now = new Date();
    console.log(`\n⏰ Heure actuelle: ${now.getHours()}:${now.getMinutes()}`);
    
    if (bouba.computedStatus && bouba.computedStatus.isOpen) {
      console.log(`\n⚠️  PROBLÈME: Le serveur retourne BOUBA comme OUVERT !`);
      console.log(`   - Horaires: ${bouba.openingHours}`);
      console.log(`   - Heure actuelle: ${now.getHours()}:${now.getMinutes()}`);
      console.log(`   - Raison: ${bouba.computedStatus.reason || 'unknown'}`);
    } else {
      console.log(`\n✅ Le serveur retourne correctement BOUBA comme FERMÉ`);
      console.log(`   - Raison: ${bouba.computedStatus?.reason || 'unknown'}`);
    }
    
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.log("\n💡 Assurez-vous que le serveur tourne sur http://localhost:5000");
    console.log("   Commande: npm run dev");
  }
}

testAPIHTTP()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });

