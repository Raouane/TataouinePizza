/**
 * Script pour ajouter les restaurants manquants via l'API de production
 * Plus simple que de se connecter directement à la DB
 */

async function addMissingRestaurantsViaAPI() {
  const productionUrl = process.env.PRODUCTION_URL || "https://tataouine-pizza.onrender.com";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@tataouine.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  
  console.log(`🔍 Connexion à l'API de production: ${productionUrl}\n`);

  try {
    // 1. Se connecter en tant qu'admin
    console.log("1️⃣ Connexion en tant qu'admin...");
    const loginResponse = await fetch(`${productionUrl}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json().catch(() => ({}));
      console.error(`❌ Erreur de connexion: ${loginResponse.status}`);
      console.error(`Détails:`, errorData);
      console.log("\n💡 Vérifiez vos identifiants admin dans les variables d'environnement:");
      console.log("   ADMIN_EMAIL=votre_email");
      console.log("   ADMIN_PASSWORD=votre_password");
      process.exit(1);
    }

    const { token } = await loginResponse.json();
    console.log("✅ Connexion réussie !\n");

    // 2. Vérifier les restaurants existants
    console.log("2️⃣ Vérification des restaurants existants...");
    const restaurantsResponse = await fetch(`${productionUrl}/api/restaurants`);
    const existingRestaurants = await restaurantsResponse.json();
    const existingNames = existingRestaurants.map((r: any) => r.name);
    
    console.log(`   ${existingRestaurants.length} restaurant(s) trouvé(s)\n`);

    // 3. Créer les restaurants manquants
    const missingRestaurants = [
      {
        name: "Boucherie Brahim",
        phone: "21698765434",
        address: "Marché Central, Rue du Marché, Tataouine",
        description: "Boucherie traditionnelle - Viande fraîche de qualité, découpe sur place",
        imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
        categories: ["butcher", "meat", "beef", "lamb"],
      },
      {
        name: "Volaille Othman",
        phone: "21698765435",
        address: "Marché Central, Avenue de la République, Tataouine",
        description: "Spécialiste en volaille fraîche - Poulet, dinde, canard et œufs",
        imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
        categories: ["poultry", "chicken", "eggs", "fresh"],
      },
      {
        name: "Bijouterie Ziyad",
        phone: "21698765436",
        address: "Rue des Bijoutiers, Centre-ville, Tataouine",
        description: "Bijouterie traditionnelle - Or, argent, bijoux artisanaux tunisiens",
        imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
        categories: ["jewelry", "gold", "silver", "handmade"],
      },
    ];

    const toAdd = missingRestaurants.filter(r => !existingNames.includes(r.name));
    
    if (toAdd.length === 0) {
      console.log("✅ Tous les restaurants sont déjà présents !");
      process.exit(0);
    }

    console.log(`3️⃣ Création de ${toAdd.length} restaurant(s) manquant(s)...\n`);

    let created = 0;
    let errors = 0;

    for (const restaurant of toAdd) {
      try {
        console.log(`   Création de "${restaurant.name}"...`);
        const createResponse = await fetch(`${productionUrl}/api/admin/restaurants`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(restaurant),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}));
          console.error(`      ❌ Erreur: ${createResponse.status} - ${errorData.error || 'Erreur inconnue'}`);
          errors++;
        } else {
          const createdRestaurant = await createResponse.json();
          console.log(`      ✅ Créé avec succès (ID: ${createdRestaurant.id})`);
          created++;
        }
      } catch (error: any) {
        console.error(`      ❌ Erreur: ${error.message}`);
        errors++;
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("\n📊 Résumé:\n");
    console.log(`   ✅ Restaurants créés: ${created}`);
    console.log(`   ❌ Erreurs: ${errors}`);
    console.log(`   📦 Total à créer: ${toAdd.length}`);

    if (created > 0) {
      console.log("\n✅ Les restaurants ont été ajoutés avec succès !");
      console.log("💡 Vous pouvez maintenant utiliser le bouton 'Enrichir Tous les Restaurants'");
      console.log("   dans le dashboard admin pour ajouter des produits à ces restaurants.");
    }

  } catch (error: any) {
    console.error("❌ Erreur fatale:", error.message);
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error("\n💡 Vérifiez que:");
      console.error("   - L'URL de production est correcte");
      console.error("   - Le serveur de production est en ligne");
      console.error("   - Vous avez accès à Internet");
    }
    process.exit(1);
  }
}

addMissingRestaurantsViaAPI()
  .then(() => {
    console.log("\n✅ Script terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });

