# Système de Navigation de la PWA - Tataouine Pizza

## 📋 Vue d'ensemble

Ce document explique comment le système de navigation est implémenté et utilisé dans toute l'application PWA.

## 🛠️ Bibliothèque de Routage

**Wouter** est la bibliothèque de routage utilisée dans cette application.

- **Documentation**: https://github.com/molefrog/wouter
- **Avantages**: 
  - Légère (alternative à React Router)
  - API simple et intuitive
  - Compatible avec les PWA
  - Utilise le History API du navigateur
  - Pas de rechargement de page (SPA)

## 📦 Imports Principaux

```typescript
import { Switch, Route, useLocation, Link, useParams } from "wouter";
```

## 🗺️ Architecture des Routes

### Routes Publiques (sans Layout)

Ces routes n'ont pas de barre de navigation :

- `/onboarding` - Page d'onboarding pour nouveaux utilisateurs
- `/admin` - Redirection automatique vers login ou dashboard
- `/admin/login` - Connexion administrateur
- `/admin/dashboard` - Tableau de bord administrateur
- `/driver/login` - Connexion livreur
- `/driver/auto-login` - Connexion automatique livreur (via lien externe)
- `/driver/dashboard` - Tableau de bord livreur
- `/restaurant/login` - Connexion restaurant
- `/restaurant/dashboard` - Tableau de bord restaurant

### Routes Protégées (avec Layout)

Ces routes ont la barre de navigation (header + bottom nav mobile) :

- `/` - Page d'accueil (Home)
- `/menu` - Redirection vers `/` (MenuRedirect)
- `/menu/:restaurantId` - Menu d'un restaurant spécifique
- `/cart` - Page du panier
- `/success` - Page de succès de commande
- `/history` - Historique des commandes
- `/profile` - Profil utilisateur

### Protection par Onboarding

Toutes les routes protégées vérifient si l'utilisateur a complété l'onboarding :
- Si **non complété** → redirection vers `/onboarding`
- Si **complété** → accès à la page demandée
- L'onboarding peut être désactivé via `ENABLE_ONBOARDING` (env variable)

## 🔧 Méthodes de Navigation

### 1. Navigation Déclarative (Liens)

Utilise le composant `<Link>` de wouter pour créer des liens de navigation.

**Exemple:**
```tsx
import { Link } from "wouter";

<Link href="/cart">Voir le panier</Link>
```

**Avantages:**
- Pas de rechargement de page
- Transition fluide
- Compatible avec le bouton retour du navigateur
- URL partageable

**Utilisé dans:**
- `Layout.tsx` - Navigation principale (header + bottom nav)
- `pizza-search-result.tsx` - Liens vers les menus
- `order-history.tsx` - Liens vers d'autres pages
- Footer - Liens vers les espaces admin/livreur/restaurant

### 2. Navigation Programmatique (Redirections)

Utilise le hook `useLocation()` pour naviguer programmatiquement.

**Exemple:**
```tsx
import { useLocation } from "wouter";

function MyComponent() {
  const [, setLocation] = useLocation();
  
  const handleSubmit = () => {
    // ... logique ...
    setLocation("/success"); // Navigation après action
  };
}
```

**Utilisé dans:**
- Formulaires de connexion → redirection après authentification
- Validation de commande → redirection vers `/success`
- Actions utilisateur → navigation conditionnelle
- Redirections automatiques (ex: `/admin` → `/admin/login`)

### 3. Lecture de la Route Actuelle

Utilise `useLocation()` pour lire la route actuelle.

**Exemple:**
```tsx
import { useLocation } from "wouter";

function MyComponent() {
  const [location] = useLocation();
  
  // Détecter la page active
  const isActive = location === "/cart";
  
  // Conditionner l'affichage
  if (location.startsWith("/success")) {
    return <SpecialComponent />;
  }
}
```

**Utilisé dans:**
- `Layout.tsx` - Détection de la page active pour styler les liens
- `ScrollToTop.tsx` - Détection des changements de route pour scroll
- `GlobalTrackerWidget` - Masquage sur certaines pages

### 4. Paramètres de Route

Utilise `useParams()` pour lire les paramètres de route.

**Exemple:**
```tsx
import { useParams } from "wouter";

// Route: /menu/:restaurantId
function Menu() {
  const { restaurantId } = useParams();
  // restaurantId contient la valeur du paramètre
}
```

**Utilisé dans:**
- `Menu.tsx` - Lecture de `restaurantId` depuis `/menu/:restaurantId`

### 5. Query Strings

Les query strings sont accessibles via `window.location.search`.

**Exemple:**
```tsx
// URL: /menu/123?product=456
const searchParams = new URLSearchParams(window.location.search);
const productId = searchParams.get("product"); // "456"
```

**Utilisé dans:**
- `Menu.tsx` - Highlight d'un produit spécifique via `?product=id`
- `OrderSuccess.tsx` - Vérification de paiement via query strings

## 📍 Exemples d'Utilisation dans le Codebase

### 1. Layout (Navigation Principale)

**Fichier:** `client/src/components/layout.tsx`

```tsx
import { Link, useLocation } from "wouter";

export default function Layout({ children }) {
  const [location] = useLocation(); // Lecture de la route actuelle
  
  const navItems = [
    { href: "/", icon: Home, label: "Accueil" },
    { href: "/profile", icon: User, label: "Profil" },
    { href: "/cart", icon: ShoppingBag, label: "Panier", badge: count },
  ];
  
  return (
    <>
      {/* Navigation desktop */}
      <nav>
        {navItems.map((item) => (
          <Link 
            href={item.href} // Navigation déclarative
            className={location === item.href ? "active" : ""} // Style conditionnel
          >
            {item.label}
          </Link>
        ))}
      </nav>
      
      {/* Navigation mobile */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <Link href={item.href}>
            <item.icon />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
```

### 2. Navigation après Action (Cart Page)

**Fichier:** `client/src/pages/cart-page.tsx`

```tsx
import { useLocation } from "wouter";

export default function CartPage() {
  const [, setLocation] = useLocation();
  
  const handleCheckout = async () => {
    // ... validation de commande ...
    setLocation("/success"); // Navigation programmatique après succès
  };
  
  return (
    <Button onClick={() => setLocation("/menu")}>
      Retour au menu
    </Button>
  );
}
```

### 3. Authentification avec Redirection

**Fichier:** `client/src/pages/admin-login.tsx`

```tsx
import { useLocation } from "wouter";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  
  const handleLogin = async () => {
    // ... authentification ...
    if (success) {
      setLocation("/admin/dashboard"); // Redirection après connexion
    }
  };
}
```

### 4. Navigation avec Paramètres

**Fichier:** `client/src/components/pizza-search-result.tsx`

```tsx
import { Link } from "wouter";

export function PizzaSearchResult({ pizza }) {
  return (
    <Link href={`/menu/${pizza.restaurantId}?product=${pizza.id}`}>
      {/* Route avec paramètre restaurantId et query string product */}
    </Link>
  );
}
```

**Fichier:** `client/src/pages/menu.tsx`

```tsx
import { useParams } from "wouter";

export default function Menu() {
  const { restaurantId } = useParams(); // Lecture du paramètre de route
  
  // Lecture du query string
  const searchParams = new URLSearchParams(window.location.search);
  const productId = searchParams.get("product");
  
  // Scroll vers le produit si spécifié
  useEffect(() => {
    if (productId) {
      // Scroll vers le produit
    }
  }, [productId]);
}
```

### 5. Redirection Intelligente

**Fichier:** `client/src/App.tsx`

```tsx
function AdminRedirect() {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("adminToken");
  
  useEffect(() => {
    if (token) {
      setLocation("/admin/dashboard"); // Redirection si authentifié
    } else {
      setLocation("/admin/login"); // Redirection si non authentifié
    }
  }, [token, setLocation]);
}
```

### 6. Scroll Automatique

**Fichier:** `client/src/components/scroll-to-top.tsx`

```tsx
import { useLocation } from "wouter";

export default function ScrollToTop() {
  const [location] = useLocation(); // Détection des changements de route
  
  useEffect(() => {
    window.scrollTo({ top: 0 }); // Scroll en haut à chaque changement
  }, [location]);
}
```

### 7. Widget de Navigation

**Fichier:** `client/src/components/global-tracker.tsx`

```tsx
import { useLocation } from "wouter";

export function GlobalTrackerWidget() {
  const [, setLocation] = useLocation();
  
  return (
    <div onClick={() => setLocation("/success")}>
      {/* Navigation vers la page de suivi */}
    </div>
  );
}
```

## 🔄 Flux de Navigation Typique

### Exemple: Commande de Pizza

1. **Page d'accueil** (`/`)
   - Utilisateur clique sur un restaurant
   - Navigation: `<Link href="/menu/123">`

2. **Page menu** (`/menu/:restaurantId`)
   - Utilisateur ajoute des produits au panier
   - Navigation: Clic sur icône panier → `<Link href="/cart">`

3. **Page panier** (`/cart`)
   - Utilisateur valide la commande
   - Navigation programmatique: `setLocation("/success")`

4. **Page succès** (`/success`)
   - Affichage du suivi de commande
   - Navigation: Bouton retour → `<Link href="/">`

## 🎯 Bonnes Pratiques

### ✅ À Faire

1. **Utiliser `<Link>` pour les liens de navigation**
   ```tsx
   <Link href="/cart">Panier</Link>
   ```

2. **Utiliser `setLocation()` pour les redirections après actions**
   ```tsx
   const [, setLocation] = useLocation();
   setLocation("/success");
   ```

3. **Utiliser `useLocation()` pour détecter la page active**
   ```tsx
   const [location] = useLocation();
   const isActive = location === "/cart";
   ```

4. **Utiliser `useParams()` pour les paramètres de route**
   ```tsx
   const { restaurantId } = useParams();
   ```

### ❌ À Éviter

1. **Ne pas utiliser `window.location.href` sauf cas spéciaux**
   - Utiliser uniquement pour forcer un rechargement complet
   - Exemple: Connexion automatique livreur (driver-auto-login.tsx)

2. **Ne pas mélanger `<a>` et `<Link>`**
   - Utiliser `<Link>` pour la navigation interne
   - Utiliser `<a>` uniquement pour les liens externes

3. **Ne pas oublier de gérer les états de chargement**
   - Désactiver les boutons pendant la navigation si nécessaire

## 🔍 Dépannage

### Problème: La navigation ne fonctionne pas

**Solutions:**
1. Vérifier que `wouter` est bien importé
2. Vérifier que le composant est dans le `<Router>` (App.tsx)
3. Vérifier que la route existe dans `App.tsx`

### Problème: Le scroll ne se remet pas en haut

**Solution:**
- Vérifier que `ScrollToTop` est rendu dans `App.tsx`

### Problème: Les paramètres de route ne sont pas lus

**Solution:**
- Vérifier que la route utilise `:paramName` dans `App.tsx`
- Utiliser `useParams()` dans le composant

## 📚 Ressources

- [Documentation Wouter](https://github.com/molefrog/wouter)
- [History API MDN](https://developer.mozilla.org/en-US/docs/Web/API/History_API)
- [PWA Navigation Best Practices](https://web.dev/navigation/)

## 📝 Notes Importantes

- **SPA (Single Page Application)**: Toute la navigation se fait sans rechargement de page
- **History API**: Wouter utilise le History API pour gérer l'historique du navigateur
- **PWA Compatible**: La navigation fonctionne même en mode hors ligne (si configuré)
- **URL Partageables**: Toutes les URLs sont partageables et fonctionnent au rechargement
- **Bouton Retour**: Compatible avec le bouton retour/précédent du navigateur
