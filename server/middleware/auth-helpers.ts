/**
 * Helpers pour simplifier les vérifications d'authentification dans les routes
 * Évite la duplication de `const driverId = req.admin?.id; if (!driverId) throw ...`
 */

import type { AuthRequest } from "../auth";
import { errorHandler } from "../errors";

/**
 * Récupère l'ID de l'admin authentifié depuis la requête
 * Lance une erreur si l'admin n'est pas authentifié
 * @param req Requête Express avec authentification admin
 * @returns ID de l'admin
 * @throws AppError si non authentifié
 */
export function getAuthenticatedAdminId(req: AuthRequest): string {
  const adminId = req.admin?.id;
  if (!adminId) {
    throw errorHandler.unauthorized("Not authenticated");
  }
  return adminId;
}

/**
 * Récupère l'ID du driver depuis la requête authentifiée
 * Utilisé pour les routes driver qui utilisent authenticateAdmin
 * @param req Requête Express avec authentification admin
 * @returns ID du driver (qui est stocké dans req.admin.id pour les drivers)
 * @throws AppError si non authentifié
 */
export function getAuthenticatedDriverId(req: AuthRequest): string {
  return getAuthenticatedAdminId(req);
}

/**
 * Récupère l'ID du restaurant depuis la requête authentifiée
 * Utilisé pour les routes restaurant qui utilisent authenticateAdmin
 * @param req Requête Express avec authentification admin
 * @returns ID du restaurant (qui est stocké dans req.admin.id pour les restaurants)
 * @throws AppError si non authentifié
 */
export function getAuthenticatedRestaurantId(req: AuthRequest): string {
  return getAuthenticatedAdminId(req);
}

/**
 * Récupère les informations complètes de l'admin authentifié
 * @param req Requête Express avec authentification admin
 * @returns Objet avec id et email de l'admin
 * @throws AppError si non authentifié
 */
export function getAuthenticatedAdmin(req: AuthRequest): { id: string; email: string } {
  const admin = req.admin;
  if (!admin || !admin.id) {
    throw errorHandler.unauthorized("Not authenticated");
  }
  return admin;
}

