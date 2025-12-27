/**
 * Helpers pour l'admin dashboard
 * Fonctions pures, testables, réutilisables
 */

/**
 * Parse restaurant categories from various formats
 */
export function parseRestaurantCategories(categories: unknown): string[] {
  if (!categories) return [];
  if (Array.isArray(categories)) return categories;
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

/**
 * Parse opening hours from string format
 * Format: "HH:mm-HH:mm|closedDay" ou "HH:mm-HH:mm"
 */
export function parseOpeningHours(openingHours: string | null | undefined): {
  open: string;
  close: string;
  closedDay: string | null;
} {
  if (!openingHours || openingHours.trim() === "") {
    return { open: "", close: "", closedDay: null };
  }

  const parts = openingHours.split("|");
  const hoursPart = parts[0] || "";
  const closedDay = parts[1] || null;

  const [open, close] = hoursPart.split("-");
  
  return {
    open: open?.trim() || "",
    close: close?.trim() || "",
    closedDay: closedDay?.trim() || null,
  };
}

/**
 * Format opening hours for API
 * Format: "HH:mm-HH:mm|closedDay" ou "HH:mm-HH:mm"
 */
export function formatOpeningHours(
  open: string,
  close: string,
  closedDay: string | null
): string {
  if (!open || !close) return "";
  
  const hours = `${open}-${close}`;
  if (closedDay && closedDay !== "none") {
    return `${hours}|${closedDay}`;
  }
  return hours;
}

/**
 * Clean opening hours string (remove invalid formats)
 */
export function cleanOpeningHours(openingHours: string): string {
  if (!openingHours || openingHours.trim() === "") return "";
  
  const hoursPart = openingHours.split("|")[0] || "";
  const [openTime, closeTime] = hoursPart.split("-");
  
  if (!openTime || !closeTime || openTime.trim() === "" || closeTime.trim() === "") {
    return "";
  }
  
  return openingHours;
}

/**
 * Logger conditionnel (dev only)
 */
const isDev = import.meta.env.DEV;

export function adminLog(message: string, ...args: any[]): void {
  if (isDev) {
    console.log(`[ADMIN] ${message}`, ...args);
  }
}

export function adminError(message: string, ...args: any[]): void {
  if (isDev) {
    console.error(`[ADMIN] ${message}`, ...args);
  }
}

