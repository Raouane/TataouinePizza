/**
 * Schémas Zod spécialisés pour la validation métier
 * 
 * Ces schémas sont optimisés pour le contexte tunisien (Tataouine Pizza)
 * et peuvent être réutilisés dans toutes les routes
 */

import { z } from "zod";

/**
 * Schéma de validation pour les numéros de téléphone tunisiens
 * 
 * Format accepté :
 * - 8 chiffres (sans indicatif)
 * - Commence par 20-29, 40-49, 50-59, 70-79, ou 90-99
 * - Exemples valides :
 *   - Mobile : "21678876" (21), "21234567" (21), "41234567" (41), "51234567" (51), "91234567" (91)
 *   - Fixe : "70234567" (70), "71234567" (71), "79234567" (79)
 * 
 * Format avec indicatif :
 * - +216 suivi de 8 chiffres (ex: "+21621678876" → "21678876")
 * - 00216 suivi de 8 chiffres (ex: "0021621678876" → "21678876")
 * - 216 suivi de 8 chiffres (ex: "21621678876" → "21678876")
 * 
 * Le schéma normalise automatiquement le format (supprime les espaces, tirets, etc.)
 * IMPORTANT: Ne supprime pas "216" s'il fait partie d'un numéro de 8 chiffres (ex: "21678876")
 */
export const phoneSchema = z
  .string()
  .min(8, "Le numéro de téléphone doit contenir au moins 8 chiffres")
  .max(15, "Le numéro de téléphone est trop long")
  .transform((val) => {
    // Normaliser : supprimer espaces, tirets, points
    let cleaned = val.replace(/[\s\-\.\(\)]/g, "");
    
    // Supprimer les préfixes internationaux tunisiens uniquement
    // IMPORTANT: Ne supprimer "216" que s'il est précédé de "+" ou "00" (format international)
    // OU si le numéro total fait plus de 8 chiffres (indique un préfixe)
    // Ne PAS supprimer "216" s'il fait partie d'un numéro de 8 chiffres (ex: "21678876")
    if (cleaned.startsWith("+216")) {
      // Format: +216XXXXXXXX (11 chiffres au total)
      cleaned = cleaned.substring(4);
    } else if (cleaned.startsWith("00216")) {
      // Format: 00216XXXXXXXX (13 chiffres au total)
      cleaned = cleaned.substring(5);
    } else if (cleaned.startsWith("216") && cleaned.length > 8) {
      // Format: 216XXXXXXXX (11+ chiffres) - "216" est un préfixe
      cleaned = cleaned.substring(3);
    }
    // Si le numéro fait exactement 8 chiffres (ex: "21678876"), on le garde tel quel
    // La validation suivante vérifiera s'il commence par 2, 4, 5 ou 9
    
    // Si le numéro commence par un préfixe international non tunisien (ex: +33, +1, etc.)
    // on le supprime aussi pour permettre la validation
    if (cleaned.match(/^\+\d{1,3}/)) {
      // Supprimer le préfixe international (ex: +33, +1, +44, etc.)
      cleaned = cleaned.replace(/^\+\d{1,3}/, "");
    }
    
    return cleaned;
  })
  .refine(
    (val) => {
      // Vérifier que c'est un numéro tunisien valide
      // Format: 8 chiffres commençant par:
      // - 2X (20-29) : Mobile Ooredoo/Orange
      // - 4X (40-49) : Mobile Lycamobile/MVNO
      // - 5X (50-59) : Mobile Orange
      // - 7X (70-79) : Fixe (régions) - inclut 70 pour IP/entreprises
      // - 9X (90-99) : Mobile Tunisie Telecom
      return /^(2[0-9]|4[0-9]|5[0-9]|7[0-9]|9[0-9])\d{6}$/.test(val);
    },
    {
      message: "Le numéro de téléphone doit être tunisien : commencer par 20-29, 40-49, 50-59, 70-79 ou 90-99 et contenir 8 chiffres. Exemples : 21678876, 21234567, 51234567, 70234567, 91234567",
    }
  );

/**
 * Schéma de validation pour les coordonnées GPS (latitude)
 * 
 * Valide que la latitude est dans une zone réaliste pour la Tunisie
 * Tunisie : environ 30°N à 37°N
 * 
 * Pour Tataouine spécifiquement : ~32.9°N
 * 
 * ⚠️ NOTE: La validation géographique stricte est actuellement DÉSACTIVÉE dans insertOrderSchema
 * pour permettre les commandes de partout. Réactiver dans shared/schema.ts quand nécessaire.
 */
export const latitudeSchema = z
  .number()
  .min(30.0, "La latitude doit être supérieure à 30° (zone Tunisie)")
  .max(37.5, "La latitude doit être inférieure à 37.5° (zone Tunisie)")
  .refine(
    (val) => !isNaN(val) && isFinite(val),
    {
      message: "La latitude doit être un nombre valide",
    }
  );

/**
 * Schéma de validation pour les coordonnées GPS (longitude)
 * 
 * Valide que la longitude est dans une zone réaliste pour la Tunisie
 * Tunisie : environ 7°E à 12°E
 * 
 * Pour Tataouine spécifiquement : ~10.4°E
 * 
 * ⚠️ NOTE: La validation géographique stricte est actuellement DÉSACTIVÉE dans insertOrderSchema
 * pour permettre les commandes de partout. Réactiver dans shared/schema.ts quand nécessaire.
 */
export const longitudeSchema = z
  .number()
  .min(7.0, "La longitude doit être supérieure à 7°E (zone Tunisie)")
  .max(12.0, "La longitude doit être inférieure à 12°E (zone Tunisie)")
  .refine(
    (val) => !isNaN(val) && isFinite(val),
    {
      message: "La longitude doit être un nombre valide",
    }
  );

/**
 * Schéma de validation pour une localisation GPS complète
 * 
 * Valide à la fois la latitude et la longitude
 * Optionnel (pour les commandes sans GPS)
 */
export const locationSchema = z
  .object({
    lat: latitudeSchema,
    lng: longitudeSchema,
  })
  .optional()
  .nullable();

/**
 * Schéma de validation pour les coordonnées GPS dans le format des commandes
 * (customerLat, customerLng)
 * 
 * Accepte les formats :
 * - { customerLat: number, customerLng: number }
 * - { customerLat: null, customerLng: null } (optionnel)
 */
export const orderLocationSchema = z
  .object({
    customerLat: z.number().pipe(latitudeSchema).optional().nullable(),
    customerLng: z.number().pipe(longitudeSchema).optional().nullable(),
  })
  .refine(
    (data) => {
      // Si l'un est fourni, l'autre doit l'être aussi
      const hasLat = data.customerLat !== null && data.customerLat !== undefined;
      const hasLng = data.customerLng !== null && data.customerLng !== undefined;
      
      if (hasLat && !hasLng) {
        return false;
      }
      if (hasLng && !hasLat) {
        return false;
      }
      
      return true;
    },
    {
      message: "Les coordonnées GPS doivent être fournies ensemble (lat et lng) ou pas du tout",
      path: ["customerLat"], // Erreur sur customerLat
    }
  );

/**
 * Schéma de validation pour les montants en TND (Dinar tunisien)
 * 
 * Valide que le montant est positif et dans une plage réaliste
 */
export const amountSchema = z
  .number()
  .positive("Le montant doit être positif")
  .max(10000, "Le montant ne peut pas dépasser 10 000 TND")
  .refine(
    (val) => {
      // Arrondir à 2 décimales pour éviter les problèmes de précision
      const rounded = Math.round(val * 100) / 100;
      return rounded === val;
    },
    {
      message: "Le montant ne peut avoir que 2 décimales maximum",
    }
  );

/**
 * Schéma de validation pour les adresses tunisiennes
 * 
 * Valide le format de base d'une adresse
 */
export const addressSchema = z
  .string()
  .min(5, "L'adresse doit contenir au moins 5 caractères")
  .max(200, "L'adresse ne peut pas dépasser 200 caractères")
  .refine(
    (val) => {
      // Vérifier qu'il n'y a pas que des espaces
      return val.trim().length >= 5;
    },
    {
      message: "L'adresse ne peut pas être vide ou contenir uniquement des espaces",
    }
  );

/**
 * Schéma de validation pour les noms (clients, livreurs, restaurants)
 * 
 * Valide le format d'un nom (prénom ou nom complet)
 */
export const nameSchema = z
  .string()
  .min(2, "Le nom doit contenir au moins 2 caractères")
  .max(100, "Le nom ne peut pas dépasser 100 caractères")
  .regex(
    /^[a-zA-ZÀ-ÿ\s\-'\.]+$/u,
    "Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes"
  )
  .transform((val) => val.trim());

/**
 * Helper pour créer un schéma de validation de téléphone avec message personnalisé
 */
export function createPhoneSchema(customMessage?: string) {
  return phoneSchema.refine(
    (val) => /^(2[0-9]|4[0-9]|5[0-9]|7[0-9]|9[0-9])\d{6}$/.test(val),
    {
      message: customMessage || "Le numéro de téléphone tunisien doit commencer par 20-29, 40-49, 50-59, 70-79 ou 90-99 et contenir 8 chiffres",
    }
  );
}

/**
 * Helper pour créer un schéma de validation de localisation avec zone personnalisée
 * 
 * @param centerLat Latitude du centre de la zone
 * @param centerLng Longitude du centre de la zone
 * @param radiusKm Rayon en kilomètres (par défaut 50km)
 */
export function createLocationSchema(
  centerLat: number = 32.9297, // Tataouine
  centerLng: number = 10.4511, // Tataouine
  radiusKm: number = 50
) {
  return z
    .object({
      lat: latitudeSchema,
      lng: longitudeSchema,
    })
    .refine(
      (data) => {
        // Calculer la distance en kilomètres (formule de Haversine simplifiée)
        const R = 6371; // Rayon de la Terre en km
        const dLat = ((data.lat - centerLat) * Math.PI) / 180;
        const dLng = ((data.lng - centerLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((centerLat * Math.PI) / 180) *
            Math.cos((data.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        return distance <= radiusKm;
      },
      {
        message: `La localisation doit être dans un rayon de ${radiusKm}km autour de Tataouine`,
      }
    );
}
