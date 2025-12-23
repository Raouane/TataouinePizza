/**
 * Script pour vérifier les restaurants retournés par l'API de production
 * Plus simple que de se connecter directement à la DB
 */

async function checkProductionAPI() {
  const productionUrl = process.env.PRODUCTION_URL || "https://tataouine-pizza.onrender.com";
  
  console.log(`🔍 Vérification de l'API de production: ${productionUrl}\n`);

  try {
    const response = await fetch(`${productionUrl}/api/restaurants`);
    
    if (!response.ok) {
      console.error(`❌ Erreur HTTP: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Détails: ${errorText}`);
      process.exit(1);
    }

    const restaurants = await response.json();
    
    console.log(`✅ ${restaurants.length} restaurant(s) retourné(s) par l'API\n`);
    
    if (restaurants.length === 0) {
      console.log("⚠️ Aucun restaurant retourné par l'API !");
      process.exit(1);
    }

    console.log("📋 Liste des restaurants retournés:\n");
    console.log("=".repeat(80));
    
    restaurants.forEach((restaurant: any, index: number) => {
      console.log(`\n${index + 1}. ${restaurant.name}`);
      console.log(`   ID: ${restaurant.id}`);
      console.log(`   Phone: ${restaurant.phone || '(Manquant)'}`);
      console.log(`   isOpen: ${restaurant.isOpen ? '✅ OUI' : '❌ NON'}`);
      console.log(`   imageUrl: ${restaurant.imageUrl ? '✅ OUI' : '❌ NON'}`);
      console.log(`   categories: ${JSON.stringify(restaurant.categories || [])}`);
      console.log(`   address: ${restaurant.address || '(Manquant)'}`);
    });

    console.log("\n" + "=".repeat(80));
    
    // Statistiques
    const openRestaurants = restaurants.filter((r: any) => r.isOpen !== false);
    const closedRestaurants = restaurants.filter((r: any) => r.isOpen === false);
    const restaurantsWithImages = restaurants.filter((r: any) => r.imageUrl && r.imageUrl.trim() !== "");
    const restaurantsWithoutImages = restaurants.filter((r: any) => !r.imageUrl || r.imageUrl.trim() === "");

    console.log("\n📊 Statistiques:\n");
    console.log(`   Total restaurants: ${restaurants.length}`);
    console.log(`   Restaurants ouverts: ${openRestaurants.length}`);
    console.log(`   Restaurants fermés: ${closedRestaurants.length}`);
    console.log(`   Restaurants avec images: ${restaurantsWithImages.length}`);
    console.log(`   Restaurants sans images: ${restaurantsWithoutImages.length}`);

    // Vérifier les restaurants attendus
    console.log("\n📋 Restaurants attendus:\n");
    const expectedRestaurants = [
      "Carrefour",
      "Aziza",
      "BAB EL HARA",
      "Boucherie Brahim",
      "Volaille Othman",
      "Bijouterie Ziyad",
      "Tataouine Pizza",
      "Pizza del Sol",
      "Sahara Grill",
      "GAZELLES",
    ];

    const foundNames = restaurants.map((r: any) => r.name);
    const missingRestaurants = expectedRestaurants.filter(name => !foundNames.includes(name));
    const unexpectedRestaurants = foundNames.filter((name: string) => !expectedRestaurants.includes(name));

    if (missingRestaurants.length > 0) {
      console.log(`   ⚠️ Restaurants attendus mais MANQUANTS:`);
      missingRestaurants.forEach(name => console.log(`      - ${name}`));
    } else {
      console.log(`   ✅ Tous les restaurants attendus sont présents`);
    }

    if (unexpectedRestaurants.length > 0) {
      console.log(`\n   ℹ️ Restaurants présents mais non attendus:`);
      unexpectedRestaurants.forEach(name => console.log(`      - ${name}`));
    }

    // Problèmes potentiels
    console.log("\n⚠️ Problèmes détectés:\n");
    
    if (closedRestaurants.length > 0) {
      console.log(`   ❌ ${closedRestaurants.length} restaurant(s) fermé(s) (ne s'afficheront pas sur la home):`);
      closedRestaurants.forEach((r: any) => console.log(`      - ${r.name}`));
    }

    if (restaurantsWithoutImages.length > 0) {
      console.log(`   ⚠️ ${restaurantsWithoutImages.length} restaurant(s) sans image:`);
      restaurantsWithoutImages.forEach((r: any) => console.log(`      - ${r.name}`));
    }

    if (missingRestaurants.length > 0) {
      console.log(`   ❌ ${missingRestaurants.length} restaurant(s) manquant(s) dans l'API:`);
      missingRestaurants.forEach(name => console.log(`      - ${name}`));
    }

    if (closedRestaurants.length === 0 && restaurantsWithoutImages.length === 0 && missingRestaurants.length === 0) {
      console.log(`   ✅ Aucun problème détecté !`);
    }

    console.log("\n💡 Recommandations:\n");
    if (missingRestaurants.length > 0) {
      console.log(`   - Exécuter le script de synchronisation: npm run sync-to-production`);
      console.log(`   - Ou utiliser le bouton "Enrichir Tous les Restaurants" dans le dashboard admin`);
    }
    if (closedRestaurants.length > 0) {
      console.log(`   - Ouvrir les restaurants fermés depuis le dashboard admin`);
    }
    if (restaurantsWithoutImages.length > 0) {
      console.log(`   - Exécuter: npm run enrich-restaurants (ou via le dashboard admin)`);
    }

  } catch (error: any) {
    console.error("❌ Erreur lors de la vérification:", error.message);
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error("\n💡 Vérifiez que:");
      console.error("   - L'URL de production est correcte");
      console.error("   - Le serveur de production est en ligne");
      console.error("   - Vous avez accès à Internet");
    }
    process.exit(1);
  }
}

checkProductionAPI()
  .then(() => {
    console.log("\n✅ Vérification terminée");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });

