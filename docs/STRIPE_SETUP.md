# Configuration Stripe - Étape 2

## 📦 Dépendances à installer

Pour utiliser Stripe dans le frontend, vous devez installer les packages suivants :

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Packages nécessaires :
- **@stripe/stripe-js** : SDK JavaScript pour Stripe (client-side)
- **@stripe/react-stripe-js** : Composants React pour Stripe (CardElement, etc.)

## 🔑 Configuration des variables d'environnement

### Créer le fichier `.env`

Créez un fichier `.env` à la racine du projet (à côté de `package.json`) et ajoutez vos clés Stripe :

```env
# Clé publique Stripe (utilisée côté client)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_votre_cle_publique_ici

# Clé secrète Stripe (utilisée côté serveur uniquement - JAMAIS exposer côté client)
STRIPE_SECRET_KEY=sk_test_votre_cle_secrete_ici
```

**Important :**
- Utilisez la clé **publique** (commence par `pk_test_` pour le mode test ou `pk_live_` pour la production)
- Ne jamais exposer la clé secrète (`sk_test_` ou `sk_live_`) côté client
- La clé secrète sera utilisée uniquement côté serveur (étape 3)
- Le fichier `.env` est déjà dans `.gitignore` pour éviter de commiter vos clés

## 📝 Notes

### Étape 2 (Frontend)
- Le formulaire est uniquement visuel (pas de logique d'envoi)
- La logique d'enregistrement sera implémentée à l'étape 4
- Le composant `StripeCardForm` utilise `CardElement` pour la saisie sécurisée des informations de carte

### Étape 3 (Backend)
- Route API créée : `POST /api/stripe/create-setup-intent`
- La route identifie l'utilisateur via `customerPhone` dans le body de la requête
- Un `SetupIntent` est créé pour chaque tentative d'enregistrement de carte
- Le `client_secret` est retourné pour être utilisé côté frontend (étape 4)

## 🔒 Où ajouter STRIPE_SECRET_KEY ?

1. **Créer ou modifier le fichier `.env`** à la racine du projet
2. **Ajouter la ligne** :
   ```env
   STRIPE_SECRET_KEY=sk_test_votre_cle_secrete_ici
   ```
3. **Vérifier que `.env` est dans `.gitignore`** pour éviter de commiter la clé
4. **Redémarrer le serveur** après avoir ajouté la variable

**Note :** Le code vérifie automatiquement la présence de `STRIPE_SECRET_KEY` au démarrage. Si elle est absente, une erreur claire sera affichée.

## 🧪 Test avec des cartes de test

Stripe fournit des numéros de carte de test pour le développement :
- **Carte valide** : `4242 4242 4242 4242`
- **Date d'expiration** : N'importe quelle date future (ex: `12/34`)
- **CVC** : N'importe quel code à 3 chiffres (ex: `123`)
- **Code postal** : N'importe quel code postal valide (ex: `12345`)
