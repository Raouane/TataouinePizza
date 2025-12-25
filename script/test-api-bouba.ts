/**
 * Test de l'API pour voir ce que le serveur retourne pour BOUBA
 */

import "dotenv/config";

async function testAPIBouba() {
  try {
    console.log("🧪 Test de l'API /api/restaurants pour BOUBA...\n");
    
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
    
    console.log("📊 BOUBA dans la réponse API:");
    console.log(`   - name: ${bouba.name}`);
    console.log(`   - isOpen (toggle): ${bouba.isOpen}`);
    console.log(`   - openingHours: ${bouba.openingHours}`);
    console.log(`   - computedStatus:`, JSON.stringify(bouba.computedStatus, null, 2));
    
    const now = new Date();
    console.log(`\n⏰ Heure actuelle: ${now.getHours()}:${now.getMinutes()}`);
    
    if (bouba.computedStatus && bouba.computedStatus.isOpen) {
      console.log(`\n⚠️  PROBLÈME: Le serveur calcule BOUBA comme OUVERT alors qu'il devrait être FERMÉ !`);
      console.log(`   - Horaires: ${bouba.openingHours}`);
      console.log(`   - Heure actuelle: ${now.getHours()}:${now.getMinutes()}`);
    } else {
      console.log(`\n✅ Le serveur calcule correctement BOUBA comme FERMÉ`);
    }
    
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.log("\n💡 Assurez-vous que le serveur tourne sur http://localhost:5000");
  }
}

testAPIBouba()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });

