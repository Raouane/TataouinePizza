# Feature Restaurant

Feature modulaire pour la gestion des restaurants dans l'application.

## Structure

```
restaurant/
├── restaurant.types.ts          # Types TypeScript partagés
├── restaurant.api.ts            # Fonctions API (fetch)
├── hooks/
│   └── use-restaurants.ts       # Hook React pour gérer les restaurants
├── components/
│   ├── restaurant-card.tsx     # Composant carte restaurant
│   └── restaurants-section.tsx  # Composant section de restaurants
└── README.md                    # Documentation
```

## Usage

### Hook `useRestaurants`

```tsx
import { useRestaurants } from "@/features/restaurant/hooks/use-restaurants";

function MyComponent() {
  const { 
    restaurants,           // Liste complète
    openRestaurants,       // Restaurants ouverts uniquement
    closedRestaurants,    // Restaurants fermés uniquement
    loading,              // État de chargement
    error,                // Erreur éventuelle
    searchRestaurants     // Fonction de recherche
  } = useRestaurants();
  
  // ...
}
```

### Composants

```tsx
import { RestaurantCard } from "@/features/restaurant/components/restaurant-card";
import { RestaurantsSection } from "@/features/restaurant/components/restaurants-section";

function MyComponent() {
  return (
    <RestaurantsSection
      restaurants={openRestaurants}
      title="Restaurants ouverts"
      getCategoryLabel={(cat) => cat}
    />
  );
}
```

## Migration depuis `components/`

Les anciens composants dans `client/src/components/` ont été déplacés ici :
- `components/restaurant-card.tsx` → `features/restaurant/components/restaurant-card.tsx`
- `components/restaurants-section.tsx` → `features/restaurant/components/restaurants-section.tsx`

Les types `Restaurant` sont maintenant dans `restaurant.types.ts`.
