import "dotenv/config";
import { db } from "../server/db";
import { restaurants, pizzas, pizzaPrices } from "../shared/schema";
import { eq } from "drizzle-orm";

async function addProductsToElBacha() {
  console.log("🍰 Ajout de produits pour Pâtisserie EL BACHA...\n");

  try {
    // ID du restaurant EL BACHA
    const elBachaId = "d3672c55-a3c6-4ff6-a00e-a493c9a53dd9";

    // Vérifier que le restaurant existe
    const restaurant = await db.select()
      .from(restaurants)
      .where(eq(restaurants.id, elBachaId))
      .limit(1);

    if (restaurant.length === 0) {
      console.log("❌ Restaurant Pâtisserie EL BACHA non trouvé");
      process.exit(1);
    }

    console.log(`✅ Restaurant trouvé: ${restaurant[0].name}\n`);

    // Produits de pâtisserie avec photos
    const productsToAdd = [
      {
        id: `el-bacha-dessert-001-${Date.now()}`,
        restaurantId: elBachaId,
        name: "Gâteau au Chocolat",
        description: "Gâteau au chocolat fondant avec glaçage au chocolat",
        productType: "dessert",
        category: "gateau",
        imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800",
        available: true,
        prices: [
          { size: "small", price: "8.00" },
          { size: "medium", price: "15.00" },
          { size: "large", price: "25.00" },
        ],
      },
      {
        id: `el-bacha-dessert-002-${Date.now()}`,
        restaurantId: elBachaId,
        name: "Tarte aux Pommes",
        description: "Tarte aux pommes maison avec pâte feuilletée",
        productType: "dessert",
        category: "tarte",
        imageUrl: "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800",
        available: true,
        prices: [
          { size: "small", price: "7.00" },
          { size: "medium", price: "12.00" },
          { size: "large", price: "20.00" },
        ],
      },
      {
        id: `el-bacha-dessert-003-${Date.now()}`,
        restaurantId: elBachaId,
        name: "Éclair au Chocolat",
        description: "Éclair au chocolat avec crème pâtissière",
        productType: "dessert",
        category: "patisserie",
        imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800",
        available: true,
        prices: [
          { size: "small", price: "3.50" },
          { size: "medium", price: "6.00" },
        ],
      },
      {
        id: `el-bacha-dessert-004-${Date.now()}`,
        restaurantId: elBachaId,
        name: "Millefeuille",
        description: "Millefeuille traditionnel avec crème pâtissière",
        productType: "dessert",
        category: "patisserie",
        imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800",
        available: true,
        prices: [
          { size: "small", price: "4.00" },
          { size: "medium", price: "7.00" },
        ],
      },
      {
        id: `el-bacha-dessert-005-${Date.now()}`,
        restaurantId: elBachaId,
        name: "Croissant au Beurre",
        description: "Croissant artisanal au beurre",
        productType: "dessert",
        category: "viennoiserie",
        imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800",
        available: true,
        prices: [
          { size: "small", price: "2.50" },
        ],
      },
      {
        id: `el-bacha-dessert-006-${Date.now()}`,
        restaurantId: elBachaId,
        name: "Pain au Chocolat",
        description: "Pain au chocolat artisanal",
        productType: "dessert",
        category: "viennoiserie",
        imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800",
        available: true,
        prices: [
          { size: "small", price: "2.50" },
        ],
      },
      {
        id: `el-bacha-dessert-007-${Date.now()}`,
        restaurantId: elBachaId,
        name: "Cheesecake aux Fruits",
        description: "Cheesecake avec fruits frais",
        productType: "dessert",
        category: "gateau",
        imageUrl: "https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=800",
        available: true,
        prices: [
          { size: "small", price: "9.00" },
          { size: "medium", price: "16.00" },
          { size: "large", price: "28.00" },
        ],
      },
      {
        id: `el-bacha-dessert-008-${Date.now()}`,
        restaurantId: elBachaId,
        name: "Macarons (Assortiment)",
        description: "Assortiment de 6 macarons aux saveurs variées",
        productType: "dessert",
        category: "patisserie",
        imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800",
        available: true,
        prices: [
          { size: "small", price: "12.00" },
        ],
      },
      {
        id: `el-bacha-dessert-009-${Date.now()}`,
        restaurantId: elBachaId,
        name: "Tiramisu",
        description: "Tiramisu traditionnel italien",
        productType: "dessert",
        category: "gateau",
        imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800",
        available: true,
        prices: [
          { size: "small", price: "8.00" },
          { size: "medium", price: "14.00" },
        ],
      },
      {
        id: `el-bacha-dessert-010-${Date.now()}`,
        restaurantId: elBachaId,
        name: "Tarte au Citron",
        description: "Tarte au citron meringuée",
        productType: "dessert",
        category: "tarte",
        imageUrl: "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800",
        available: true,
        prices: [
          { size: "small", price: "7.00" },
          { size: "medium", price: "12.00" },
          { size: "large", price: "20.00" },
        ],
      },
    ];

    let productsAdded = 0;
    let productsSkipped = 0;

    for (const product of productsToAdd) {
      const { prices, ...productData } = product;
      
      try {
        // Vérifier si le produit existe déjà (par nom et restaurant)
        const existing = await db.select()
          .from(pizzas)
          .where(eq(pizzas.restaurantId, elBachaId))
          .limit(100);

        const productExists = existing.some(p => p.name === product.name);
        
        if (productExists) {
          console.log(`⚠️  Produit "${product.name}" existe déjà`);
          productsSkipped++;
          continue;
        }

        // Insérer le produit
        await db.insert(pizzas).values(productData);
        console.log(`✅ Produit créé: ${product.name}`);

        // Insérer les prix
        for (const price of prices) {
          try {
            await db.insert(pizzaPrices).values({
              pizzaId: product.id,
              size: price.size as "small" | "medium" | "large",
              price: price.price,
            });
          } catch (error: any) {
            if (error.code === '23505') {
              // Prix existe déjà, mettre à jour
              await db.update(pizzaPrices)
                .set({ price: price.price })
                .where(eq(pizzaPrices.pizzaId, product.id));
            }
          }
        }

        productsAdded++;
      } catch (error: any) {
        if (error.code === '23505') {
          console.log(`⚠️  Produit "${product.name}" existe déjà`);
          productsSkipped++;
        } else {
          console.error(`❌ Erreur pour "${product.name}":`, error.message);
        }
      }
    }

    console.log(`\n📊 Résumé:`);
    console.log(`   ✅ Produits ajoutés: ${productsAdded}`);
    console.log(`   ⚠️  Produits ignorés: ${productsSkipped}`);
    console.log(`\n✨ Script terminé avec succès !`);

  } catch (error: any) {
    console.error("❌ Erreur fatale:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

addProductsToElBacha();

