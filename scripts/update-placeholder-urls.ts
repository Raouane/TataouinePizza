import "dotenv/config";
if (process.env.DATABASE_URL?.includes('supabase')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
import { db } from "../server/db";
import { pizzas } from "../shared/schema";
import { eq } from "drizzle-orm";

const products = [
  { name: "Tataouine Spéciale", slug: "tataouine-speciale" },
  { name: "4 Fromages", slug: "4-fromages" },
  { name: "Vegetarian", slug: "vegetarian" },
  { name: "Mechoui", slug: "mechoui" },
  { name: "Brochettes Mixtes", slug: "brochettes-mixtes" },
  { name: "Pizza Œuf au Plat", slug: "pizza-oeuf-au-plat" },
];

async function updatePlaceholderUrls() {
  console.log("🔄 Mise à jour des URLs pour les placeholders...\n");
  
  for (const product of products) {
    const url = `/images/products/${product.slug}.svg`;
    await db.update(pizzas)
      .set({ imageUrl: url, updatedAt: new Date() })
      .where(eq(pizzas.name, product.name));
    console.log(`✅ ${product.name} → ${url}`);
  }
  
  console.log("\n✨ Terminé !");
  process.exit(0);
}

updatePlaceholderUrls();
