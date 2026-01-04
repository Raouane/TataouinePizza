/**
 * Utilitaires partagés pour les routes publiques
 */

import { z } from "zod";

/**
 * Valide des données avec un schéma Zod
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: any
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Échappe les caractères HTML pour prévenir les XSS
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
