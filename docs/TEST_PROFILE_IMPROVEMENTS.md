# 🧪 Guide de Test - Améliorations du Profil

## 📋 Vue d'ensemble

Ce guide permet de tester les améliorations apportées à la page Profile, notamment :
- ✅ Fusion des sources de données (onboarding + cart)
- ✅ Synchronisation en temps réel
- ✅ Gestion des adresses dynamique
- ✅ Fonction de déconnexion

---

## 🛠️ Préparation

### 1. Ouvrir la console du navigateur

Appuyez sur `F12` ou `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac) pour ouvrir les DevTools.

**Onglet à surveiller :** Console (pour voir les logs `[Profile]`)

### 2. Accéder à la page Profile

```
http://localhost:5173/profile
```

ou en production :
```
https://votre-domaine.com/profile
```

---

## 🧪 Scénarios de Test

### **Scénario 1 : Profil avec Onboarding Complet**

**Objectif :** Vérifier que les données d'onboarding s'affichent correctement

#### Étapes :

1. **Nettoyer le localStorage** (dans la console) :
```javascript
localStorage.clear();
```

2. **Compléter l'onboarding** :
   - Aller sur `/onboarding`
   - Remplir : Nom, Téléphone, Adresse
   - Valider

3. **Vérifier le profil** :
   - Aller sur `/profile`
   - ✅ Le nom doit s'afficher
   - ✅ Le téléphone doit s'afficher
   - ✅ L'adresse doit s'afficher
   - ✅ L'avatar doit afficher les initiales du nom

4. **Vérifier les logs console** :
   - Chercher : `[Profile] 🔄 Identité utilisateur synchronisée`
   - Vérifier : `source: 'onboarding'`, `hasFullProfile: true`

#### Résultat attendu :
```
✅ Toutes les données d'onboarding sont visibles
✅ Logs montrent source: 'onboarding'
```

---

### **Scénario 2 : Profil avec Données du Panier (Sans Onboarding)**

**Objectif :** Vérifier le fallback vers `customerName`/`customerPhone`

#### Étapes :

1. **Nettoyer le localStorage** :
```javascript
localStorage.clear();
```

2. **Créer une commande sans onboarding** :
   - Aller sur `/` (page d'accueil)
   - Ajouter des produits au panier
   - Aller au panier (`/cart`)
   - Remplir : Nom et Téléphone (sans passer par onboarding)
   - Passer une commande (ou au moins remplir les champs)

3. **Vérifier le localStorage** (dans la console) :
```javascript
console.log('customerName:', localStorage.getItem('customerName'));
console.log('customerPhone:', localStorage.getItem('customerPhone'));
```

4. **Aller sur `/profile`** :
   - ✅ Le nom doit s'afficher (depuis `customerName`)
   - ✅ Le téléphone doit s'afficher (depuis `customerPhone`)
   - ⚠️ L'adresse peut être vide (normal, pas d'onboarding)

5. **Vérifier les logs console** :
   - Chercher : `[Profile] 🔄 Identité utilisateur synchronisée`
   - Vérifier : `source: 'cart'`, `hasFullProfile: false`

#### Résultat attendu :
```
✅ Les données du panier sont visibles dans le profil
✅ Logs montrent source: 'cart'
✅ Pas de message "Profil non trouvé"
```

---

### **Scénario 3 : Données Mixtes (Onboarding Partiel + Cart)**

**Objectif :** Vérifier la fusion intelligente des sources

#### Étapes :

1. **Créer un onboarding partiel** :
```javascript
localStorage.setItem('tp_onboarding', JSON.stringify({
  name: "Ahmed Ben Ali",
  phone: null  // Pas de téléphone dans onboarding
}));
```

2. **Créer des données cart** :
```javascript
localStorage.setItem('customerName', "Ahmed Ben Ali");
localStorage.setItem('customerPhone', "21688888888");
```

3. **Recharger la page `/profile`** :
   - ✅ Le nom doit s'afficher (depuis onboarding)
   - ✅ Le téléphone doit s'afficher (depuis cart)
   - ✅ Logs montrent `source: 'mixed'`

#### Résultat attendu :
```
✅ Fusion correcte des données
✅ Logs montrent source: 'mixed'
```

---

### **Scénario 4 : Gestion des Adresses**

**Objectif :** Vérifier que les adresses se chargent et se sauvegardent correctement

#### Étapes :

1. **Préparer un utilisateur avec téléphone** :
```javascript
localStorage.setItem('customerPhone', '21688888888');
localStorage.setItem('customerName', 'Test User');
```

2. **Aller sur `/profile`**

3. **Cliquer sur "Adresses"** dans le menu

4. **Ajouter une adresse** :
   - Cliquer sur "Ajouter une nouvelle adresse"
   - Remplir :
     - Nom : "Domicile"
     - Adresse : "123 Rue de la République, Tunis"
     - Détails : "Appartement 4B" (optionnel)
   - Cliquer sur "Enregistrer l'adresse"

5. **Vérifier** :
   - ✅ L'adresse apparaît dans la liste
   - ✅ Un toast de confirmation s'affiche
   - ✅ Logs console : `[Profile] 💾 1 adresse(s) sauvegardée(s)`

6. **Vérifier le localStorage** :
```javascript
const saved = localStorage.getItem('savedAddresses_21688888888');
console.log('Adresses sauvegardées:', JSON.parse(saved));
```

7. **Tester les actions** :
   - ⭐ Définir comme défaut (bouton étoile)
   - 🗑️ Supprimer une adresse (si plus d'une)
   - ✅ Vérifier qu'on ne peut pas supprimer la dernière adresse

#### Résultat attendu :
```
✅ Les adresses se sauvegardent avec la clé savedAddresses_{phone}
✅ Les actions (défaut, suppression) fonctionnent
✅ Validation : minimum 5 caractères, pas de doublons
```

---

### **Scénario 5 : Synchronisation en Temps Réel**

**Objectif :** Vérifier que le profil se met à jour automatiquement

#### Test A : Changement dans le même onglet

1. **Ouvrir `/profile` dans un onglet**

2. **Dans la console, modifier les données** :
```javascript
localStorage.setItem('customerName', 'Nouveau Nom');
```

3. **Attendre 500ms** (vérification périodique)

4. **Vérifier** :
   - ✅ Le nom dans le profil se met à jour automatiquement
   - ✅ Logs : `[Profile] 🔄 Identité utilisateur synchronisée`

#### Test B : Changement depuis un autre onglet

1. **Ouvrir `/profile` dans l'onglet 1**

2. **Ouvrir `/cart` dans l'onglet 2**

3. **Dans l'onglet 2, remplir le formulaire de commande** :
   - Nom : "Test Multi-Onglet"
   - Téléphone : "21699999999"
   - Sauvegarder (cela met à jour `customerName` et `customerPhone`)

4. **Revenir à l'onglet 1** :
   - ✅ Le profil doit se mettre à jour automatiquement
   - ✅ Les nouvelles données doivent apparaître

#### Résultat attendu :
```
✅ Synchronisation automatique dans le même onglet (500ms)
✅ Synchronisation automatique entre onglets (événement storage)
```

---

### **Scénario 6 : Fonction de Déconnexion**

**Objectif :** Vérifier que la déconnexion nettoie toutes les données

#### Étapes :

1. **Préparer des données** :
```javascript
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
```

2. **Vérifier que les données existent** :
```javascript
console.log('Avant déconnexion:');
console.log('tp_onboarding:', localStorage.getItem('tp_onboarding'));
console.log('customerName:', localStorage.getItem('customerName'));
console.log('customerPhone:', localStorage.getItem('customerPhone'));
console.log('savedAddresses:', localStorage.getItem('savedAddresses_21688888888'));
```

3. **Aller sur `/profile`**

4. **Cliquer sur "Déconnexion"** (en bas de la page)

5. **Vérifier** :
   - ✅ Un toast de confirmation s'affiche
   - ✅ Redirection vers `/` après 500ms
   - ✅ Logs : `[Profile] 🚪 Déconnexion effectuée - données nettoyées`

6. **Vérifier le localStorage** (après redirection) :
```javascript
console.log('Après déconnexion:');
console.log('tp_onboarding:', localStorage.getItem('tp_onboarding')); // null
console.log('customerName:', localStorage.getItem('customerName')); // null
console.log('customerPhone:', localStorage.getItem('customerPhone')); // null
console.log('savedAddresses:', localStorage.getItem('savedAddresses_21688888888')); // null
```

#### Résultat attendu :
```
✅ Toutes les données sont supprimées
✅ Redirection vers la page d'accueil
✅ Message de confirmation affiché
```

---

### **Scénario 7 : Message "Profil non trouvé"**

**Objectif :** Vérifier que le message s'affiche uniquement si nécessaire

#### Test A : Onboarding activé, pas de données

1. **Nettoyer tout** :
```javascript
localStorage.clear();
```

2. **Vérifier que l'onboarding est activé** :
   - Vérifier `.env` : `VITE_ENABLE_ONBOARDING=true`

3. **Aller sur `/profile`** :
   - ✅ Message "Profil non trouvé" doit s'afficher
   - ✅ Bouton vers `/onboarding` doit être présent

#### Test B : Onboarding désactivé, pas de données

1. **Nettoyer tout** :
```javascript
localStorage.clear();
```

2. **Désactiver l'onboarding** :
   - `.env` : `VITE_ENABLE_ONBOARDING=false`
   - Redémarrer le serveur

3. **Aller sur `/profile`** :
   - ✅ Le profil doit s'afficher (même vide)
   - ✅ Pas de message "Profil non trouvé"
   - ✅ Affichage "Invité" si pas de nom

#### Résultat attendu :
```
✅ Message "Profil non trouvé" uniquement si onboarding activé ET pas de données
✅ Accès direct si onboarding désactivé
```

---

## 🔍 Vérifications Techniques

### Logs Console à Surveiller

```javascript
// Synchronisation
[Profile] 🔄 Identité utilisateur synchronisée: { source: 'onboarding', hasFullProfile: true, hasPhone: true }

// Chargement des adresses
[Profile] 📍 2 adresse(s) chargée(s) pour 21688888888

// Sauvegarde des adresses
[Profile] 💾 2 adresse(s) sauvegardée(s) pour 21688888888

// Déconnexion
[Profile] 🚪 Déconnexion effectuée - données nettoyées
```

### Structure localStorage Attendue

```javascript
// Données d'identité
tp_onboarding: { name, phone, address, addressDetails, lat, lng }
customerName: "Nom"
customerPhone: "21688888888"

// Adresses (liées au téléphone)
savedAddresses_21688888888: [
  { id, label, street, details?, isDefault? }
]
```

---

## ✅ Checklist de Validation

- [ ] **Scénario 1** : Profil avec onboarding complet fonctionne
- [ ] **Scénario 2** : Profil avec données cart fonctionne (fallback)
- [ ] **Scénario 3** : Fusion des données mixtes fonctionne
- [ ] **Scénario 4** : Gestion des adresses fonctionne (ajout, défaut, suppression)
- [ ] **Scénario 5** : Synchronisation en temps réel fonctionne
- [ ] **Scénario 6** : Déconnexion nettoie toutes les données
- [ ] **Scénario 7** : Message "Profil non trouvé" s'affiche correctement
- [ ] **Logs console** : Tous les logs s'affichent correctement
- [ ] **Pas d'erreurs** : Aucune erreur dans la console
- [ ] **Responsive** : Le profil fonctionne sur mobile et desktop

---

## 🐛 Dépannage

### Problème : Les données ne se synchronisent pas

**Solution :**
- Vérifier que l'intervalle de 500ms fonctionne
- Vérifier les logs console pour voir si la synchronisation est déclenchée
- Vérifier que les clés localStorage sont correctes

### Problème : Les adresses ne se chargent pas

**Solution :**
- Vérifier que `userIdentity.phone` existe
- Vérifier la clé : `savedAddresses_${phone}` (avec le bon format de téléphone)
- Vérifier le format JSON dans localStorage

### Problème : La déconnexion ne fonctionne pas

**Solution :**
- Vérifier que le bouton appelle bien `handleLogout`
- Vérifier les logs console
- Vérifier que `setLocation` fonctionne

---

## 📝 Notes

- Les logs `[Profile]` sont utiles pour le debug
- La synchronisation fonctionne même si l'onboarding est désactivé
- Les adresses sont liées au téléphone, pas à l'onboarding
- La déconnexion supprime TOUTES les adresses (sécurité maximale)

---

**Date de création :** 2024
**Version :** 1.0
