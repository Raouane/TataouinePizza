/**
 * Middleware global de gestion des erreurs
 * 
 * Intercepte toutes les erreurs non gérées et les formate de manière cohérente
 * Utilise errorHandler pour garantir une réponse uniforme
 */

import type { Request, Response, NextFunction } from "express";
import { errorHandler, AppError } from "../errors";

/**
 * Middleware global de gestion des erreurs
 * Doit être enregistré APRÈS toutes les routes
 * 
 * @example
 * app.use(errorMiddleware);
 */
export function errorMiddleware(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Si la réponse a déjà été envoyée, ne rien faire
  if (res.headersSent) {
    return;
  }

  // Si c'est une AppError (erreur gérée), utiliser errorHandler
  if (err instanceof AppError) {
    return errorHandler.sendError(res, err);
  }

  // Si c'est une erreur Zod (validation), formater proprement
  if (err.name === "ZodError") {
    const zodError = err as any;
    const errors = zodError.errors?.map((e: any) => ({
      path: e.path?.join(".") || "unknown",
      message: e.message || "Validation error",
    })) || [];

    return errorHandler.sendError(
      res,
      errorHandler.badRequest(
        `Validation failed: ${errors[0]?.message || "Invalid data"}`
      )
    );
  }

  // Erreur non gérée - logger en développement
  if (process.env.NODE_ENV !== "production") {
    console.error("[ERROR] Erreur non gérée:", {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      path: req.path,
      method: req.method,
    });
  }

  // En production, ne pas exposer les détails
  const isDevelopment = process.env.NODE_ENV === "development";
  
  return errorHandler.sendError(
    res,
    errorHandler.serverError(
      isDevelopment ? err?.message || "Internal server error" : "Internal server error"
    )
  );
}

/**
 * Wrapper pour les routes async qui gère automatiquement les erreurs
 * 
 * @example
 * app.get("/api/orders", asyncHandler(async (req, res) => {
 *   const orders = await storage.getAllOrders();
 *   res.json(orders);
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      next(error); // Passe l'erreur au middleware d'erreur global
    });
  };
}
