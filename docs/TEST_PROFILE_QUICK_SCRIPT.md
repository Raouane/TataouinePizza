# 🚀 Script de Test Rapide - Profil

## Utilisation

Copiez-collez ces scripts dans la console du navigateur (F12) pour tester rapidement les fonctionnalités.

---

## 🧹 Nettoyage Complet

```javascript
// Nettoyer toutes les données
localStorage.clear();
console.log('✅ localStorage nettoyé');
location.reload();
```

---

## 📝 Scénario 1 : Créer un Profil avec Onboarding

```javascript
// Créer des données d'onboarding complètes
localStorage.setItem('tp_onboarding', JSON.stringify({
  name: "Ahmed Ben Ali",
  phone: "21688888888",
  address: "123 Rue de la République, Tunis",
  addressDetails: "Appartement 4B",
  lat: 36.8065,
  lng: 10.1815
}));

console.log('✅ Onboarding créé');
console.log('Données:', localStorage.getItem('tp_onboarding'));
location.href = '/profile';
```

---

## 🛒 Scénario 2 : Créer un Profil avec Données Cart

```javascript
// Nettoyer d'abord
localStorage.removeItem('tp_onboarding');

// Créer des données depuis le panier
localStorage.setItem('customerName', 'Mohamed Trabelsi');
localStorage.setItem('customerPhone', '21699999999');

console.log('✅ Données cart créées');
console.log('customerName:', localStorage.getItem('customerName'));
console.log('customerPhone:', localStorage.getItem('customerPhone'));
location.href = '/profile';
```

---

## 🔀 Scénario 3 : Données Mixtes

```javascript
// Onboarding partiel (sans téléphone)
localStorage.setItem('tp_onboarding', JSON.stringify({
  name: "Sara Khalfi",
  phone: null,
  address: "456 Avenue Habib Bourguiba"
}));

// Données cart avec téléphone
localStorage.setItem('customerName', 'Sara Khalfi');
localStorage.setItem('customerPhone', '21677777777');

console.log('✅ Données mixtes créées');
location.href = '/profile';
```

---

## 📍 Scénario 4 : Tester les Adresses

```javascript
// Créer un utilisateur avec téléphone
localStorage.setItem('customerPhone', '21688888888');
localStorage.setItem('customerName', 'Test User');

// Créer des adresses sauvegardées
const addresses = [
  {
    id: '1',
    label: 'Domicile',
    street: '123 Rue de la République, Tunis',
    details: 'Appartement 4B',
    isDefault: true
  },
  {
    id: '2',
    label: 'Travail',
    street: '456 Avenue Habib Bourguiba, Tunis',
    isDefault: false
  }
];

localStorage.setItem('savedAddresses_21688888888', JSON.stringify(addresses));

console.log('✅ Adresses créées');
console.log('Adresses:', JSON.parse(localStorage.getItem('savedAddresses_21688888888')));
location.href = '/profile';
```

---

## 🔄 Scénario 5 : Tester la Synchronisation

```javascript
// Étape 1 : Créer des données initiales
localStorage.setItem('customerName', 'Nom Initial');
localStorage.setItem('customerPhone', '21611111111');
console.log('✅ Données initiales créées');
location.href = '/profile';

// Étape 2 : Attendre que le profil se charge, puis dans la console :
// Modifier les données
localStorage.setItem('customerName', 'Nom Modifié');
console.log('✅ Données modifiées - Le profil devrait se mettre à jour dans 500ms');
```

---

## 🚪 Scénario 6 : Tester la Déconnexion

```javascript
// Créer des données complètes
localStorage.setItem('tp_onboarding', JSON.stringify({
  name: "User Test",
  phone: "21688888888",
  address: "123 Test Street"
}));
localStorage.setItem('customerName', 'User Test');
localStorage.setItem('customerPhone', '21688888888');
localStorage.setItem('savedAddresses_21688888888', JSON.stringify([
  { id: '1', label: 'Home', street: '123 Test', isDefault: true }
]));

console.log('✅ Données créées pour test de déconnexion');
console.log('Avant déconnexion:');
console.log('  - tp_onboarding:', localStorage.getItem('tp_onboarding') ? '✅' : '❌');
console.log('  - customerName:', localStorage.getItem('customerName') ? '✅' : '❌');
console.log('  - customerPhone:', localStorage.getItem('customerPhone') ? '✅' : '❌');
console.log('  - savedAddresses:', localStorage.getItem('savedAddresses_21688888888') ? '✅' : '❌');

location.href = '/profile';
// Cliquer sur "Déconnexion" dans l'interface, puis vérifier :
// console.log('Après déconnexion:', localStorage.getItem('customerName')); // devrait être null
```

---

## 🔍 Vérification de l'État Actuel

```javascript
// Afficher toutes les données utilisateur actuelles
console.log('=== ÉTAT ACTUEL DU PROFIL ===');
console.log('Onboarding:', localStorage.getItem('tp_onboarding'));
console.log('Customer Name:', localStorage.getItem('customerName'));
console.log('Customer Phone:', localStorage.getItem('customerPhone'));

// Lister toutes les adresses sauvegardées
const addressKeys = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.startsWith('savedAddresses_')) {
    addressKeys.push(key);
  }
}

console.log('Adresses sauvegardées:');
addressKeys.forEach(key => {
  const phone = key.replace('savedAddresses_', '');
  const addresses = JSON.parse(localStorage.getItem(key) || '[]');
  console.log(`  ${phone}: ${addresses.length} adresse(s)`);
  addresses.forEach(addr => {
    console.log(`    - ${addr.label}: ${addr.street}${addr.isDefault ? ' (défaut)' : ''}`);
  });
});
```

---

## 🧪 Test Complet Automatisé

```javascript
// Script de test complet (à exécuter dans la console)
async function testProfileComplete() {
  console.log('🧪 Début des tests du profil...\n');
  
  // 1. Nettoyage
  localStorage.clear();
  console.log('✅ 1. Nettoyage effectué');
  
  // 2. Test onboarding
  localStorage.setItem('tp_onboarding', JSON.stringify({
    name: "Test User",
    phone: "21688888888",
    address: "123 Test"
  }));
  console.log('✅ 2. Onboarding créé');
  
  // 3. Test adresses
  localStorage.setItem('savedAddresses_21688888888', JSON.stringify([
    { id: '1', label: 'Home', street: '123 Test', isDefault: true }
  ]));
  console.log('✅ 3. Adresses créées');
  
  // 4. Vérification
  const onboarding = JSON.parse(localStorage.getItem('tp_onboarding') || 'null');
  const addresses = JSON.parse(localStorage.getItem('savedAddresses_21688888888') || '[]');
  
  console.log('\n📊 Résultats:');
  console.log('  - Onboarding:', onboarding ? '✅' : '❌');
  console.log('  - Nom:', onboarding?.name || '❌');
  console.log('  - Téléphone:', onboarding?.phone || '❌');
  console.log('  - Adresses:', addresses.length, 'adresse(s)');
  
  console.log('\n✅ Tests terminés ! Redirection vers /profile...');
  setTimeout(() => {
    location.href = '/profile';
  }, 1000);
}

// Exécuter le test
testProfileComplete();
```

---

## 📋 Checklist Rapide

```javascript
// Vérifier rapidement que tout fonctionne
function quickCheck() {
  const checks = {
    onboarding: !!localStorage.getItem('tp_onboarding'),
    customerName: !!localStorage.getItem('customerName'),
    customerPhone: !!localStorage.getItem('customerPhone'),
    hasAddresses: (() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('savedAddresses_')) {
          return true;
        }
      }
      return false;
    })()
  };
  
  console.log('=== VÉRIFICATION RAPIDE ===');
  console.log('Onboarding:', checks.onboarding ? '✅' : '❌');
  console.log('Customer Name:', checks.customerName ? '✅' : '❌');
  console.log('Customer Phone:', checks.customerPhone ? '✅' : '❌');
  console.log('Adresses sauvegardées:', checks.hasAddresses ? '✅' : '❌');
  
  return checks;
}

quickCheck();
```

---

## 🎯 Test de Performance

```javascript
// Mesurer le temps de synchronisation
function testSyncPerformance() {
  const start = performance.now();
  
  // Modifier les données
  localStorage.setItem('customerName', 'Performance Test');
  
  // Attendre la synchronisation (500ms)
  setTimeout(() => {
    const end = performance.now();
    const duration = end - start;
    console.log(`⏱️ Synchronisation en ${duration.toFixed(2)}ms`);
    
    if (duration < 600) {
      console.log('✅ Performance OK (< 600ms)');
    } else {
      console.log('⚠️ Performance à améliorer (> 600ms)');
    }
  }, 600);
}

testSyncPerformance();
```

---

**💡 Astuce :** Gardez ces scripts dans vos favoris ou créez un fichier bookmarklet pour les exécuter rapidement !
