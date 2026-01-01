# 📑 Index Architecture V2 - Tous les fichiers

## 📁 Backend V2

### Modules
```
server/src/modules/order/
├── order.types.ts          # Types partagés
├── order.storage.ts        # Couche données (SQL/ORM)
├── order.service.ts        # Logique métier
├── order.websocket.ts      # Events WebSocket
├── order.routes.ts         # Routes HTTP
├── order.example.ts        # Exemples d'utilisation
├── README.md               # Documentation module
└── INTEGRATION.md          # Guide d'intégration
```

### Configuration
```
server/src/config/
└── feature-flags.ts        # Feature flags V2
```

---

## 🎨 Frontend V2

### App (Providers & Guards)
```
client/src/app/
├── providers/
│   ├── auth-provider.tsx   # Provider authentification
│   └── i18n-provider.tsx   # Provider i18n
└── guards/
    ├── auth-guard.tsx      # Guard authentification
    ├── admin-guard.tsx     # Guard admin
    └── driver-guard.tsx    # Guard driver
```

### Features
```
client/src/features/order/
├── order.types.ts          # Types partagés
├── order.api.ts            # Client API
├── hooks/
│   └── use-order.ts        # Hooks React Query
├── examples/
│   ├── example-usage.tsx   # Exemples basiques
│   └── integration-example.tsx  # Exemples d'intégration
├── pages/                  # Pages (à migrer)
├── components/             # Composants (à migrer)
└── README.md               # Documentation feature
```

---

## 📚 Documentation

### Guides principaux
- `README_V2.md` - Point d'entrée principal
- `QUICK_START_V2.md` - Démarrage rapide (5 min)
- `USAGE_V2.md` - Guide d'utilisation complet
- `ARCHITECTURE_V2.md` - Architecture détaillée

### Guides de migration
- `MIGRATION_V2_GUIDE.md` - Guide de migration backend
- `FRONTEND_V2_GUIDE.md` - Guide frontend
- `MIGRATION_COMPLETE.md` - État d'avancement
- `NEXT_STEPS_V2.md` - Prochaines étapes

### Guides de test
- `TEST_V2.md` - Guide de test complet
- `INTEGRATION_EXAMPLES.md` - Exemples d'intégration

### Résumés
- `ARCHITECTURE_V2_SUMMARY.md` - Résumé complet
- `ARCHITECTURE_V2_FINAL.md` - Résumé final
- `INDEX_V2.md` - Ce fichier

---

## ⚙️ Scripts V2

### Structure organisée
```
scripts/
├── db/
│   └── README.md          # Scripts base de données
├── deploy/
│   └── README.md          # Scripts déploiement
└── maintenance/
    └── README.md          # Scripts maintenance
```

---

## 🗺️ Navigation rapide

### Pour démarrer
1. `README_V2.md` - Vue d'ensemble
2. `QUICK_START_V2.md` - Activation rapide
3. `USAGE_V2.md` - Utilisation

### Pour comprendre
1. `ARCHITECTURE_V2.md` - Architecture complète
2. `MIGRATION_V2_GUIDE.md` - Comment migrer
3. `INTEGRATION_EXAMPLES.md` - Exemples pratiques

### Pour tester
1. `TEST_V2.md` - Guide de test
2. `server/src/modules/order/order.example.ts` - Exemples backend
3. `client/src/features/order/examples/` - Exemples frontend

### Pour avancer
1. `NEXT_STEPS_V2.md` - Prochaines étapes
2. `MIGRATION_COMPLETE.md` - État d'avancement

---

## 📊 Statistiques

- **Fichiers créés** : 20+
- **Modules backend** : 1 (Order)
- **Features frontend** : 1 (Order)
- **Guides documentation** : 12+
- **Exemples** : 10+

---

## 🎯 Fichiers clés

### Backend
- `server/src/modules/order/order.service.ts` - Service métier
- `server/src/modules/order/order.routes.ts` - Routes HTTP
- `server/src/config/feature-flags.ts` - Feature flags

### Frontend
- `client/src/features/order/hooks/use-order.ts` - Hooks React Query
- `client/src/features/order/order.api.ts` - Client API
- `client/src/app/providers/auth-provider.tsx` - Provider auth

### Configuration
- `server/routes.ts` - Intégration des routes V2
- `.env` - Feature flags (USE_ORDER_V2_ROUTES)

---

## 🔍 Recherche rapide

### "Comment activer les routes V2 ?"
→ `QUICK_START_V2.md`

### "Comment utiliser le service Order ?"
→ `USAGE_V2.md` ou `server/src/modules/order/order.example.ts`

### "Comment utiliser les hooks frontend ?"
→ `FRONTEND_V2_GUIDE.md` ou `client/src/features/order/examples/`

### "Comment migrer un domaine ?"
→ `MIGRATION_V2_GUIDE.md`

### "Comment tester ?"
→ `TEST_V2.md`

### "Quelles sont les prochaines étapes ?"
→ `NEXT_STEPS_V2.md`

---

## 📝 Notes

- Tous les fichiers V2 sont dans `server/src/` et `client/src/`
- L'ancien code reste dans `server/` et `client/src/` (racine)
- Migration progressive, pas de breaking changes
- Documentation complète pour chaque module/feature

---

**Utilisez cet index pour naviguer rapidement dans l'architecture V2 !** 🗺️
