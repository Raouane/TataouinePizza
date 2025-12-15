import type { Response } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errorHandler = {
  badRequest: (message: string) => new AppError(400, message, "BAD_REQUEST"),
  unauthorized: (message: string = "Unauthorized") => new AppError(401, message, "UNAUTHORIZED"),
  forbidden: (message: string = "Forbidden") => new AppError(403, message, "FORBIDDEN"),
  notFound: (message: string = "Not found") => new AppError(404, message, "NOT_FOUND"),
  conflict: (message: string) => new AppError(409, message, "CONFLICT"),
  serverError: (message: string = "Server error") => new AppError(500, message, "SERVER_ERROR"),
  
  sendError: (res: Response, error: any) => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    } else {
      console.error("[ERROR]", error);
      res.status(500).json({
        error: "Internal server error",
        code: "SERVER_ERROR",
      });
    }
  },
};
