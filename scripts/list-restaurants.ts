import "dotenv/config";
if (process.env.DATABASE_URL?.includes('supabase')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
import { db } from "../server/db";
import { restaurants } from "../shared/schema";

async function listRestaurants() {
  const restos = await db.select().from(restaurants);
  console.log(`\n📋 ${restos.length} restaurant(s) trouvé(s):\n`);
  restos.forEach(r => {
    const categories = Array.isArray(r.categories) 
      ? r.categories 
      : typeof r.categories === 'string' 
      ? JSON.parse(r.categories) 
      : [];
    console.log(`- ${r.name}`);
    console.log(`  Catégories: ${categories.join(', ') || 'aucune'}`);
    console.log(`  ID: ${r.id}\n`);
  });
  process.exit(0);
}

listRestaurants();
