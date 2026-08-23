import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const validateCreateInvoice = (schema: z.ZodTypeAny) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues,
      });
    }

    req.body = result.data;

    next();
  };
};
