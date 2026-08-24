import { ErrorCode } from "./error-code.js";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, ErrorCode.NOT_FOUND);
    this.name = "NotFoundError";
  }
}
