export const ErrorCode = {
  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",

  // Database
  DUPLICATE_ERROR: "DUPLICATE_ERROR",
  NOT_FOUND: "NOT_FOUND",
  DATABASE_ERROR: "DATABASE_ERROR",

  // General
  INTERNAL_ERROR: "INTERNAL_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  BAD_REQUEST: "BAD_REQUEST",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ErrorMessage = {
  [ErrorCode.VALIDATION_ERROR]: "Validation failed",
  [ErrorCode.DUPLICATE_ERROR]: "Record already exists",
  [ErrorCode.NOT_FOUND]: "Record not found",
  [ErrorCode.DATABASE_ERROR]: "Database connection failed",
  [ErrorCode.INTERNAL_ERROR]: "Internal server error",
  [ErrorCode.UNAUTHORIZED]: "Unauthorized",
  [ErrorCode.FORBIDDEN]: "Forbidden",
  [ErrorCode.BAD_REQUEST]: "Bad request",
} as const;

export function getErrorMessage(code: ErrorCode): string {
  return ErrorMessage[code] ?? "Unknown error";
}
