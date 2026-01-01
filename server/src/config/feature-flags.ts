/**
 * Feature Flags pour l'architecture V2
 * Permet d'activer/désactiver progressivement les modules V2
 */

export const FEATURE_FLAGS = {
  // Activer les routes Order V2 (remplace les routes Order dans public.ts)
  USE_ORDER_V2_ROUTES: process.env.USE_ORDER_V2_ROUTES === 'true' || false,
  
  // Activer les autres modules V2 quand ils seront créés
  USE_AUTH_V2_ROUTES: process.env.USE_AUTH_V2_ROUTES === 'true' || false,
  USE_RESTAURANT_V2_ROUTES: process.env.USE_RESTAURANT_V2_ROUTES === 'true' || false,
  USE_DRIVER_V2_ROUTES: process.env.USE_DRIVER_V2_ROUTES === 'true' || false,
} as const;

/**
 * Log les feature flags au démarrage
 */
export function logFeatureFlags() {
  console.log('[FEATURE FLAGS] Configuration V2:');
  console.log(`  - Order V2 Routes: ${FEATURE_FLAGS.USE_ORDER_V2_ROUTES ? '✅ Activé' : '❌ Désactivé'}`);
  console.log(`  - Auth V2 Routes: ${FEATURE_FLAGS.USE_AUTH_V2_ROUTES ? '✅ Activé' : '❌ Désactivé'}`);
  console.log(`  - Restaurant V2 Routes: ${FEATURE_FLAGS.USE_RESTAURANT_V2_ROUTES ? '✅ Activé' : '❌ Désactivé'}`);
  console.log(`  - Driver V2 Routes: ${FEATURE_FLAGS.USE_DRIVER_V2_ROUTES ? '✅ Activé' : '❌ Désactivé'}`);
}
