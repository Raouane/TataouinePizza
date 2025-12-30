import "dotenv/config";
import { db } from "../server/db";
import { pizzas, restaurants } from "../shared/schema";
import { eq } from "drizzle-orm";

interface ProductAnalysis {
  product: typeof pizzas.$inferSelect;
  restaurantName: string;
  hasImage: boolean;
  imageUrl: string | null;
  imageStatus: 'valid' | 'missing' | 'invalid' | 'mismatch';
  issues: string[];
}

const productImageKeywords: Record<string, string[]> = {
  pizza: ['pizza', 'margherita', 'pepperoni', 'cheese', 'italian'],
  burger: ['burger', 'hamburger', 'beef', 'chicken', 'sandwich'],
  dessert: ['dessert', 'cake', 'sweet', 'chocolate', 'tiramisu', 'cheesecake', 'tarte', 'gateau', 'patisserie'],
  drink: ['drink', 'coke', 'cola', 'juice', 'water', 'soda', 'beverage'],
  salade: ['salad', 'salade', 'vegetable', 'green'],
  viennoiserie: ['croissant', 'pain', 'chocolat', 'viennoiserie', 'pastry'],
  patisserie: ['patisserie', 'eclair', 'millefeuille', 'macaron', 'pastry'],
  tarte: ['tarte', 'pie', 'apple', 'citron', 'lemon'],
  gateau: ['gateau', 'cake', 'chocolate', 'cheesecake'],
};

function analyzeImageMatch(product: typeof pizzas.$inferSelect): { status: ProductAnalysis['imageStatus']; issues: string[] } {
  const issues: string[] = [];
  
  if (!product.imageUrl || product.imageUrl.trim() === '') {
    return { status: 'missing', issues: ['Image manquante'] };
  }

  const imageUrl = product.imageUrl.toLowerCase();
  const productName = product.name.toLowerCase();
  const productType = (product.productType || 'pizza').toLowerCase();
  const category = (product.category || '').toLowerCase();

  if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
    issues.push('URL d\'image invalide');
    return { status: 'invalid', issues };
  }

  const expectedKeywords = productImageKeywords[productType] || productImageKeywords['pizza'];
  const hasMatchingKeyword = expectedKeywords.some(keyword => 
    imageUrl.includes(keyword) || productName.includes(keyword)
  );

  let categoryMatch = false;
  if (category) {
    const categoryKeywords: Record<string, string[]> = {
      'classic': ['pizza', 'margherita', 'pepperoni'],
      'special': ['pizza', 'special', 'premium'],
      'vegetarian': ['vegetarian', 'veggie', 'vegetable'],
      'beef': ['beef', 'burger', 'meat'],
      'chicken': ['chicken', 'poulet', 'burger'],
      'soda': ['coke', 'cola', 'soda', 'drink'],
      'gateau': ['cake', 'gateau', 'chocolate'],
      'tarte': ['tarte', 'pie', 'apple'],
      'patisserie': ['patisserie', 'pastry', 'eclair', 'millefeuille'],
      'viennoiserie': ['croissant', 'pain', 'chocolat'],
    };
    
    const catKeywords = categoryKeywords[category] || [];
    categoryMatch = catKeywords.some(keyword => 
      imageUrl.includes(keyword) || productName.includes(keyword)
    );
  }

  const mismatches: string[] = [];
  
  if (productType === 'pizza' && (imageUrl.includes('burger') || imageUrl.includes('hamburger'))) {
    mismatches.push('Image de burger pour une pizza');
  }
  
  if (productType === 'burger' && imageUrl.includes('pizza')) {
    mismatches.push('Image de pizza pour un burger');
  }
  
  if (productType === 'dessert' && (imageUrl.includes('pizza') || imageUrl.includes('burger'))) {
    mismatches.push('Image de plat principal pour un dessert');
  }
  
  if (productType === 'drink' && (imageUrl.includes('pizza') || imageUrl.includes('burger') || imageUrl.includes('cake'))) {
    mismatches.push('Image de nourriture solide pour une boisson');
  }

  if (mismatches.length > 0) {
    issues.push(...mismatches);
    return { status: 'mismatch', issues };
  }

  if (imageUrl.includes('unsplash.com')) {
    if (!hasMatchingKeyword && !categoryMatch) {
      issues.push('Image Unsplash générique, correspondance incertaine');
      return { status: 'mismatch', issues };
    }
  }

  return { status: 'valid', issues: [] };
}

async function analyzeAllProducts() {
  console.log("🔍 ANALYSE DES PRODUITS ET IDENTIFICATION DES IMAGES À CHANGER\n");
  console.log("=".repeat(70));

  try {
    const allProducts = await db.select().from(pizzas);
    const allRestaurants = await db.select().from(restaurants);
    
    const restaurantMap = new Map(allRestaurants.map(r => [r.id, r.name]));

    console.log(`\n📊 STATISTIQUES GLOBALES:`);
    console.log(`   Total produits: ${allProducts.length}`);
    console.log(`   Total restaurants: ${allRestaurants.length}\n`);

    const analyses: ProductAnalysis[] = allProducts.map(product => {
      const restaurantName = restaurantMap.get(product.restaurantId) || 'Inconnu';
      const hasImage = !!(product.imageUrl && product.imageUrl.trim() !== '');
      const { status, issues } = analyzeImageMatch(product);

      return {
        product,
        restaurantName,
        hasImage,
        imageUrl: product.imageUrl,
        imageStatus: status,
        issues,
      };
    });

    // Produits sans images
    const productsWithoutImage = analyses.filter(a => !a.hasImage);
    console.log(`\n❌ PRODUITS SANS IMAGES: ${productsWithoutImage.length}`);
    if (productsWithoutImage.length > 0) {
      console.log("\n" + "─".repeat(70));
      productsWithoutImage.forEach(({ product, restaurantName }, index) => {
        console.log(`\n${index + 1}. "${product.name}"`);
        console.log(`   Restaurant: ${restaurantName}`);
        console.log(`   Type: ${product.productType || 'pizza'}`);
        console.log(`   Catégorie: ${product.category || 'N/A'}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   ❌ Problème: Image manquante`);
      });
    }

    // Produits avec images invalides
    const productsWithInvalidImages = analyses.filter(a => a.imageStatus === 'invalid');
    console.log(`\n\n⚠️  PRODUITS AVEC IMAGES INVALIDES: ${productsWithInvalidImages.length}`);
    if (productsWithInvalidImages.length > 0) {
      console.log("\n" + "─".repeat(70));
      productsWithInvalidImages.forEach(({ product, restaurantName, issues, imageUrl }, index) => {
        console.log(`\n${index + 1}. "${product.name}"`);
        console.log(`   Restaurant: ${restaurantName}`);
        console.log(`   Type: ${product.productType || 'pizza'}`);
        console.log(`   Image actuelle: ${imageUrl}`);
        console.log(`   ❌ Problème: ${issues.join(', ')}`);
      });
    }

    // Produits avec images incohérentes
    const productsWithMismatchedImages = analyses.filter(a => a.imageStatus === 'mismatch');
    console.log(`\n\n🔴 PRODUITS AVEC IMAGES INCOHÉRENTES: ${productsWithMismatchedImages.length}`);
    if (productsWithMismatchedImages.length > 0) {
      console.log("\n" + "─".repeat(70));
      productsWithMismatchedImages.forEach(({ product, restaurantName, issues, imageUrl }, index) => {
        console.log(`\n${index + 1}. "${product.name}"`);
        console.log(`   Restaurant: ${restaurantName}`);
        console.log(`   Type: ${product.productType || 'pizza'} | Catégorie: ${product.category || 'N/A'}`);
        console.log(`   Image actuelle: ${imageUrl}`);
        console.log(`   ❌ Problème: ${issues.join(', ')}`);
      });
    }

    // Produits valides
    const validProducts = analyses.filter(a => a.imageStatus === 'valid' && a.hasImage);
    console.log(`\n\n✅ PRODUITS AVEC IMAGES VALIDES: ${validProducts.length}`);

    // Résumé par restaurant
    console.log(`\n\n📋 RÉSUMÉ PAR RESTAURANT:`);
    console.log("=".repeat(70));
    const byRestaurant = new Map<string, { total: number; withoutImage: number; invalid: number; mismatch: number; valid: number }>();
    
    analyses.forEach(({ restaurantName, imageStatus, hasImage }) => {
      if (!byRestaurant.has(restaurantName)) {
        byRestaurant.set(restaurantName, { total: 0, withoutImage: 0, invalid: 0, mismatch: 0, valid: 0 });
      }
      const stats = byRestaurant.get(restaurantName)!;
      stats.total++;
      if (!hasImage) stats.withoutImage++;
      else if (imageStatus === 'invalid') stats.invalid++;
      else if (imageStatus === 'mismatch') stats.mismatch++;
      else if (imageStatus === 'valid') stats.valid++;
    });

    byRestaurant.forEach((stats, restaurantName) => {
      const problems = stats.withoutImage + stats.invalid + stats.mismatch;
      console.log(`\n${restaurantName}:`);
      console.log(`   Total: ${stats.total}`);
      console.log(`   ✅ Valides: ${stats.valid}`);
      if (problems > 0) {
        console.log(`   ❌ Sans images: ${stats.withoutImage}`);
        console.log(`   ⚠️  Images invalides: ${stats.invalid}`);
        console.log(`   🔴 Images incohérentes: ${stats.mismatch}`);
      }
    });

    // Liste finale des produits à changer
    const productsToChange = analyses.filter(a => 
      !a.hasImage || a.imageStatus === 'invalid' || a.imageStatus === 'mismatch'
    );

    console.log(`\n\n${"=".repeat(70)}`);
    console.log(`📝 RÉSUMÉ FINAL - PRODUITS À CHANGER:`);
    console.log("=".repeat(70));
    console.log(`\n   ❌ Sans images: ${productsWithoutImage.length}`);
    console.log(`   ⚠️  Images invalides: ${productsWithInvalidImages.length}`);
    console.log(`   🔴 Images incohérentes: ${productsWithMismatchedImages.length}`);
    console.log(`\n   🎯 TOTAL À CHANGER: ${productsToChange.length}`);
    console.log(`   ✅ À CONSERVER: ${validProducts.length}`);

    if (productsToChange.length > 0) {
      console.log(`\n\n📋 LISTE COMPLÈTE DES PRODUITS À CHANGER:`);
      console.log("=".repeat(70));
      productsToChange.forEach(({ product, restaurantName, imageStatus, issues, imageUrl }, index) => {
        console.log(`\n${index + 1}. "${product.name}"`);
        console.log(`   Restaurant: ${restaurantName}`);
        console.log(`   Type: ${product.productType || 'pizza'} | Catégorie: ${product.category || 'N/A'}`);
        if (imageUrl) {
          console.log(`   Image actuelle: ${imageUrl}`);
        }
        console.log(`   Statut: ${imageStatus === 'missing' ? '❌ Sans image' : imageStatus === 'invalid' ? '⚠️ Image invalide' : '🔴 Image incohérente'}`);
        if (issues.length > 0) {
          console.log(`   Raison: ${issues.join(', ')}`);
        }
      });
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log(`✨ Analyse terminée !`);
    console.log(`\n💡 Pour générer les prompts pour ces produits:`);
    console.log(`   npx tsx script/generate-image-prompt.ts`);

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

analyzeAllProducts();






