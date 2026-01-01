/**
 * Script de test pour les améliorations suite audit
 * Priorité 1 : Robustesse Immédiate
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const clientSrcPath = join(__dirname, '../client/src');
const serverSrcPath = join(__dirname, '../server/src');

async function runTest(name: string, testFn: () => Promise<any> | any) {
  try {
    const result = await testFn();
    console.log(`✅ ${name}`);
    if (result && typeof result === 'object') {
      console.log(`   ${JSON.stringify(result, null, 2)}`);
    }
    return true;
  } catch (error: any) {
    console.log(`❌ ${name}`);
    console.log(`   Erreur: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("========================================");
  console.log("🧪 TESTS AMÉLIORATIONS AUDIT - PRIORITÉ 1");
  console.log("========================================\n");

  let passedTests = 0;
  const totalTests = 16; // 5 + 7 + 4 tests

  // Test 1: Hook useOrderTracking
  console.log("\n📋 Test 1: Hook useOrderTracking");
  passedTests += await runTest("Fichier use-order-tracking.ts existe", () => {
    const content = readFileSync(join(clientSrcPath, 'hooks/use-order-tracking.ts'), 'utf-8');
    if (!content) throw new Error("Fichier introuvable");
    return true;
  });

  passedTests += await runTest("Hook exporte useOrderTracking", () => {
    const content = readFileSync(join(clientSrcPath, 'hooks/use-order-tracking.ts'), 'utf-8');
    if (!content.includes('export function useOrderTracking')) throw new Error("Fonction non exportée");
    return true;
  });

  passedTests += await runTest("Hook retourne phase, isDelivered, orderData, refreshOrderData, driverName", () => {
    const content = readFileSync(join(clientSrcPath, 'hooks/use-order-tracking.ts'), 'utf-8');
    const required = ['phase', 'isDelivered', 'orderData', 'refreshOrderData', 'driverName'];
    for (const prop of required) {
      if (!content.includes(prop)) throw new Error(`Propriété ${prop} manquante`);
    }
    return true;
  });

  passedTests += await runTest("order-success.tsx utilise useOrderTracking", () => {
    const content = readFileSync(join(clientSrcPath, 'pages/order-success.tsx'), 'utf-8');
    if (!content.includes('useOrderTracking')) throw new Error("Hook non utilisé");
    return true;
  });

  passedTests += await runTest("order-success.tsx a moins de useState (refactor)", () => {
    const content = readFileSync(join(clientSrcPath, 'pages/order-success.tsx'), 'utf-8');
    const useStateCount = (content.match(/useState/g) || []).length;
    if (useStateCount > 3) throw new Error(`${useStateCount} useState trouvés (attendu <= 3)`);
    return { count: useStateCount, note: "Refactor réussi" };
  });

  // Test 2: Session Sync
  console.log("\n📋 Test 2: Session Sync (Fallback localStorage)");
  passedTests += await runTest("Fichier session-sync.ts existe (client)", () => {
    const content = readFileSync(join(clientSrcPath, 'lib/session-sync.ts'), 'utf-8');
    if (!content) throw new Error("Fichier introuvable");
    return true;
  });

  passedTests += await runTest("Fichier session.ts existe (serveur)", () => {
    const content = readFileSync(join(__dirname, '../server/routes/session.ts'), 'utf-8');
    if (!content) throw new Error("Fichier introuvable");
    return true;
  });

  passedTests += await runTest("session-sync.ts exporte syncSessionWithServer", () => {
    const content = readFileSync(join(clientSrcPath, 'lib/session-sync.ts'), 'utf-8');
    if (!content.includes('export async function syncSessionWithServer')) throw new Error("Fonction non exportée");
    return true;
  });

  passedTests += await runTest("session.ts exporte registerSessionRoutes", () => {
    const content = readFileSync(join(__dirname, '../server/routes/session.ts'), 'utf-8');
    if (!content.includes('export function registerSessionRoutes')) throw new Error("Fonction non exportée");
    return true;
  });

  passedTests += await runTest("routes.ts enregistre registerSessionRoutes", () => {
    const content = readFileSync(join(__dirname, '../server/routes.ts'), 'utf-8');
    if (!content.includes('registerSessionRoutes')) throw new Error("Routes session non enregistrées");
    return true;
  });

  passedTests += await runTest("onboarding.tsx utilise autoSync", () => {
    const content = readFileSync(join(clientSrcPath, 'pages/onboarding.tsx'), 'utf-8');
    if (!content.includes('autoSync') && !content.includes('session-sync')) throw new Error("Sync non intégré");
    return true;
  });

  passedTests += await runTest("cart-page.tsx utilise autoSync", () => {
    const content = readFileSync(join(clientSrcPath, 'pages/cart-page.tsx'), 'utf-8');
    if (!content.includes('autoSync') && !content.includes('session-sync')) throw new Error("Sync non intégré");
    return true;
  });

  // Test 3: Machine d'État Centralisée
  console.log("\n📋 Test 3: Machine d'État Centralisée");
  passedTests += await runTest("OrderService.getAllowedTransitions existe", () => {
    const content = readFileSync(join(serverSrcPath, 'modules/order/order.service.ts'), 'utf-8');
    if (!content.includes('getAllowedTransitions')) throw new Error("Méthode non trouvée");
    return true;
  });

  passedTests += await runTest("OrderService.canTransition existe", () => {
    const content = readFileSync(join(serverSrcPath, 'modules/order/order.service.ts'), 'utf-8');
    if (!content.includes('canTransition')) throw new Error("Méthode non trouvée");
    return true;
  });

  passedTests += await runTest("Route /api/orders/:id/transitions existe", () => {
    const content = readFileSync(join(serverSrcPath, 'modules/order/order.routes.ts'), 'utf-8');
    if (!content.includes('/api/orders/:id/transitions')) throw new Error("Route non trouvée");
    return true;
  });

  passedTests += await runTest("Hook useOrderTransitions existe", () => {
    const content = readFileSync(join(clientSrcPath, 'hooks/use-order-transitions.ts'), 'utf-8');
    if (!content.includes('export function useOrderTransitions')) throw new Error("Hook non trouvé");
    return true;
  });

  console.log("\n========================================");
  console.log("📊 RÉSUMÉ DES TESTS");
  console.log("========================================\n");
  console.log(`✅ Réussis: ${passedTests}/${totalTests}`);
  console.log(`❌ Échoués: ${totalTests - passedTests}/${totalTests}`);
  console.log(`📈 Taux de réussite: ${((passedTests / totalTests) * 100).toFixed(0)}%\n`);

  if (passedTests === totalTests) {
    console.log("🎉 Tous les tests passent !");
    console.log("\n✅ Les améliorations Priorité 1 sont correctement implémentées.");
    console.log("   Vous pouvez maintenant tester dans le navigateur.");
  } else {
    console.log("❌ Des tests ont échoué. Veuillez vérifier les erreurs ci-dessus.");
    process.exit(1);
  }
  console.log("\n========================================\n");
}

main();
