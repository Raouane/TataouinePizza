# Middlewares de Validation et Gestion d'Erreurs

Ce dossier contient les middlewares réutilisables pour la validation Zod et la gestion globale des erreurs.

## 📋 Table des matières

- [Validation Zod](#validation-zod)
- [Gestion d'Erreurs](#gestion-derreurs)
- [Exemples d'utilisation](#exemples-dutilisation)

---

## ✅ Validation Zod

### `validate(schema, target?)`

Middleware de validation Zod qui valide automatiquement les données de la requête.

**Paramètres :**
- `schema` : Schéma Zod à utiliser
- `target` : Source des données (`"body"` | `"query"` | `"params"`), par défaut `"body"`

**Exemple :**

```typescript
import { validate } from "../../middlewares/validate";
import { insertOrderSchema } from "@shared/schema";

app.post(
  "/api/orders",
  validate(insertOrderSchema), // Valide req.body
  async (req, res) => {
    // req.body est maintenant typé et validé
    const order = await OrderCreationService.createOrder(req.body);
    res.json(order);
  }
);
```

**Validation de params :**

```typescript
import { z } from "zod";

app.get(
  "/api/orders/:id",
  validate(z.object({ id: z.string().uuid() }), "params"), // Valide req.params
  async (req, res) => {
    const orderId = req.params.id; // Garanti d'être un UUID valide
    // ...
  }
);
```

**Validation de query :**

```typescript
app.get(
  "/api/orders",
  validate(z.object({ page: z.coerce.number().min(1).optional() }), "query"),
  async (req, res) => {
    const page = req.query.page; // Typé et validé
    // ...
  }
);
```

### `validateMultiple(validations)`

Valide plusieurs sources en même temps (body, query, params).

**Exemple :**

```typescript
import { validateMultiple } from "../../middlewares/validate";
import { z } from "zod";

app.post(
  "/api/orders/:id/items",
  validateMultiple({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ pizzaId: z.string(), quantity: z.number().min(1) }),
  }),
  async (req, res) => {
    // req.params.id et req.body sont tous deux validés
    // ...
  }
);
```

---

## 🛡️ Gestion d'Erreurs

### `errorMiddleware`

Middleware global de gestion des erreurs. **Doit être enregistré APRÈS toutes les routes.**

**Configuration dans `server/index.ts` :**

```typescript
import { errorMiddleware } from "./middlewares/error-handler";

// Après toutes les routes
app.use(errorMiddleware);
```

**Fonctionnalités :**
- Intercepte toutes les erreurs non gérées
- Formate les erreurs de manière cohérente
- Gère automatiquement les erreurs Zod
- Utilise `errorHandler` pour la cohérence

### `asyncHandler(fn)`

Wrapper pour les routes async qui gère automatiquement les erreurs.

**Avant (manuel) :**

```typescript
app.post("/api/orders", async (req, res) => {
  try {
    const order = await OrderCreationService.createOrder(req.body);
    res.json(order);
  } catch (error) {
    errorHandler.sendError(res, error);
  }
});
```

**Après (avec asyncHandler) :**

```typescript
import { asyncHandler } from "../../middlewares/error-handler";

app.post(
  "/api/orders",
  validate(insertOrderSchema),
  asyncHandler(async (req, res) => {
    // Plus besoin de try/catch !
    const order = await OrderCreationService.createOrder(req.body);
    res.json(order);
  })
);
```

**Avantages :**
- ✅ Supprime les `try/catch` répétitifs
- ✅ Les erreurs sont automatiquement passées au middleware d'erreur global
- ✅ Code plus propre et lisible

---

## 📚 Exemples d'utilisation

### Exemple complet : Route de création de commande

```typescript
import { validate } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/error-handler";
import { insertOrderSchema } from "@shared/schema";
import { OrderCreationService } from "../../services/order-creation-service";

app.post(
  "/api/orders",
  validate(insertOrderSchema), // ✅ Validation automatique
  asyncHandler(async (req, res) => { // ✅ Gestion d'erreur automatique
    // req.body est typé et validé
    const result = await OrderCreationService.createOrder(req.body);
    
    res.status(result.duplicate ? 200 : 201).json({
      orderId: result.orderId,
      totalPrice: result.totalPrice,
      ...(result.duplicate && { duplicate: true }),
    });
  })
);
```

### Exemple : Route avec validation de params

```typescript
import { z } from "zod";
import { validate } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/error-handler";

app.get(
  "/api/orders/:id",
  validate(z.object({ id: z.string().uuid() }), "params"),
  asyncHandler(async (req, res) => {
    const orderId = req.params.id; // Garanti d'être un UUID valide
    const order = await storage.getOrderById(orderId);
    
    if (!order) {
      throw errorHandler.notFound("Order not found");
    }
    
    res.json(order);
  })
);
```

### Exemple : Route avec validation multiple

```typescript
import { validateMultiple } from "../../middlewares/validate";
import { z } from "zod";

app.post(
  "/api/restaurants/:id/menu/:pizzaId",
  validateMultiple({
    params: z.object({
      id: z.string().uuid(),
      pizzaId: z.string().uuid(),
    }),
    body: z.object({
      size: z.enum(["small", "medium", "large"]),
      quantity: z.number().min(1),
    }),
  }),
  asyncHandler(async (req, res) => {
    // Tous les paramètres sont validés
    // ...
  })
);
```

---

## 🎯 Bonnes pratiques

1. **Toujours utiliser `validate()` pour les routes POST/PUT/PATCH**
   - Garantit la sécurité des données
   - Type automatiquement `req.body`

2. **Utiliser `asyncHandler()` pour toutes les routes async**
   - Évite les `try/catch` répétitifs
   - Gestion d'erreur centralisée

3. **Lancer des erreurs avec `errorHandler`**
   ```typescript
   // ✅ Bon
   throw errorHandler.notFound("Order not found");
   
   // ❌ Mauvais
   return res.status(404).json({ error: "Order not found" });
   ```

4. **Le middleware d'erreur global doit être en dernier**
   ```typescript
   // ✅ Bon ordre
   app.use(registerRoutes);
   app.use(errorMiddleware); // En dernier
   ```

---

## 🔍 Dépannage

### Erreur : "Validation failed"

Vérifiez que le schéma Zod correspond aux données envoyées. En développement, les détails des erreurs sont inclus dans la réponse.

### Erreur : "Headers already sent"

Cela signifie qu'une réponse a déjà été envoyée avant que le middleware d'erreur ne soit appelé. Vérifiez qu'il n'y a pas de `res.json()` ou `res.status()` avant de lancer une erreur.

### Les erreurs Zod ne sont pas formatées correctement

Assurez-vous que le middleware d'erreur global est bien enregistré après toutes les routes dans `server/index.ts`.
