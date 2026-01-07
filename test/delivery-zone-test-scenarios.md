# 📋 Scénarios de Test - Validation de Zone de Livraison

## 🎯 Scénarios de Test Complets

### Scénario 1 : Adresse Livrable Proche (< 2 km)

**Données de test** :
- Restaurant : BAB EL HARA (32.9295, 10.451)
- Adresse client : Cité Ennour (32.9145723, 10.4703577)
- Distance attendue : ~2.5 km

**Actions** :
1. Ajouter un produit au panier
2. Aller à l'étape "address" (3/4)
3. Sélectionner "Cité Ennour"

**Résultats attendus** :
- ✅ Bordure verte autour de l'adresse
- ✅ Badge "✅ Livrable (2.5 km)"
- ✅ Frais de livraison : 2.250 TND
- ✅ Bouton "Confirmer" activé
- ✅ Pas de message d'avertissement

---

### Scénario 2 : Adresse Livrable Moyenne (15-20 km)

**Données de test** :
- Restaurant : BAB EL HARA (32.9295, 10.451)
- Adresse client : Hôpital Ghomrassen (33.0686996, 10.3680779)
- Distance attendue : ~17 km

**Actions** :
1. Sélectionner "Hôpital Ghomrassen"

**Résultats attendus** :
- ✅ Bordure verte
- ✅ Badge "✅ Livrable (17 km)"
- ✅ Frais de livraison : 9.500 TND
- ✅ Bouton "Confirmer" activé
- ✅ Pas de message d'avertissement

---

### Scénario 3 : Adresse Non Livrable (> 30 km)

**Données de test** :
- Restaurant : BAB EL HARA (32.9295, 10.451)
- Adresse client : Beni Khedache (33.86090841686546, 9.975585937500002)
- Distance attendue : ~112 km

**Actions** :
1. Utiliser la carte pour sélectionner un point à > 30 km
2. Sauvegarder cette adresse
3. Sélectionner cette adresse

**Résultats attendus** :
- ✅ Bordure rouge
- ✅ Badge "❌ Hors zone (112 km > 30 km)"
- ✅ Message d'avertissement rouge affiché
- ✅ Bouton "Confirmer" désactivé
- ✅ Toast d'erreur affiché

---

### Scénario 4 : Adresse Non Géocodable

**Données de test** :
- Adresse : "RR207, Beni Khedache, Tunisie" (ne peut pas être géocodée)

**Actions** :
1. Créer une adresse avec ce texte
2. Sélectionner cette adresse

**Résultats attendus** :
- ✅ Message d'avertissement jaune
- ✅ Boutons "Utiliser la carte" et "Supprimer l'adresse"
- ✅ Bouton "Confirmer" désactivé
- ✅ Toast d'erreur avec message clair

---

### Scénario 5 : Changement Rapide Entre Adresses

**Actions** :
1. Sélectionner "Adresse Livrable"
2. Immédiatement sélectionner "Adresse Non Livrable"
3. Immédiatement revenir à "Adresse Livrable"

**Résultats attendus** :
- ✅ Changements instantanés (< 500ms)
- ✅ Pas de conflit ou d'état incohérent
- ✅ Interface toujours cohérente
- ✅ Pas de freeze ou de lag

---

### Scénario 6 : Migration Automatique

**Actions** :
1. Créer manuellement des adresses invalides dans localStorage
2. Recharger la page panier
3. Observer les logs

**Résultats attendus** :
- ✅ Migration s'exécute automatiquement
- ✅ Adresses invalides supprimées
- ✅ Adresses valides conservées
- ✅ Logs détaillés dans la console

---

### Scénario 7 : Validation Serveur

**Actions** :
1. Contourner la validation frontend (modifier localStorage)
2. Essayer de créer une commande avec distance > 30 km

**Résultats attendus** :
- ✅ Serveur rejette la commande
- ✅ Message d'erreur : "Cette zone est hors de notre zone de livraison"
- ✅ Aucune commande créée
- ✅ Logs serveur indiquent la distance

---

### Scénario 8 : Multi-Restaurants

**Actions** :
1. Ajouter des produits de plusieurs restaurants au panier
2. Sélectionner une adresse
3. Vérifier la validation pour tous les restaurants

**Résultats attendus** :
- ✅ Validation effectuée pour chaque restaurant
- ✅ Si un seul restaurant est non livrable → Avertissement affiché
- ✅ Bouton désactivé si au moins un restaurant est non livrable
- ✅ Message indique la distance maximale

---

### Scénario 9 : Géocodage en Cours

**Actions** :
1. Sélectionner une adresse
2. Observer l'interface pendant le géocodage

**Résultats attendus** :
- ✅ Indicateur de chargement affiché
- ✅ Bouton "Confirmer" désactivé pendant le chargement
- ✅ Message "Vérification..." affiché
- ✅ Interface se met à jour après le géocodage

---

### Scénario 10 : Saisie Manuelle d'Adresse

**Actions** :
1. Saisir manuellement une adresse dans le champ texte
2. Attendre le géocodage automatique
3. Vérifier la validation

**Résultats attendus** :
- ✅ Géocodage automatique après 1.5 secondes
- ✅ Validation effectuée automatiquement
- ✅ Message d'avertissement si zone non livrable
- ✅ Bouton activé/désactivé selon la zone

---

## 🔍 Points de Vérification

### Interface Utilisateur
- [ ] Bordures de couleur correctes (vert/rouge)
- [ ] Badges de statut affichés
- [ ] Messages d'avertissement clairs
- [ ] Boutons d'action fonctionnels
- [ ] Indicateurs de chargement visibles
- [ ] Toasts d'erreur/succès affichés

### Logique Métier
- [ ] Calcul de distance correct
- [ ] Validation de zone correcte
- [ ] Calcul des frais correct
- [ ] Migration automatique fonctionnelle
- [ ] Validation serveur active

### Performance
- [ ] Réactivité < 500ms
- [ ] Pas de freeze ou de lag
- [ ] Géocodage asynchrone non bloquant
- [ ] Mise à jour progressive de l'interface

### Sécurité
- [ ] Validation serveur bloque les commandes invalides
- [ ] Pas de contournement possible
- [ ] Messages d'erreur clairs
- [ ] Logs détaillés pour le débogage

---

## 🐛 Bugs Connus à Vérifier

1. **Message affiché trop tôt** : Vérifier que le message n'apparaît qu'après calculs complets
2. **Bouton non désactivé** : Vérifier que le bouton est bien désactivé pour zones non livrables
3. **Cache Service Worker** : Vérifier que la version v8 est bien chargée
4. **Coordonnées obsolètes** : Vérifier que les anciennes coordonnées sont supprimées

---

## 📊 Métriques de Succès

- ✅ **Taux de succès** : 100% des adresses valides acceptées
- ✅ **Taux de rejet** : 100% des adresses invalides rejetées
- ✅ **Temps de réponse** : < 500ms pour mise à jour de l'interface
- ✅ **Précision** : Distance calculée à ±0.1 km
- ✅ **Fiabilité** : Aucune commande invalide créée
