/**
 * Middleware de validation Zod pour Express
 * 
 * Utilisation :
 * app.post("/api/orders", validate(insertOrderSchema), async (req, res) => {
 *   // req.body est maintenant typé et validé
 *   const order = await OrderCreationService.createOrder(req.body);
 *   res.json(order);
 * });
 */

import type { Request, Response, NextFunction } from "express";
import { z, type ZodSchema } from "zod";
import { errorHandler } from "../errors";

/**
 * Middleware de validation Zod
 * Valide req.body, req.query ou req.params selon le paramètre target
 * 
 * @param schema Schéma Zod à valider
 * @param target Source des données à valider ('body' | 'query' | 'params')
 * @returns Middleware Express
 */
export function validate<T extends ZodSchema>(
  schema: T,
  target: "body" | "query" | "params" = "body"
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = target === "body" ? req.body : target === "query" ? req.query : req.params;
      
      // Valider avec Zod
      const result = await schema.safeParseAsync(data);
      
      if (!result.success) {
        // Formater les erreurs Zod de manière lisible
        const errors = result.error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        const isDevelopment = process.env.NODE_ENV === "development";
        
        // Utiliser errorHandler pour la cohérence
        return errorHandler.sendError(
          res,
          errorHandler.badRequest(
            `Validation failed: ${errors[0]?.message || "Invalid data"}`
          )
        );
      }

      // Remplacer les données par les données validées (Zod peut transformer/coercer)
      if (target === "body") {
        req.body = result.data;
      } else if (target === "query") {
        req.query = result.data as any;
      } else {
        req.params = result.data as any;
      }

      next();
    } catch (error: any) {
      console.error("[VALIDATE] Erreur de validation:", error);
      errorHandler.sendError(res, errorHandler.badRequest("Validation error"));
    }
  };
}

/**
 * Helper pour valider plusieurs sources en même temps
 * 
 * @example
 * validateMultiple({
 *   body: insertOrderSchema,
 *   params: z.object({ id: z.string().uuid() })
 * })
 */
export function validateMultiple(validations: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Valider body
      if (validations.body) {
        const bodyResult = await validations.body.safeParseAsync(req.body);
        if (!bodyResult.success) {
          return errorHandler.sendError(
            res,
            errorHandler.badRequest(
              `Body validation failed: ${bodyResult.error.errors[0]?.message || "Invalid data"}`
            )
          );
        }
        req.body = bodyResult.data;
      }

      // Valider query
      if (validations.query) {
        const queryResult = await validations.query.safeParseAsync(req.query);
        if (!queryResult.success) {
          return errorHandler.sendError(
            res,
            errorHandler.badRequest(
              `Query validation failed: ${queryResult.error.errors[0]?.message || "Invalid data"}`
            )
          );
        }
        req.query = queryResult.data as any;
      }

      // Valider params
      if (validations.params) {
        const paramsResult = await validations.params.safeParseAsync(req.params);
        if (!paramsResult.success) {
          return errorHandler.sendError(
            res,
            errorHandler.badRequest(
              `Params validation failed: ${paramsResult.error.errors[0]?.message || "Invalid data"}`
            )
          );
        }
        req.params = paramsResult.data as any;
      }

      next();
    } catch (error: any) {
      console.error("[VALIDATE] Erreur de validation multiple:", error);
      errorHandler.sendError(res, errorHandler.badRequest("Validation error"));
    }
  };
}
