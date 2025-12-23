# Guide de Traduction - Tataouine Pizza

## 📋 Règle de développement

**TOUTE nouvelle fonctionnalité, écran ou composant DOIT être traduit dans toutes les langues disponibles (FR, EN, AR).**

## 🌍 Langues supportées

- **FR** : Français (langue par défaut)
- **EN** : English
- **AR** : العربية (Arabe)

## 🔧 Comment ajouter une traduction

### 1. Ajouter la clé dans `client/src/lib/i18n.tsx`

```typescript
const translations: Translations = {
  // ... traductions existantes
  
  // Votre nouvelle section
  'maSection.titre': { 
    fr: "Mon Titre", 
    en: "My Title", 
    ar: "عنواني" 
  },
  'maSection.description': { 
    fr: "Ma description", 
    en: "My description", 
    ar: "وصفي" 
  },
};
```

### 2. Utiliser la traduction dans votre composant

```typescript
import { useLanguage } from "@/lib/i18n";

export default function MonComposant() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t('maSection.titre')}</h1>
      <p>{t('maSection.description')}</p>
    </div>
  );
}
```

## 📝 Convention de nommage des clés

Utilisez une structure hiérarchique avec des points :

```
[section].[sous-section].[élément]
```

**Exemples :**
- `menu.title` → Titre de la page menu
- `cart.step.1` → Étape 1 du panier
- `success.title` → Titre de la page de succès
- `common.loading` → Texte de chargement commun

## ✅ Checklist avant commit

- [ ] Tous les textes visibles sont traduits (pas de texte hardcodé en français)
- [ ] Les 3 langues sont présentes (FR, EN, AR)
- [ ] Les clés suivent la convention de nommage
- [ ] Le composant utilise `useLanguage()` et `t()`
- [ ] Testé avec les 3 langues dans le navigateur

## 🚫 À éviter

❌ **NE PAS faire :**
```typescript
// ❌ MAUVAIS - Texte hardcodé
<h1>Mon Titre</h1>
<p>Ma description</p>
```

✅ **FAIRE :**
```typescript
// ✅ BON - Utilisation de traductions
const { t } = useLanguage();
<h1>{t('maSection.titre')}</h1>
<p>{t('maSection.description')}</p>
```

## 📚 Sections existantes dans i18n.tsx

- `nav.*` - Navigation
- `hero.*` - Section hero de la page d'accueil
- `features.*` - Caractéristiques
- `bestsellers.*` - Meilleures ventes
- `menu.*` - Page menu
- `cart.*` - Panier
- `success.*` - Page de succès
- `tracker.*` - Suivi de commande
- `history.*` - Historique des commandes
- `common.*` - Textes communs

## 🔍 Comment trouver les textes non traduits

1. Rechercher les chaînes hardcodées :
   ```bash
   grep -r "Chargement\|Restaurant\|Menu\|Ajouter" client/src/pages
   ```

2. Vérifier dans le navigateur :
   - Changer la langue dans l'interface
   - Vérifier que tous les textes changent

## 💡 Exemples de traductions

### Textes simples
```typescript
'button.save': { 
  fr: "Enregistrer", 
  en: "Save", 
  ar: "حفظ" 
}
```

### Textes avec variables
```typescript
// Dans le composant
{t('cart.items', { count: items.length })}

// Dans i18n.tsx (si besoin de formatage complexe)
// Pour l'instant, utilisez la concaténation dans le composant
```

### Messages d'erreur
```typescript
'error.required': { 
  fr: "Ce champ est requis", 
  en: "This field is required", 
  ar: "هذا الحقل مطلوب" 
}
```

## 🌐 Support RTL (Arabe)

Le système gère automatiquement le RTL pour l'arabe :
- `dir` est automatiquement défini
- Les classes CSS Tailwind s'adaptent automatiquement
- Utilisez `isRtl` si besoin de logique conditionnelle

```typescript
const { dir, language } = useLanguage();
const isRtl = language === 'ar';
```

## 📞 Besoin d'aide ?

Si vous avez des questions ou besoin d'ajouter une nouvelle section de traductions, consultez `client/src/lib/i18n.tsx` pour voir les exemples existants.

