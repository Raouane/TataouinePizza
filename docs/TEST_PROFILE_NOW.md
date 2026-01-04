# 🧪 Test Immédiat - Profil

## ⚡ Test Rapide (Copier-Coller)

Ouvrez la console (F12) et copiez-collez ce script :

```javascript
// 🧪 TEST COMPLET DU PROFIL
console.log('🧪 Début du test du profil...\n');

// 1. Nettoyage
localStorage.clear();
console.log('✅ 1. Nettoyage effectué');

// 2. Créer des données de test
localStorage.setItem('customerName', 'Test User');
localStorage.setItem('customerPhone', '21688888888');
localStorage.setItem('savedAddresses_21688888888', JSON.stringify([
  { id: '1', label: 'Domicile', street: '123 Rue Test, Tunis', isDefault: true }
]));

console.log('✅ 2. Données de test créées');
console.log('   - Nom: Test User');
console.log('   - Téléphone: 21688888888');
console.log('   - Adresses: 1 adresse\n');

// 3. Vérification
const name = localStorage.getItem('customerName');
const phone = localStorage.getItem('customerPhone');
const addresses = JSON.parse(localStorage.getItem('savedAddresses_21688888888') || '[]');

console.log('📊 Vérification:');
console.log('   - customerName:', name ? '✅' : '❌', name);
console.log('   - customerPhone:', phone ? '✅' : '❌', phone);
console.log('   - Adresses:', addresses.length, 'adresse(s)');

// 4. Redirection vers le profil
console.log('\n✅ Redirection vers /profile dans 2 secondes...');
setTimeout(() => {
  location.href = '/profile';
}, 2000);
```

---

## ✅ Vérifications à Faire

Une fois sur `/profile`, vérifiez :

1. **Affichage des données** :
   - ✅ Le nom "Test User" s'affiche
   - ✅ Le téléphone "21688888888" est visible
   - ✅ L'avatar affiche les initiales "TU"

2. **Menu Adresses** :
   - ✅ Cliquer sur "Adresses"
   - ✅ Voir "1 adresse sauvegardée" ou "1 adresse sauvegardée"
   - ✅ L'adresse "Domicile" est visible

3. **Console (F12)** :
   - ✅ Chercher les logs `[Profile] 🔄 Identité utilisateur synchronisée`
   - ✅ Chercher `[Profile] 📍 1 adresse(s) chargée(s)`

4. **Test de déconnexion** :
   - ✅ Cliquer sur "Déconnexion" (en bas)
   - ✅ Toast de confirmation
   - ✅ Redirection vers `/`
   - ✅ Vérifier : `localStorage.getItem('customerName')` → `null`

---

## 🔍 Vérification Rapide dans la Console

Après avoir testé, exécutez ceci pour vérifier l'état :

```javascript
// Vérifier l'état actuel
console.log('=== ÉTAT ACTUEL ===');
console.log('customerName:', localStorage.getItem('customerName'));
console.log('customerPhone:', localStorage.getItem('customerPhone'));
console.log('Adresses:', localStorage.getItem('savedAddresses_21688888888') ? '✅ Présentes' : '❌ Absentes');
```

---

## 🐛 Si ça ne fonctionne pas

### Le profil ne s'affiche pas
```javascript
// Vérifier les données
console.log('customerName:', localStorage.getItem('customerName'));
console.log('customerPhone:', localStorage.getItem('customerPhone'));

// Si null, recréer :
localStorage.setItem('customerName', 'Test');
localStorage.setItem('customerPhone', '21688888888');
location.reload();
```

### Les adresses ne se chargent pas
```javascript
// Vérifier la clé
const phone = localStorage.getItem('customerPhone');
console.log('Téléphone:', phone);
console.log('Clé adresses:', `savedAddresses_${phone}`);
console.log('Données:', localStorage.getItem(`savedAddresses_${phone}`));
```

### Pas de logs dans la console
- Vérifier que la console est ouverte (F12)
- Vérifier qu'il n'y a pas de filtres actifs dans la console
- Recharger la page

---

**💡 Astuce :** Gardez la console ouverte (F12) pour voir tous les logs en temps réel !
