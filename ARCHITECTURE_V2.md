# 🏗️ Architecture V2 - Tataouine Pizza

## 🎯 Principes directeurs

1. **Feature-Driven** (par domaine métier)
2. **Séparation stricte des responsabilités**
3. **Contrats partagés** (types / schema)
4. **Backend orienté services**
5. **Frontend orienté use-cases**
6. **Scripts & infra rangés**

---

## 📁 Structure globale V2

```
TataouinePizza/
│
├── client/          # Frontend React (PWA)
├── server/          # Backend API + WebSocket
├── shared/          # Contrats & schémas partagés
│
├── scripts/         # Scripts techniques organisés
├── migrations/      # Migrations DB (1 seule stratégie)
├── docs/            # Documentation
│
├── package.json
├── render.yaml
├── tsconfig.json
└── .env
```

---

## 🖥️ FRONTEND — Architecture V2

### Structure `client/src`

```
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   ├── providers/
│   │   ├── auth-provider.tsx
│   │   ├── i18n-provider.tsx
│   │   └── websocket-provider.tsx
│   └── guards/
│       ├── admin-guard.tsx
│       ├── driver-guard.tsx
│       └── auth-guard.tsx
│
├── features/
│   ├── auth/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── auth.api.ts
│   │
│   ├── order/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── order.api.ts
│   │   └── order.types.ts
│   │
│   ├── cart/
│   ├── admin/
│   ├── driver/
│   ├── restaurant/
│   └── notification/
│
├── shared/
│   ├── ui/          # shadcn/ui uniquement
│   ├── hooks/       # hooks génériques
│   ├── utils/
│   └── constants/
│
├── assets/
│   ├── images/
│   └── audio/
│
└── main.tsx
```

### Règles frontend V2

| Élément    | Règle                    |
| ---------- | ------------------------ |
| Pages      | Orchestration uniquement |
| Components | Présentation             |
| Hooks      | Logique métier           |
| API        | 1 fichier par feature    |
| UI         | 100% stateless           |

---

## 🖧 BACKEND — Architecture V2

### Structure `server/src`

```
src/
├── app.ts               # express app
├── index.ts             # bootstrap server
├── config/
│   ├── env.ts
│   ├── db.ts
│   └── websocket.ts
│
├── modules/              # DOMAIN-DRIVEN
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.service.ts
│   │   ├── auth.storage.ts
│   │   └── auth.types.ts
│   │
│   ├── order/
│   │   ├── order.routes.ts
│   │   ├── order.service.ts
│   │   ├── order.storage.ts
│   │   ├── order.websocket.ts
│   │   └── order.types.ts
│   │
│   ├── driver/
│   ├── restaurant/
│   ├── admin/
│   └── notification/
│
├── middleware/
│   ├── auth.middleware.ts
│   ├── role.middleware.ts
│   └── rate-limit.middleware.ts
│
├── shared/
│   ├── errors/
│   ├── logger.ts
│   └── response.ts
│
└── utils/
```

### Règles backend V2

| Couche     | Contenu           |
| ---------- | ----------------- |
| routes     | HTTP + validation |
| service    | règles métier     |
| storage    | SQL / ORM         |
| websocket  | events uniquement |
| middleware | transversal       |

🚫 Pas de SQL dans les services
🚫 Pas de logique métier dans les routes

---

## 🧩 SHARED — Contrats V2

```
shared/
├── schema/          # Drizzle
├── types/
│   ├── order.ts
│   ├── user.ts
│   └── restaurant.ts
├── events/          # WebSocket / Events
└── constants/
```

---

## ⚙️ SCRIPTS — Version propre

```
scripts/
├── db/
│   ├── migrate.ts
│   ├── seed.ts
│   └── reset.ts
├── deploy/
│   ├── render.ts
│   └── sync-prod.ts
├── maintenance/
└── test/
```

---

## 🚀 Migration vers V2

### Étape 1 : Créer la structure de base
- ✅ Créer `server/src/modules/order/`
- ✅ Migrer le domaine Order

### Étape 2 : Frontend
- Créer `client/src/features/order/`
- Refactor page Order

### Étape 3 : Répliquer
- Appliquer le pattern aux autres domaines

👉 **Zéro arrêt de prod**, refactor progressif.

---

## 📝 Notes

- L'ancienne structure reste fonctionnelle pendant la migration
- Les nouveaux modules coexistent avec l'ancien code
- Migration progressive, domaine par domaine
