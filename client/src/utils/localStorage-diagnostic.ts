/**
 * Script de diagnostic pour vérifier le localStorage
 * Utilisé pour déboguer les problèmes de persistance des données
 */

export interface LocalStorageDiagnostic {
  isAvailable: boolean;
  quota: number | null;
  usage: number | null;
  items: Record<string, string>;
  errors: string[];
}

/**
 * Vérifie si le localStorage est disponible et fonctionnel
 */
export function checkLocalStorage(): LocalStorageDiagnostic {
  const diagnostic: LocalStorageDiagnostic = {
    isAvailable: false,
    quota: null,
    usage: null,
    items: {},
    errors: [],
  };

  try {
    // Test 1: Vérifier si localStorage est disponible
    if (typeof Storage === 'undefined') {
      diagnostic.errors.push('Storage API non disponible dans ce navigateur');
      return diagnostic;
    }

    if (typeof localStorage === 'undefined') {
      diagnostic.errors.push('localStorage non disponible');
      return diagnostic;
    }

    // Test 2: Tester l'écriture et la lecture
    const testKey = '__localStorage_test__';
    const testValue = 'test_value_' + Date.now();
    
    try {
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      
      if (retrieved !== testValue) {
        diagnostic.errors.push('Échec du test de lecture/écriture');
        return diagnostic;
      }
      
      localStorage.removeItem(testKey);
      diagnostic.isAvailable = true;
    } catch (writeError: any) {
      diagnostic.errors.push(`Erreur d'écriture: ${writeError.message}`);
      
      // Vérifier si c'est un problème de quota
      if (writeError.name === 'QuotaExceededError' || writeError.code === 22) {
        diagnostic.errors.push('Quota localStorage dépassé');
      }
      
      // Vérifier si c'est un mode navigation privée
      if (writeError.name === 'SecurityError' || writeError.code === 18) {
        diagnostic.errors.push('localStorage bloqué (mode navigation privée ou restrictions)');
      }
      
      return diagnostic;
    }

    // Test 3: Calculer l'utilisation (approximative)
    try {
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          totalSize += key.length + value.length;
          diagnostic.items[key] = value.substring(0, 50) + (value.length > 50 ? '...' : '');
        }
      }
      diagnostic.usage = totalSize;
    } catch (error: any) {
      diagnostic.errors.push(`Erreur calcul usage: ${error.message}`);
    }

    // Test 4: Estimer le quota (si disponible)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate()
        .then((estimate) => {
          diagnostic.quota = estimate.quota ? Number(estimate.quota) : null;
          console.log('[LocalStorage] Quota disponible:', estimate.quota);
          console.log('[LocalStorage] Usage:', estimate.usage);
        })
        .catch((error) => {
          diagnostic.errors.push(`Erreur estimation quota: ${error.message}`);
        });
    }

  } catch (error: any) {
    diagnostic.errors.push(`Erreur générale: ${error.message}`);
  }

  return diagnostic;
}

/**
 * Affiche un rapport de diagnostic dans la console
 */
export function printLocalStorageDiagnostic(): void {
  console.log('========================================');
  console.log('[LocalStorage] 🔍 DIAGNOSTIC COMPLET');
  console.log('========================================');
  
  const diagnostic = checkLocalStorage();
  
  console.log('✅ Disponible:', diagnostic.isAvailable ? 'OUI' : 'NON');
  console.log('📊 Usage:', diagnostic.usage ? `${(diagnostic.usage / 1024).toFixed(2)} KB` : 'N/A');
  console.log('💾 Quota:', diagnostic.quota ? `${(diagnostic.quota / 1024 / 1024).toFixed(2)} MB` : 'N/A');
  
  if (diagnostic.errors.length > 0) {
    console.error('❌ Erreurs:');
    diagnostic.errors.forEach((error, index) => {
      console.error(`   ${index + 1}. ${error}`);
    });
  }
  
  console.log('📋 Éléments stockés:', Object.keys(diagnostic.items).length);
  Object.entries(diagnostic.items).forEach(([key, value]) => {
    console.log(`   - ${key}: ${value}`);
  });
  
  console.log('========================================');
  
  // Afficher aussi les clés importantes de l'application
  console.log('\n[LocalStorage] 🔑 Clés importantes de l\'application:');
  const importantKeys = [
    'driverToken',
    'driverId',
    'driverName',
    'driverPhone',
    'adminToken',
    'restaurantToken',
    'restaurantId',
    'restaurantName',
    'customerToken',
    'phone',
    'name',
    'address',
    'onboarding_data',
    'language',
    'audioPermissionGranted',
  ];
  
  importantKeys.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value) {
      const displayValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
      console.log(`   ✅ ${key}: ${displayValue}`);
    } else {
      console.log(`   ❌ ${key}: NON DÉFINI`);
    }
  });
  
  console.log('========================================');
}

/**
 * Teste l'écriture d'une valeur dans localStorage
 */
export function testLocalStorageWrite(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    const retrieved = localStorage.getItem(key);
    
    if (retrieved === value) {
      console.log(`[LocalStorage] ✅ Test écriture réussi pour "${key}"`);
      return true;
    } else {
      console.error(`[LocalStorage] ❌ Test écriture échoué pour "${key}" (valeur récupérée différente)`);
      return false;
    }
  } catch (error: any) {
    console.error(`[LocalStorage] ❌ Erreur écriture pour "${key}":`, error);
    return false;
  }
}

// Exporter pour utilisation dans la console du navigateur
if (typeof window !== 'undefined') {
  (window as any).checkLocalStorage = checkLocalStorage;
  (window as any).printLocalStorageDiagnostic = printLocalStorageDiagnostic;
  (window as any).testLocalStorageWrite = testLocalStorageWrite;
}
