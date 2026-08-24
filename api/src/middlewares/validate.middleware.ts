import type { Request, Response, NextFunction } from "express";
import type { ParamsDictionary, Query } from "express-serve-static-core";
import { z } from "zod";
import { ErrorCode, getErrorMessage } from "../lib/error-code.js";
import { errorResponse } from "../lib/response.js";

export const validate = (schema: z.ZodTypeAny) => {
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

export const validateParams = <T extends z.ZodType<ParamsDictionary>>(
  schema: T,
) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return errorResponse(
        res,
        400,
        ErrorCode.VALIDATION_ERROR,
        getErrorMessage(ErrorCode.VALIDATION_ERROR),
        result.error.issues,
      );
    }

    req.params = result.data;

    next();
  };
};

export const validateQuery = <T extends z.ZodTypeAny>(schema: T) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return errorResponse(
        res,
        400,
        ErrorCode.VALIDATION_ERROR,
        getErrorMessage(ErrorCode.VALIDATION_ERROR),
        result.error.issues,
      );
    }

    // Store validated query in custom property
    (req as Request & { validatedQuery: unknown }).validatedQuery = result.data;

    next();
  };
};
