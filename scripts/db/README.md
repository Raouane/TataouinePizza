# Scripts Base de Données V2

Scripts organisés pour la gestion de la base de données.

## Structure

```
scripts/db/
├── migrate.ts         # Migrations (à créer)
├── seed.ts            # Seed de données (à créer)
└── reset.ts           # Reset DB (à créer)
```

## Migration depuis l'ancien système

Les scripts existants dans `script/` continuent de fonctionner.
Les nouveaux scripts V2 seront créés progressivement.

## Scripts existants (à migrer)

- `script/migrate-db.ts` → `scripts/db/migrate.ts`
- `script/seed-data.ts` → `scripts/db/seed.ts`
- `script/clear-database.ts` → `scripts/db/reset.ts`
