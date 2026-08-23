import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ErrorCode, getErrorMessage } from "../lib/error-code.js";
import { errorResponse } from "../lib/response.js";

export const validateCreateInvoice = (schema: z.ZodTypeAny) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return errorResponse(
        res,
        400,
        ErrorCode.VALIDATION_ERROR,
        getErrorMessage(ErrorCode.VALIDATION_ERROR),
        result.error.issues,
      );
    }

    req.body = result.data;

    next();
  };
};
