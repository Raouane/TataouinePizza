# 🧪 Guide de Test Simplifié - Profil

## 🎯 Test Rapide en 3 Étapes

### Étape 1 : Ouvrir la Console
```
Appuyez sur F12 → Onglet "Console"
```

### Étape 2 : Copier-Coller ce Script
```javascript
// Test complet automatique
localStorage.clear();
localStorage.setItem('customerName', 'Test User');
localStorage.setItem('customerPhone', '21688888888');
localStorage.setItem('savedAddresses_21688888888', JSON.stringify([
  { id: '1', label: 'Domicile', street: '123 Test Street', isDefault: true }
]));
console.log('✅ Données de test créées !');
location.href = '/profile';
```

### Étape 3 : Vérifier
1. ✅ Le profil s'affiche avec "Test User"
2. ✅ Le téléphone "21688888888" est visible
3. ✅ Cliquer sur "Adresses" → voir "1 adresse sauvegardée"
4. ✅ Cliquer sur "Déconnexion" → tout est supprimé

---

## 📱 Scénarios de Test Essentiels

### ✅ Test 1 : Profil avec Onboarding
```javascript
localStorage.setItem('tp_onboarding', JSON.stringify({
  name: "Ahmed",
  phone: "21688888888",
  address: "123 Rue Test"
}));
location.href = '/profile';
```
**Résultat attendu :** Nom, téléphone et adresse visibles

---

### ✅ Test 2 : Profil avec Données Cart
```javascript
localStorage.removeItem('tp_onboarding');
localStorage.setItem('customerName', 'Mohamed');
localStorage.setItem('customerPhone', '21699999999');
location.href = '/profile';
```
**Résultat attendu :** Nom et téléphone visibles (pas d'adresse)

---

### ✅ Test 3 : Ajouter une Adresse
1. Aller sur `/profile`
2. Cliquer sur "Adresses"
3. Cliquer sur "Ajouter une nouvelle adresse"
4. Remplir :
   - Nom : "Domicile"
   - Adresse : "123 Rue Test" (minimum 5 caractères)
5. Cliquer sur "Enregistrer"
**Résultat attendu :** Toast de confirmation + adresse visible

---

### ✅ Test 4 : Déconnexion
1. Aller sur `/profile`
2. Cliquer sur "Déconnexion" (en bas)
**Résultat attendu :** 
- Toast "Déconnexion réussie"
- Redirection vers `/`
- localStorage vide

---

## 🔍 Vérification Rapide

### Voir les Données Actuelles
```javascript
console.log('Onboarding:', localStorage.getItem('tp_onboarding'));
console.log('Customer:', localStorage.getItem('customerName'));
console.log('Phone:', localStorage.getItem('customerPhone'));
```

### Nettoyer Tout
```javascript
localStorage.clear();
location.reload();
```

---

## ⚠️ Problèmes Courants

### Le profil ne s'affiche pas
**Solution :** Vérifier que vous avez au moins `customerName` ou `customerPhone`
```javascript
localStorage.setItem('customerName', 'Test');
location.reload();
```

### Les adresses ne se chargent pas
**Solution :** Vérifier que vous avez un téléphone
```javascript
console.log('Phone:', localStorage.getItem('customerPhone'));
// Si null, créer un téléphone :
localStorage.setItem('customerPhone', '21688888888');
```

### La synchronisation ne fonctionne pas
**Solution :** Attendre 500ms après modification
```javascript
localStorage.setItem('customerName', 'Nouveau Nom');
// Attendre 500ms → le profil se met à jour automatiquement
```

---

## 📊 Checklist de Validation

- [ ] Le profil s'affiche avec des données d'onboarding
- [ ] Le profil s'affiche avec des données cart (sans onboarding)
- [ ] Les adresses se chargent et s'affichent
- [ ] On peut ajouter une nouvelle adresse
- [ ] On peut définir une adresse par défaut
- [ ] On peut supprimer une adresse (si plus d'une)
- [ ] La déconnexion nettoie tout
- [ ] Pas d'erreurs dans la console
- [ ] Les logs `[Profile]` s'affichent dans la console

---

**💡 Astuce :** Gardez la console ouverte (F12) pour voir les logs en temps réel !
