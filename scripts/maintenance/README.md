# Scripts Maintenance V2

Scripts organisés pour la maintenance et le debugging.

## Structure

```
scripts/maintenance/
├── check-data.ts      # Vérification données (à créer)
└── fix-issues.ts      # Correction problèmes (à créer)
```

## Migration depuis l'ancien système

Les scripts existants dans `script/` continuent de fonctionner.
Les nouveaux scripts V2 seront créés progressivement.

## Scripts existants (à migrer)

- `script/check-production-data.ts` → `scripts/maintenance/check-data.ts`
- `script/fix-production-restaurants.ts` → `scripts/maintenance/fix-issues.ts`
- `script/debug-restaurants.ts` → `scripts/maintenance/debug.ts`
