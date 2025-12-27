/**
 * Parse restaurant categories from various formats (string JSON, array, etc.)
 */
export function parseRestaurantCategories(categories: string | string[] | undefined): string[] {
  if (!categories) return [];
  
  if (Array.isArray(categories)) {
    return categories;
  }
  
  if (typeof categories === 'string') {
    try {
      const parsed = JSON.parse(categories);
      return Array.isArray(parsed) ? parsed : [categories];
    } catch {
      return [categories];
    }
  }
  
  return [];
}

