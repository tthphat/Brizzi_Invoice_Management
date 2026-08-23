import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { errorResponse } from "../lib/response.js";
import { ErrorCode, getErrorMessage } from "../lib/error-code.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Zod validation error
  if (err instanceof ZodError) {
    return errorResponse(
      res,
      400,
      ErrorCode.VALIDATION_ERROR,
      getErrorMessage(ErrorCode.VALIDATION_ERROR),
      err.issues,
    );
  }

  // Prisma unique constraint error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      // Unique constraint failed
      const field = err.meta?.target as string[];
      return errorResponse(
        res,
        409,
        ErrorCode.DUPLICATE_ERROR,
        `${field?.join(", ")} ${getErrorMessage(ErrorCode.DUPLICATE_ERROR)}`,
      );
    }

    if (err.code === "P2025") {
      // Record not found
      return errorResponse(
        res,
        404,
        ErrorCode.NOT_FOUND,
        getErrorMessage(ErrorCode.NOT_FOUND),
      );
    }
  }

  // Prisma connection error
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return errorResponse(
      res,
      503,
      ErrorCode.DATABASE_ERROR,
      getErrorMessage(ErrorCode.DATABASE_ERROR),
    );
  }

  // Default error - log for debugging
  console.error("Unhandled error:", err);

  return errorResponse(
    res,
    500,
    ErrorCode.INTERNAL_ERROR,
    getErrorMessage(ErrorCode.INTERNAL_ERROR),
  );
}
