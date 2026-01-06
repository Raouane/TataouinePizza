/**
 * Script pour tester l'accès aux images via HTTP
 */

import "dotenv/config";

const baseUrl = process.env.VITE_API_URL || "http://localhost:5000";
const testImages = [
  "/images/products/pizza-4-fromages.jpg",
  "/images/products/pizza-pepperoni.jpg",
  "/images/products/baklava.jpg",
  "/images/products/macarons.jpg",
];

async function testImageAccess() {
  console.log(`🔍 Test d'accès aux images sur ${baseUrl}\n`);

  for (const imagePath of testImages) {
    const url = `${baseUrl}${imagePath}`;
    try {
      const response = await fetch(url, { method: "HEAD" });
      const status = response.status;
      const contentType = response.headers.get("content-type");
      
      if (status === 200) {
        console.log(`✅ ${imagePath}`);
        console.log(`   Status: ${status}, Content-Type: ${contentType}`);
      } else {
        console.log(`❌ ${imagePath}`);
        console.log(`   Status: ${status}`);
      }
    } catch (error: any) {
      console.log(`❌ ${imagePath}`);
      console.log(`   Erreur: ${error.message}`);
    }
    console.log();
  }
}

testImageAccess()
  .then(() => {
    console.log("✅ Test terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
  });
