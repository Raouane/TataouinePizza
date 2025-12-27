import { useLanguage } from "@/lib/i18n";

/**
 * Get translated category label
 * Pure function that can be used outside React components
 */
export function getCategoryLabel(category: string, t: (key: string) => string): string {
  const labels: Record<string, string> = {
    pizza: t('menu.category.pizza'),
    burger: t('menu.category.burger'),
    salade: t('menu.category.salade'),
    grill: t('menu.category.grill'),
    drink: t('menu.category.drink'),
    dessert: t('menu.category.dessert'),
  };
  return labels[category] || category;
}

