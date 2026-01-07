# WORKFLOW COMPLET D'UN ACHAT - TATAOUINE PIZZA

## 📋 Vue d'ensemble
Ce document décrit le processus complet d'un achat sur le site Tataouine Pizza, de la première visite jusqu'à la livraison de la commande.

---

## 🚀 ÉTAPE 1 : PREMIÈRE VISITE - ONBOARDING

### 1.1 Accès initial
- L'utilisateur arrive sur le site pour la première fois
- Le système vérifie si des données d'onboarding existent dans `localStorage` (clé: `tp_onboarding`)
- Si aucune donnée n'existe, redirection automatique vers `/onboarding`

### 1.2 Étape 1 : Numéro de téléphone
- **Page** : `/onboarding`
- **Champ requis** : Numéro de téléphone (minimum 8 chiffres)
- **Action** : L'utilisateur saisit son numéro
- **Validation** : Format numérique uniquement (caractères non numériques supprimés automatiquement)
- **Authentification** : Appel à `customerLogin(name, phone)` - authentification simple sans OTP
- **Sauvegarde** : Nom et téléphone sauvegardés dans `localStorage` (`customerName`, `customerPhone`)

### 1.3 Étape 2 : Localisation
- **Options disponibles** :
  - **Option A** : Géolocalisation automatique (GPS)
    - Demande de permission de géolocalisation
    - Récupération des coordonnées GPS (lat, lng)
    - Géocodage inverse pour obtenir l'adresse complète
  - **Option B** : Saisie manuelle de l'adresse
    - Champ texte pour l'adresse
    - Géocodage de l'adresse saisie pour obtenir les coordonnées GPS
- **Validation zone de livraison** :
  - Calcul de la distance entre le restaurant et l'adresse client
  - Vérification que la distance ≤ 30 km (MAX_DELIVERY_DISTANCE_KM)
  - Si distance > 30 km : Message d'erreur, zone non livrable
- **Sauvegarde** : Toutes les données sauvegardées dans `localStorage` sous la clé `tp_onboarding` :
  ```json
  {
    "name": "Nom du client",
    "phone": "12345678",
    "address": "Rue principale",
    "addressDetails": "Appartement 5",
    "lat": 32.9295,
    "lng": 10.451
  }
  ```
- **Redirection** : Après sauvegarde, redirection automatique vers `/` (page d'accueil)

---

## 🏠 ÉTAPE 2 : NAVIGATION ET SÉLECTION

### 2.1 Page d'accueil
- **URL** : `/`
- **Fonctionnalités** :
  - **Barre de recherche** : Recherche en temps réel de produits (pizzas, plats)
  - **Affichage des restaurants** :
    - Section "Restaurants ouverts" (triés par statut)
    - Section "Restaurants fermés" (si applicable)
  - **Filtrage** : Recherche de restaurants par nom ou catégorie

### 2.2 Sélection d'un restaurant
- **Action** : Clic sur un restaurant dans la liste
- **Redirection** : `/menu/:restaurantId`
- **Affichage** :
  - Informations du restaurant (nom, horaires, statut)
  - Menu complet avec catégories (Pizzas classiques, Spéciales, Végétariennes, etc.)
  - Filtres par catégorie
  - Images des produits

### 2.3 Consultation du menu
- **Affichage** : Liste des produits avec :
  - Image du produit
  - Nom
  - Description
  - Prix (selon la taille si plusieurs tailles disponibles)
  - Bouton "Ajouter au panier"

---

## 🛒 ÉTAPE 3 : AJOUT AU PANIER

### 3.1 Sélection d'un produit
- **Action** : Clic sur "Ajouter au panier"
- **Cas 1 : Produit avec plusieurs tailles**
  - Ouverture d'un dialogue de sélection de taille (Small, Medium, Large)
  - L'utilisateur choisit une taille
  - Confirmation de l'ajout
- **Cas 2 : Produit avec une seule taille**
  - Ajout direct au panier

### 3.2 Gestion multi-restaurants
- **Scénario A : Premier produit**
  - Création automatique d'un panier pour ce restaurant
  - Produit ajouté avec quantité = 1
- **Scénario B : Produit du même restaurant**
  - Ajout direct au panier existant
  - Si produit identique (même ID + même taille) : Incrémentation de la quantité
  - Si produit différent : Ajout d'un nouvel item
- **Scénario C : Produit d'un autre restaurant**
  - Affichage d'un dialogue de confirmation
  - Message : "Vous avez déjà des articles d'un autre restaurant. Voulez-vous vider le panier et ajouter ce produit ?"
  - Options :
    - **Confirmer** : Vide le panier actuel et ajoute le nouveau produit
    - **Annuler** : Garde le panier actuel

### 3.3 Feedback utilisateur
- **Toast de confirmation** : Message "Ajouté au panier" ou "Quantité mise à jour"
- **Son** : Son de notification (si activé)
- **Badge panier** : Mise à jour du compteur d'articles dans le header

---

## 📦 ÉTAPE 4 : GESTION DU PANIER

### 4.1 Accès au panier
- **Méthode 1** : Clic sur l'icône panier dans le header
- **Méthode 2** : Navigation directe vers `/cart`
- **Vérification** : Si panier vide, affichage d'un message "Panier vide" avec bouton "Découvrir le menu"

### 4.2 Étape 1/4 : Visualisation du panier
- **Affichage** :
  - Liste des restaurants (si commande multi-restaurants)
  - Pour chaque restaurant :
    - Nom du restaurant
    - Liste des produits avec :
      - Image
      - Nom
      - Taille
      - Prix unitaire
      - Quantité (boutons +/-)
      - Prix total (prix × quantité)
      - Bouton supprimer
    - Sous-total du restaurant
- **Actions disponibles** :
  - Modifier la quantité (+/-)
  - Supprimer un produit
  - Supprimer tout un restaurant
  - Vider complètement le panier
- **Bouton "Continuer"** : Passe à l'étape suivante

### 4.3 Validation préalable
- **Vérification commande active** :
  - Le système vérifie si l'utilisateur a déjà une commande en cours (non livrée)
  - Si oui : Affichage d'un dialogue d'avertissement
  - Options :
    - **Annuler** : Retour au panier
    - **Confirmer** : Poursuivre malgré la commande active

---

## 📱 ÉTAPE 5 : SAISIE DES INFORMATIONS CLIENT

### 5.1 Étape 2/4 : Numéro de téléphone (si non présent dans onboarding)
- **Condition** : Affichée uniquement si le téléphone n'est pas déjà dans l'onboarding
- **Champs** :
  - **Nom** : Minimum 2 caractères (pré-rempli depuis onboarding si disponible)
  - **Téléphone** : Minimum 8 chiffres (pré-rempli depuis onboarding si disponible)
- **Validation** :
  - Nom : Minimum 2 caractères
  - Téléphone : Minimum 8 chiffres, format numérique uniquement
- **Action** : Appel à `customerLogin(name, phone)` pour authentification
- **Sauvegarde** : Données sauvegardées dans `localStorage`
- **Bouton "Continuer"** : Passe à l'étape adresse

### 5.2 Étape 3/4 : Adresse de livraison
- **Fonctionnalités** :
  - **Adresses sauvegardées** :
    - Affichage des adresses précédemment utilisées (si disponibles)
    - Sélection d'une adresse sauvegardée (clic sur la carte)
    - Géocodage automatique de l'adresse sélectionnée
    - Mise à jour des coordonnées GPS
  - **Ajout d'une nouvelle adresse** :
    - Formulaire avec :
      - Label (ex: "Domicile", "Travail")
      - Rue
      - Détails (ex: "Appartement 5", "Étage 2")
    - Sauvegarde dans l'historique
  - **Champ adresse principal** :
    - Saisie manuelle de l'adresse
    - Géocodage automatique en temps réel (debounce 500ms)
    - Mise à jour des coordonnées GPS
  - **Carte interactive** :
    - Affichage d'une carte Leaflet
    - **Marqueur restaurant** : Pin rouge indiquant l'emplacement du restaurant
    - **Marqueur client** : Pin bleu indiquant l'adresse de livraison
    - **Recherche d'adresse** : Champ texte pour rechercher une adresse sur la carte
    - **Déplacement du marqueur** : L'utilisateur peut déplacer le pin pour ajuster l'adresse
    - **Géocodage inverse** : Mise à jour automatique de l'adresse lors du déplacement
- **Calcul des frais de livraison** :
  - Calcul en temps réel basé sur la distance
  - Formule : 
    - 0-2 km : 2.000 TND (forfait de base)
    - > 2 km : 2.000 TND + 0.500 TND par km supplémentaire
  - Affichage de la distance et du temps estimé
- **Validation zone de livraison** :
  - **Distance maximale** : 30 km
  - **Vérification en temps réel** :
    - Calcul de la distance entre restaurant et adresse client
    - Si distance > 30 km :
      - **Toast d'erreur automatique** : "Cette zone est hors de notre zone de livraison"
      - **Message d'avertissement visuel** : Bandeau rouge avec distance et limite
      - **Désactivation du bouton de confirmation**
      - **Blocage de la création de commande**
  - **Messages d'avertissement** :
    - Affichés à toutes les étapes (cart, address, summary)
    - Message clair avec distance exacte et limite de 30 km
- **Bouton "Continuer"** : Passe à l'étape récapitulatif

---

## 📋 ÉTAPE 6 : RÉCAPITULATIF ET VALIDATION

### 6.1 Étape 4/4 : Récapitulatif de la commande
- **Affichage** :
  - **Informations client** :
    - Nom
    - Téléphone
    - Adresse complète (rue + détails)
  - **Détails par restaurant** :
    - Nom du restaurant
    - Liste des produits avec quantités et prix
    - Sous-total du restaurant
    - Frais de livraison (calculés dynamiquement)
    - Total restaurant (sous-total + frais de livraison)
    - Distance et temps estimé de livraison
  - **Résumé global** :
    - Sous-total global (somme des sous-totaux restaurants)
    - Frais de livraison globaux (somme des frais par restaurant)
    - **Total général** (sous-total + frais de livraison)
- **Avertissements** :
  - Si zone non livrable : Message d'erreur rouge avec distance et limite
  - Si coordonnées GPS manquantes : Message d'avertissement
- **Méthode de paiement** :
  - **Paiement en espèces** (actuellement le seul activé)
  - Stripe et Flouci sont désactivés (feature flags)
- **Boutons** :
  - **Modifier** : Retour à l'étape précédente
  - **Confirmer la commande** : Création de la commande

### 6.2 Validation finale
- **Vérifications côté client** :
  - Nom valide (≥ 2 caractères)
  - Téléphone valide (≥ 8 chiffres)
  - Adresse valide (≥ 5 caractères)
  - Coordonnées GPS disponibles
  - Zone livrable (distance ≤ 30 km)
  - Panier non vide
- **Si validation échoue** : Message d'erreur, retour à l'étape concernée

---

## 💳 ÉTAPE 7 : CRÉATION DE LA COMMANDE

### 7.1 Traitement de la commande
- **Action** : Clic sur "Confirmer la commande"
- **Désactivation du bouton** : Pendant le traitement (évite les doubles clics)
- **Vérification serveur** :
  - Validation de la zone de livraison (distance ≤ 30 km)
  - Si distance > 30 km : Erreur serveur, commande rejetée
- **Création des commandes** :
  - **Multi-restaurants** : Une commande par restaurant
  - Pour chaque restaurant :
    - Appel à `createOrder()` avec :
      - `restaurantId`
      - `customerName`
      - `phone`
      - `address` (rue)
      - `addressDetails` (détails optionnels)
      - `customerLat` / `customerLng` (coordonnées GPS)
      - `items` (liste des produits avec taille et quantité)
    - Calcul automatique des frais de livraison côté serveur
    - Validation de la zone de livraison côté serveur
- **Réponse serveur** :
  - IDs des commandes créées
  - Statut de chaque commande
  - Informations de suivi

### 7.2 Gestion des erreurs
- **Erreur zone non livrable** :
  - Message : "Cette zone est hors de notre zone de livraison. La distance de X km dépasse la limite de 30 km."
  - Commande rejetée
- **Erreur réseau** :
  - Message d'erreur générique
  - Possibilité de réessayer
- **Erreur validation** :
  - Message spécifique selon le type d'erreur
  - Retour à l'étape concernée

### 7.3 Succès de la commande
- **Actions automatiques** :
  - Vidage du panier
  - Sauvegarde de l'adresse dans l'historique
  - Démarrage du suivi de commande
  - Redirection vers `/success` (page de confirmation)

---

## ✅ ÉTAPE 8 : CONFIRMATION ET SUIVI

### 8.1 Page de confirmation
- **URL** : `/success`
- **Affichage** :
  - Message de succès : "Commande confirmée !"
  - Numéro(s) de commande
  - Détails de la commande (produits, quantités, prix)
  - Adresse de livraison
  - Temps estimé de livraison
  - Méthode de paiement (espèces à la livraison)
- **Fonctionnalités** :
  - **Suivi en temps réel** :
    - Polling automatique pour vérifier le statut
    - Mise à jour automatique de l'interface
  - **Statuts possibles** :
    - `pending` : En attente
    - `preparing` : En préparation
    - `ready` : Prête
    - `out_for_delivery` : En livraison
    - `delivered` : Livrée
    - `rejected` : Rejetée
  - **Annulation** :
    - Bouton "Annuler la commande" (si statut = pending)
    - Confirmation avant annulation
    - Mise à jour du statut à `rejected`

### 8.2 Notification de livraison
- **Quand la commande est livrée** :
  - Message de succès : "Votre commande a été livrée !"
  - Option de retour à l'accueil
  - Option de nouvelle commande

---

## 🔄 FONCTIONNALITÉS TRANSVERSALES

### Géocodage
- **Service utilisé** : OpenStreetMap Nominatim API
- **Limitation géographique** : Zone de Tataouine uniquement
- **Fonctions** :
  - **Géocodage direct** : Adresse → Coordonnées GPS
  - **Géocodage inverse** : Coordonnées GPS → Adresse
- **Debounce** : 500ms pour éviter trop de requêtes

### Calcul des frais de livraison
- **Formule** :
  - Distance ≤ 2 km : 2.000 TND
  - Distance > 2 km : 2.000 + (distance - 2) × 0.500 TND
- **Distance maximale** : 30 km
- **Calcul** : Formule de Haversine (distance à vol d'oiseau)
- **Mise à jour** : En temps réel lors du changement d'adresse

### Validation zone de livraison
- **Distance maximale** : 30 km (MAX_DELIVERY_DISTANCE_KM)
- **Validation côté client** :
  - Hook `useDynamicDeliveryFee` calcule en temps réel
  - Messages d'avertissement visuels
  - Désactivation du bouton de confirmation
- **Validation côté serveur** :
  - Vérification lors de la création de commande
  - Rejet automatique si distance > 30 km
  - Message d'erreur clair

### Gestion des adresses
- **Historique** : Sauvegarde automatique dans `localStorage`
- **Clé** : `savedAddresses_{phone}`
- **Format** :
  ```json
  [
    {
      "id": "uuid",
      "label": "Domicile",
      "street": "Rue principale",
      "details": "Appartement 5",
      "isDefault": true
    }
  ]
  ```
- **Déduplication** : Évite les doublons (comparaison normalisée)

### Multi-langue
- **Langues supportées** : Français, Anglais, Arabe
- **Détection automatique** : Basée sur les préférences du navigateur
- **Sauvegarde** : Préférence sauvegardée dans `localStorage`
- **RTL** : Support pour l'arabe (affichage de droite à gauche)

---

## 📊 RÉSUMÉ DU FLUX COMPLET

```
1. PREMIÈRE VISITE
   └─> Onboarding (Téléphone + Localisation)
       └─> Sauvegarde dans localStorage
           └─> Redirection vers /

2. NAVIGATION
   └─> Page d'accueil (/)
       └─> Sélection restaurant
           └─> Menu du restaurant (/menu/:id)

3. AJOUT AU PANIER
   └─> Sélection produit + taille
       └─> Ajout au panier
           └─> Gestion multi-restaurants (si nécessaire)

4. PANIER
   └─> Étape 1/4 : Visualisation
       └─> Étape 2/4 : Téléphone (si nécessaire)
           └─> Étape 3/4 : Adresse
               └─> Géocodage + Validation zone
                   └─> Étape 4/4 : Récapitulatif
                       └─> Validation finale

5. CRÉATION COMMANDE
   └─> Validation serveur (zone de livraison)
       └─> Création commande(s)
           └─> Vidage panier
               └─> Redirection /success

6. SUIVI
   └─> Page de confirmation
       └─> Suivi en temps réel
           └─> Notification livraison
```

---

## 🔒 VALIDATIONS ET SÉCURITÉ

### Validations côté client
- Nom : Minimum 2 caractères
- Téléphone : Minimum 8 chiffres, format numérique
- Adresse : Minimum 5 caractères
- Coordonnées GPS : Requises pour calculer les frais
- Zone livrable : Distance ≤ 30 km
- Panier : Non vide

### Validations côté serveur
- Zone de livraison : Distance ≤ 30 km (rejet si > 30 km)
- Données requises : Tous les champs obligatoires
- Format des données : Validation des types et formats
- Authentification : Vérification du client (si nécessaire)

### Sécurité
- Pas de stockage de données sensibles côté client
- Validation serveur pour toutes les opérations critiques
- Protection contre les doubles soumissions
- Validation de la zone de livraison côté serveur (sécurité renforcée)

---

## 📝 NOTES IMPORTANTES

1. **Paiement** : Actuellement, seul le paiement en espèces à la livraison est activé
2. **Zone de livraison** : Limite stricte de 30 km, non configurable par l'utilisateur
3. **Géocodage** : Limité à la zone de Tataouine pour des raisons de précision
4. **Multi-restaurants** : Support complet, avec création d'une commande par restaurant
5. **Onboarding** : Les données sont persistantes et réutilisées pour les commandes suivantes
6. **Adresses** : Historique automatique pour faciliter les commandes récurrentes

---

**Document généré le** : $(date)
**Version** : 1.0
**Dernière mise à jour** : Après implémentation validation zone de livraison + messages d'avertissement
